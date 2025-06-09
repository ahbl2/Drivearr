const express = require('express')
const router = express.Router()
const { loadConfig, saveConfig } = require('../config/configManager')

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
  res.json({ success: true, TV_SHOW_FOLDERS: config.TV_SHOW_FOLDERS });
})

// Remove a TV show folder
router.post('/remove-tv-folder', async (req, res) => {
  const { folder } = req.body;
  if (!folder) return res.status(400).json({ error: 'Missing folder path.' });
  const config = await loadConfig() || {};
  config.TV_SHOW_FOLDERS = Array.isArray(config.TV_SHOW_FOLDERS) ? config.TV_SHOW_FOLDERS : [];
  config.TV_SHOW_FOLDERS = config.TV_SHOW_FOLDERS.filter(f => f !== folder);
  await saveConfig(config);
  res.json({ success: true, TV_SHOW_FOLDERS: config.TV_SHOW_FOLDERS });
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
  res.json({ success: true, MOVIE_FOLDERS: config.MOVIE_FOLDERS });
})

// Remove a movie folder
router.post('/remove-movie-folder', async (req, res) => {
  const { folder } = req.body;
  if (!folder) return res.status(400).json({ error: 'Missing folder path.' });
  const config = await loadConfig() || {};
  config.MOVIE_FOLDERS = Array.isArray(config.MOVIE_FOLDERS) ? config.MOVIE_FOLDERS : [];
  config.MOVIE_FOLDERS = config.MOVIE_FOLDERS.filter(f => f !== folder);
  await saveConfig(config);
  res.json({ success: true, MOVIE_FOLDERS: config.MOVIE_FOLDERS });
})

module.exports = router
