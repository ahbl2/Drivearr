const express = require('express');
const router = express.Router();
const path = require('path');
const { scanDrive, compareDriveToLibrary } = require('../services/driveScanner');
// Assume getLocalLibraryIndex is available from your media index service
const databaseService = require('../services/databaseService');
const os = require('os');
const fs = require('fs');
const disk = require('diskusage');

// Example: get the sync drive path from config or env
const getSyncDrivePath = () => {
  // Replace with your actual logic to get the current sync drive path
  return process.env.USB_MOUNT_ROOT || '/usbdrives/FriendsDrive';
};

// Stub: get local library index (replace with real implementation)
async function getLocalLibraryIndex() {
  // Should return { movies: [...], tvShows: [...] } in the same structure as scanDrive
  // For now, fetch from your databaseService or local index
  const movies = await databaseService.getLocalMediaByType('movie');
  const tvEpisodes = await databaseService.getLocalMediaByType('episode');
  // Group TV episodes by show/season
  const tvShowsMap = {};
  for (const ep of tvEpisodes) {
    const showKey = ep.title;
    if (!tvShowsMap[showKey]) tvShowsMap[showKey] = { title: ep.title, seasons: [] };
    let season = tvShowsMap[showKey].seasons.find(s => s.seasonNumber === ep.season);
    if (!season) {
      season = { seasonNumber: ep.season, episodes: [] };
      tvShowsMap[showKey].seasons.push(season);
    }
    season.episodes.push({ episodeNumber: ep.episode });
  }
  return {
    movies: movies.map(m => ({ title: m.title, year: m.year })),
    tvShows: Object.values(tvShowsMap)
  };
}

// GET /api/drive/contents - compare drive to library
router.get('/contents', async (req, res) => {
  try {
    const drivePath = getSyncDrivePath();
    const driveIndex = scanDrive(drivePath);
    const libraryIndex = await getLocalLibraryIndex();
    const comparison = compareDriveToLibrary(driveIndex, libraryIndex);
    res.json({ driveIndex, comparison });
  } catch (err) {
    res.status(500).json({ error: 'Failed to scan drive or compare contents', details: err.message });
  }
});

// GET /api/drive/status - drive attachment and space info
router.get('/status', (req, res) => {
  const drivePath = getSyncDrivePath();
  let attached = false;
  let free = null;
  let total = null;
  let percentUsed = null;
  let healthWarning = null;
  try {
    const stat = fs.statSync(drivePath);
    attached = stat.isDirectory();
    if (attached && fs.existsSync(drivePath)) {
      try {
        const info = disk.checkSync(drivePath);
        free = info.free;
        total = info.total;
        if (typeof free === 'number' && typeof total === 'number' && total > 0) {
          percentUsed = Math.round(((total - free) / total) * 100);
          if (free / total < 0.05) {
            healthWarning = 'Low free space!';
          }
        }
      } catch (diskErr) {
        free = null;
        total = null;
      }
    }
  } catch {
    attached = false;
  }
  res.json({ attached, drivePath, free, total, percentUsed, healthWarning });
});

// POST /api/drive/rescan - manual rescan
router.post('/rescan', async (req, res) => {
  try {
    const drivePath = getSyncDrivePath();
    const driveIndex = scanDrive(drivePath);
    const libraryIndex = await getLocalLibraryIndex();
    const comparison = compareDriveToLibrary(driveIndex, libraryIndex);
    res.json({ driveIndex, comparison });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rescan drive', details: err.message });
  }
});

// POST /api/drive/delete - delete a movie or show from the drive
router.post('/delete', async (req, res) => {
  const { type, title, year } = req.body;
  const drivePath = getSyncDrivePath();
  try {
    if (type === 'movie') {
      // Movies are in /Movies/Title (Year)
      const folderName = year ? `${title} (${year})` : title;
      const movieFolder = path.join(drivePath, 'Movies', folderName);
      if (fs.existsSync(movieFolder)) {
        fs.rmSync(movieFolder, { recursive: true, force: true });
        return res.json({ success: true });
      } else {
        return res.status(404).json({ error: 'Movie folder not found' });
      }
    } else if (type === 'show') {
      // TV shows are in /TV/Title
      const showFolder = path.join(drivePath, 'TV', title);
      if (fs.existsSync(showFolder)) {
        fs.rmSync(showFolder, { recursive: true, force: true });
        return res.json({ success: true });
      } else {
        return res.status(404).json({ error: 'Show folder not found' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete from drive', details: err.message });
  }
});

// POST /api/drive/sync-missing - add missing content for a partial TV show to the sync queue
router.post('/sync-missing', async (req, res) => {
  const { title, missingSeasons, missingEpisodes } = req.body;
  try {
    // Find the show in the local media index
    const allEpisodes = await databaseService.getLocalMediaByTitle(title);
    let itemsToAdd = [];
    if (missingSeasons && missingSeasons.length > 0) {
      // Add all episodes from missing seasons
      for (const seasonNum of missingSeasons) {
        itemsToAdd.push(...allEpisodes.filter(ep => ep.season === seasonNum));
      }
    }
    if (missingEpisodes && missingEpisodes.length > 0) {
      for (const epGroup of missingEpisodes) {
        const { season, episodes } = epGroup;
        itemsToAdd.push(...allEpisodes.filter(ep => ep.season === season && episodes.includes(ep.episode)));
      }
    }
    if (itemsToAdd.length === 0) {
      return res.status(400).json({ error: 'No missing episodes found to add.' });
    }
    await databaseService.addQueueItems(itemsToAdd);
    res.json({ success: true, added: itemsToAdd.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add missing content to sync queue', details: err.message });
  }
});

module.exports = router; 