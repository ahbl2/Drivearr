const path = require('path');
const fs = require('fs');
const glob = require('glob');
const databaseService = require('./databaseService');
const crypto = require('crypto');
const chokidar = require('chokidar');
const { io } = require('../index');

function parseMediaFilename(filename) {
  const tvRegex = /(.*?)[. _-]+S(\d{2})E(\d{2})/i;
  const movieRegex = /(.*?)[. _-]+(?:\d{4})/;

  const tvMatch = filename.match(tvRegex);
  if (tvMatch) {
    return {
      type: 'episode',
      title: tvMatch[1].replace(/[._-]/g, ' ').trim(),
      season: parseInt(tvMatch[2]),
      episode: parseInt(tvMatch[3])
    };
  }

  const movieMatch = filename.match(movieRegex);
  if (movieMatch) {
    return {
      type: 'movie',
      title: movieMatch[1].replace(/[._-]/g, ' ').trim()
    };
  }

  return null;
}

function scanDrive(rootPath) {
  return new Promise((resolve) => {
    const supportedExtensions = ['.mp4', '.mkv', '.avi'];
    const files = glob.sync(`${rootPath}/**/*.*`, { nodir: true });
    const media = [];

    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (!supportedExtensions.includes(ext)) return;

      const filename = path.basename(file);
      const parsed = parseMediaFilename(filename);

      if (parsed) {
        parsed.path = file;
        media.push(parsed);
      }
    });

    resolve(media);
  });
}

async function scanAndIndexMediaFolders(folders) {
  await databaseService.initialize();
  const supportedExtensions = ['.mp4', '.mkv', '.avi'];
  let indexed = [];
  let allFoundPaths = new Set();
  for (const folder of folders) {
    const files = glob.sync(`${folder}/**/*.*`, { nodir: true });
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!supportedExtensions.includes(ext)) continue;
      const filename = path.basename(file);
      const parsed = parseMediaFilename(filename);
      if (parsed) {
        const stats = fs.statSync(file);
        // Simple hash: size + mtime
        const hash = crypto.createHash('md5').update(stats.size + '-' + stats.mtimeMs).digest('hex');
        const item = {
          path: file,
          type: parsed.type,
          title: parsed.title,
          season: parsed.season || null,
          episode: parsed.episode || null,
          size: stats.size,
          mtime: Math.floor(stats.mtimeMs),
          hash
        };
        await databaseService.upsertLocalMedia(item);
        indexed.push(item);
        allFoundPaths.add(file);
      }
    }
  }
  // Remove deleted files from index
  const allIndexed = await databaseService.getLocalMediaAll();
  for (const entry of allIndexed) {
    if (!allFoundPaths.has(entry.path) && fs.existsSync(entry.path) === false) {
      await databaseService.removeLocalMediaByPath(entry.path);
    }
  }
  return indexed;
}

let watcher = null;

async function startWatchingMediaFolders(folders) {
  await databaseService.initialize();
  if (watcher) {
    watcher.close();
  }
  watcher = chokidar.watch(folders, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    depth: 99
  });
  const supportedExtensions = ['.mp4', '.mkv', '.avi'];

  watcher
    .on('add', async (file) => {
      const ext = path.extname(file).toLowerCase();
      if (!supportedExtensions.includes(ext)) return;
      const filename = path.basename(file);
      const parsed = parseMediaFilename(filename);
      if (parsed) {
        const stats = fs.statSync(file);
        const hash = crypto.createHash('md5').update(stats.size + '-' + stats.mtimeMs).digest('hex');
        const item = {
          path: file,
          type: parsed.type,
          title: parsed.title,
          season: parsed.season || null,
          episode: parsed.episode || null,
          size: stats.size,
          mtime: Math.floor(stats.mtimeMs),
          hash
        };
        await databaseService.upsertLocalMedia(item);
        console.log(`[watcher] Added: ${file}`);
        if (io) io.emit('drive-updated', { event: 'add', file: item });
      }
    })
    .on('change', async (file) => {
      const ext = path.extname(file).toLowerCase();
      if (!supportedExtensions.includes(ext)) return;
      const filename = path.basename(file);
      const parsed = parseMediaFilename(filename);
      if (parsed) {
        const stats = fs.statSync(file);
        const hash = crypto.createHash('md5').update(stats.size + '-' + stats.mtimeMs).digest('hex');
        const item = {
          path: file,
          type: parsed.type,
          title: parsed.title,
          season: parsed.season || null,
          episode: parsed.episode || null,
          size: stats.size,
          mtime: Math.floor(stats.mtimeMs),
          hash
        };
        await databaseService.upsertLocalMedia(item);
        console.log(`[watcher] Changed: ${file}`);
        if (io) io.emit('drive-updated', { event: 'change', file: item });
      }
    })
    .on('unlink', async (file) => {
      await databaseService.removeLocalMediaByPath(file);
      console.log(`[watcher] Removed: ${file}`);
      if (io) io.emit('drive-updated', { event: 'unlink', file });
    });
  console.log('[watcher] Watching media folders for real-time changes:', folders);
}

// Helper to check if a path is a directory
function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// Helper to get all files recursively in a directory
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      results.push(filePath);
    }
  }
  return results;
}

// Parse movie folder/file name: "Title (Year)"
function parseMovieName(name) {
  const match = name.match(/(.+?) \((\d{4})\)/);
  if (match) {
    return { title: match[1].trim(), year: parseInt(match[2], 10) };
  }
  return { title: name, year: undefined };
}

