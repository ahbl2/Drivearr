const express = require('express')
const router = express.Router()
const { loadConfig, saveConfig } = require('../config/configManager')
const { scanAndIndexMediaFolders, startWatchingMediaFolders } = require('../services/driveScanner')
const tmdbService = require('../services/tmdbService')
const databaseService = require('../services/databaseService')
const stringSimilarity = require('string-similarity')
const path = require('path')

router.get('/', async (req, res) => {
  const config = await loadConfig()
  res.json(config || {})
})

router.post('/', async (req, res) => {
  const newConfig = req.body;
  const currentConfig = await loadConfig() || {};
  const mergedConfig = { ...currentConfig, ...newConfig };
  await saveConfig(mergedConfig);
  res.json({ success: true });
})

// Set sync drive path
router.post('/sync-drive', async (req, res) => {
  const { path } = req.body;
  if (!path) return res.status(400).json({ error: 'Missing drive path.' });
  const config = await loadConfig() || {};
  config.SYNC_DRIVE_PATH = path;
  await saveConfig(config);
  res.json({ success: true, SYNC_DRIVE_PATH: config.SYNC_DRIVE_PATH });
})

const triggerAutoScan = async () => {
  const config = await loadConfig();
  const tvFolders = Array.isArray(config.TV_SHOW_FOLDERS) ? config.TV_SHOW_FOLDERS : [];
  const movieFolders = Array.isArray(config.MOVIE_FOLDERS) ? config.MOVIE_FOLDERS : [];
  const allFolders = [...tvFolders, ...movieFolders];
  if (allFolders.length > 0) {
    await startWatchingMediaFolders(allFolders);
    return await scanAndIndexMediaFolders(allFolders);
  }
  return [];
};

// Add a TV show folder
router.post('/add-tv-folder', async (req, res) => {
  const { folder } = req.body;
  if (!folder) return res.status(400).json({ error: 'Missing folder path.' });
  const config = await loadConfig() || {};
  config.TV_SHOW_FOLDERS = Array.isArray(config.TV_SHOW_FOLDERS) ? config.TV_SHOW_FOLDERS : [];
  if (!config.TV_SHOW_FOLDERS.includes(folder)) {
    config.TV_SHOW_FOLDERS.push(folder);
    await saveConfig(config);
  }
  const indexed = await triggerAutoScan();
  res.json({ success: true, TV_SHOW_FOLDERS: config.TV_SHOW_FOLDERS, indexedCount: indexed.length });
})

// Remove a TV show folder
router.post('/remove-tv-folder', async (req, res) => {
  const { folder } = req.body;
  if (!folder) return res.status(400).json({ error: 'Missing folder path.' });
  const config = await loadConfig() || {};
  config.TV_SHOW_FOLDERS = Array.isArray(config.TV_SHOW_FOLDERS) ? config.TV_SHOW_FOLDERS : [];
  config.TV_SHOW_FOLDERS = config.TV_SHOW_FOLDERS.filter(f => f !== folder);
  await saveConfig(config);
  const indexed = await triggerAutoScan();
  res.json({ success: true, TV_SHOW_FOLDERS: config.TV_SHOW_FOLDERS, indexedCount: indexed.length });
})

// Add a movie folder
router.post('/add-movie-folder', async (req, res) => {
  const { folder } = req.body;
  if (!folder) return res.status(400).json({ error: 'Missing folder path.' });
  const config = await loadConfig() || {};
  config.MOVIE_FOLDERS = Array.isArray(config.MOVIE_FOLDERS) ? config.MOVIE_FOLDERS : [];
  if (!config.MOVIE_FOLDERS.includes(folder)) {
    config.MOVIE_FOLDERS.push(folder);
    await saveConfig(config);
  }
  const indexed = await triggerAutoScan();
  res.json({ success: true, MOVIE_FOLDERS: config.MOVIE_FOLDERS, indexedCount: indexed.length });
})

// Remove a movie folder
router.post('/remove-movie-folder', async (req, res) => {
  const { folder } = req.body;
  if (!folder) return res.status(400).json({ error: 'Missing folder path.' });
  const config = await loadConfig() || {};
  config.MOVIE_FOLDERS = Array.isArray(config.MOVIE_FOLDERS) ? config.MOVIE_FOLDERS : [];
  config.MOVIE_FOLDERS = config.MOVIE_FOLDERS.filter(f => f !== folder);
  await saveConfig(config);
  const indexed = await triggerAutoScan();
  res.json({ success: true, MOVIE_FOLDERS: config.MOVIE_FOLDERS, indexedCount: indexed.length });
})

