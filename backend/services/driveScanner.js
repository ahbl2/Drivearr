const path = require('path');
const fs = require('fs');
const glob = require('glob');
const databaseService = require('./databaseService');
const crypto = require('crypto');
const chokidar = require('chokidar');

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
      }
    })
    .on('unlink', async (file) => {
      await databaseService.removeLocalMediaByPath(file);
      console.log(`[watcher] Removed: ${file}`);
    });
  console.log('[watcher] Watching media folders for real-time changes:', folders);
}

module.exports = {
  scanDrive,
  scanAndIndexMediaFolders,
  startWatchingMediaFolders
};