// Parse TV episode file name: "Show Name S01E02"
function parseEpisodeName(name) {
  const match = name.match(/(.+?) S(\d{2})E(\d{2})/i);
  if (match) {
    return {
      title: match[1].trim(),
      season: parseInt(match[2], 10),
      episode: parseInt(match[3], 10)
    };
  }
  return null;
}

function scanDrive(drivePath) {
  const moviesDir = path.join(drivePath, 'Movies');
  const tvDir = path.join(drivePath, 'TV');
  const index = { movies: [], tvShows: [] };

  // Scan Movies
  if (isDirectory(moviesDir)) {
    const movieFolders = fs.readdirSync(moviesDir).filter(f => isDirectory(path.join(moviesDir, f)));
    for (const folder of movieFolders) {
      const folderPath = path.join(moviesDir, folder);
      const { title, year } = parseMovieName(folder);
      const files = fs.readdirSync(folderPath).filter(f => !isDirectory(path.join(folderPath, f)));
      const movieFile = files.find(f => /\.(mkv|mp4|avi)$/i.test(f));
      if (movieFile) {
        const filePath = path.join(folderPath, movieFile);
        const stat = fs.statSync(filePath);
        index.movies.push({
          title,
          year,
          filePath,
          size: stat.size
        });
      }
    }
  }

  // Scan TV Shows
  if (isDirectory(tvDir)) {
    const showFolders = fs.readdirSync(tvDir).filter(f => isDirectory(path.join(tvDir, f)));
    for (const showFolder of showFolders) {
      const showPath = path.join(tvDir, showFolder);
      const show = { title: showFolder, seasons: [] };
      const seasonFolders = fs.readdirSync(showPath).filter(f => isDirectory(path.join(showPath, f)));
      for (const seasonFolder of seasonFolders) {
        const seasonPath = path.join(showPath, seasonFolder);
        const seasonMatch = seasonFolder.match(/Season (\d+)/i);
        const seasonNumber = seasonMatch ? parseInt(seasonMatch[1], 10) : undefined;
        const episodes = [];
        const files = fs.readdirSync(seasonPath).filter(f => !isDirectory(path.join(seasonPath, f)));
        for (const file of files) {
          const ep = parseEpisodeName(file);
          if (ep) {
            const filePath = path.join(seasonPath, file);
            const stat = fs.statSync(filePath);
            episodes.push({
              episodeNumber: ep.episode,
              title: ep.title,
              filePath,
              size: stat.size
            });
          }
        }
        if (seasonNumber && episodes.length > 0) {
          show.seasons.push({ seasonNumber, episodes });
        }
      }
      if (show.seasons.length > 0) {
        index.tvShows.push(show);
      }
    }
  }

  return index;
}

// Compare drive index to local library index
function compareDriveToLibrary(driveIndex, libraryIndex) {
  const result = { movies: [], tvShows: [] };

  // Movies
  for (const libMovie of libraryIndex.movies) {
    const found = driveIndex.movies.find(
      m => m.title.toLowerCase() === libMovie.title.toLowerCase() &&
           (!libMovie.year || m.year === libMovie.year)
    );
    result.movies.push({
      title: libMovie.title,
      year: libMovie.year,
      status: found ? 'complete' : 'missing'
    });
  }

  // TV Shows
  for (const libShow of libraryIndex.tvShows) {
    const driveShow = driveIndex.tvShows.find(
      s => s.title.toLowerCase() === libShow.title.toLowerCase()
    );
    if (!driveShow) {
      result.tvShows.push({
        title: libShow.title,
        status: 'missing',
        missingSeasons: libShow.seasons.map(season => season.seasonNumber),
        missingEpisodes: libShow.seasons.map(season => ({
          season: season.seasonNumber,
          episodes: season.episodes.map(ep => ep.episodeNumber)
        }))
      });
      continue;
    }
    // Compare seasons/episodes
    let allPresent = true;
    let missingSeasons = [];
    let missingEpisodes = [];
    for (const libSeason of libShow.seasons) {
      const driveSeason = driveShow.seasons.find(s => s.seasonNumber === libSeason.seasonNumber);
      if (!driveSeason) {
        allPresent = false;
        missingSeasons.push(libSeason.seasonNumber);
        missingEpisodes.push({
          season: libSeason.seasonNumber,
          episodes: libSeason.episodes.map(ep => ep.episodeNumber)
        });
        continue;
      }
      // Check for missing episodes
      const driveEpNums = driveSeason.episodes.map(ep => ep.episodeNumber);
      const missingEps = libSeason.episodes
        .map(ep => ep.episodeNumber)
        .filter(epNum => !driveEpNums.includes(epNum));
      if (missingEps.length > 0) {
        allPresent = false;
        missingEpisodes.push({ season: libSeason.seasonNumber, episodes: missingEps });
      }
    }
    result.tvShows.push({
      title: libShow.title,
      status: allPresent ? 'complete' : 'partial',
      missingSeasons: missingSeasons.length > 0 ? missingSeasons : undefined,
      missingEpisodes: missingEpisodes.length > 0 ? missingEpisodes : undefined
    });
  }

  return result;
}

module.exports = {
  scanDrive,
  scanAndIndexMediaFolders,
  startWatchingMediaFolders,
  compareDriveToLibrary
};