// Scan all configured TV and Movie folders and index media
router.post('/scan-local-media', async (req, res) => {
  try {
    const config = await loadConfig();
    const tvFolders = Array.isArray(config.TV_SHOW_FOLDERS) ? config.TV_SHOW_FOLDERS : [];
    const movieFolders = Array.isArray(config.MOVIE_FOLDERS) ? config.MOVIE_FOLDERS : [];
    const allFolders = [...tvFolders, ...movieFolders];
    if (allFolders.length === 0) return res.status(400).json({ error: 'No media folders configured.' });
    const indexed = await scanAndIndexMediaFolders(allFolders);
    res.json({ indexed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to scan and index media.' });
  }
});

// Fetch and store TMDb metadata for all indexed files
router.post('/fetch-metadata', async (req, res) => {
  try {
    await databaseService.initialize();
    const allFiles = await databaseService.getLocalMediaAll();
    let updated = 0, failed = 0, results = [];
    for (const file of allFiles) {
      let meta = null;
      try {
        if (file.type === 'movie') {
          // Try to extract year from filename or parent folder
          let year = null;
          const yearMatch = file.title.match(/(19|20)\d{2}/);
          if (yearMatch) year = yearMatch[0];
          else {
            const parent = path.basename(path.dirname(file.path));
            const parentYear = parent.match(/(19|20)\d{2}/);
            if (parentYear) year = parentYear[0];
          }
          const matches = await tmdbService.searchMovie(file.title.replace(/(19|20)\d{2}/, '').trim(), year);
          if (matches && matches.length > 0) {
            // Fuzzy match on title
            const titles = matches.map(m => m.title);
            const best = stringSimilarity.findBestMatch(file.title, titles);
            const idx = best.bestMatchIndex;
            meta = await tmdbService.getMovieDetails(matches[idx].id);
          }
        } else if (file.type === 'episode') {
          // Use parent folder as show title if needed
          let showTitle = file.title;
          const parent = path.basename(path.dirname(file.path));
          if (parent && parent.length > 2 && parent.toLowerCase() !== file.title.toLowerCase()) {
            showTitle = parent;
          }
          const showMatches = await tmdbService.searchTV(showTitle);
          if (showMatches && showMatches.length > 0) {
            // Fuzzy match on show name
            const names = showMatches.map(s => s.name);
            const best = stringSimilarity.findBestMatch(showTitle, names);
            const idx = best.bestMatchIndex;
            const show = showMatches[idx];
            const episodeMeta = await tmdbService.getEpisodeDetails(show.id, file.season, file.episode);
            meta = { ...episodeMeta, show_tmdb_id: show.id, show_name: show.name, show_poster_path: show.poster_path };
          }
        }
        if (meta) {
          await databaseService.upsertLocalMedia({ ...file, metadata: JSON.stringify(meta) });
          updated++;
          results.push({ path: file.path, matched: true });
        } else {
          failed++;
          results.push({ path: file.path, matched: false });
        }
      } catch (err) {
        failed++;
        results.push({ path: file.path, matched: false, error: err.message });
      }
    }
    res.json({ updated, failed, results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch and store metadata.' });
  }
});

// Get all local media index entries (with metadata)
router.get('/local-media-index', async (req, res) => {
  try {
    await databaseService.initialize();
    const allFiles = await databaseService.getLocalMediaAll();
    res.json({ items: allFiles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch local media index.' });
  }
});

// Manual match: set metadata for a file by path and TMDb ID
router.post('/manual-match', async (req, res) => {
  try {
    const { path: filePath, type, tmdbId } = req.body;
    if (!filePath || !type || !tmdbId) return res.status(400).json({ error: 'Missing required fields.' });
    let meta = null;
    if (type === 'movie') {
      meta = await tmdbService.getMovieDetails(tmdbId);
    } else if (type === 'episode' || type === 'tv') {
      meta = await tmdbService.getTVDetails(tmdbId);
    }
    if (meta) {
      const allFiles = await databaseService.getLocalMediaAll();
      const file = allFiles.find(f => f.path === filePath);
      if (file) {
        await databaseService.upsertLocalMedia({ ...file, metadata: JSON.stringify(meta) });
        return res.json({ success: true });
      }
    }
    res.status(404).json({ error: 'File not found or metadata fetch failed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set manual match.' });
  }
});

module.exports = router
