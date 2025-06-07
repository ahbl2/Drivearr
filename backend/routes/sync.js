const express = require('express');
const router = express.Router();
const { scanDrive } = require('../services/driveScanner');
const { syncQueueToDrive } = require('../services/syncEngine');
const { writeManifest } = require('../services/manifestManager');
const logger = require('../services/logger');

const usbRoot = process.env.USB_MOUNT_ROOT || '/usbdrives/FriendsDrive';

// In-memory sync queue (replace with persistent storage if needed)
let syncQueue = [];

// Get the current sync queue
router.get('/queue', (req, res) => {
  let page = parseInt(req.query.page) || 1;
  if (page < 1) page = 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedQueue = syncQueue.slice(start, end);
  res.json({
    items: paginatedQueue,
    total: syncQueue.length,
    page,
    pageSize
  });
});

// Add items to the sync queue
router.post('/queue', (req, res) => {
  let items = req.body.items;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items must be an array.' });
  }
  // Ensure each item has a 'key' property
  items = items.map(item => ({ ...item, key: item.plexKey || item.key }));
  syncQueue = syncQueue.concat(items);
  res.json({ success: true, queue: syncQueue });
});

// Remove an item from the sync queue
router.post('/remove', (req, res) => {
  const item = req.body.item;
  if (!item) return res.status(400).json({ error: 'Missing item.' });
  syncQueue = syncQueue.filter(q => {
    if (item.key) return q.key !== item.key && q.plexKey !== item.key;
    if (item.plexKey) return q.key !== item.plexKey && q.plexKey !== item.plexKey;
    if (item.path) return q.path !== item.path;
    return true;
  });
  res.json({ success: true, queue: syncQueue });
});

// Clear the sync queue
router.post('/clear', (req, res) => {
  syncQueue = [];
  res.json({ success: true });
});

// Pause/Resume sync
router.post('/pause', (req, res) => {
  const { paused } = req.body;
  if (typeof paused !== 'boolean') {
    return res.status(400).json({ error: 'Missing or invalid paused flag.' });
  }
  // In a real implementation, you would update a global sync state
  // For now, we'll just return success
  res.json({ success: true, paused });
});

// Clear completed items from the queue
router.post('/clear-completed', (req, res) => {
  // In a real implementation, you would filter out completed items
  // For now, we'll just return success
  res.json({ success: true });
});

router.post('/start', async (req, res) => {
  const queue = req.body.queue;

  if (!Array.isArray(queue) || queue.length === 0) {
    return res.status(400).json({ error: 'Queue is empty or invalid.' });
  }

  try {
    const driveContents = await scanDrive(usbRoot);
    const result = await syncQueueToDrive(queue, driveContents, { usbRoot });
    await writeManifest(usbRoot, result.copied);
    syncQueue = []; // Clear the queue after successful sync
    res.json(result);
  } catch (err) {
    logger.error('Sync error: ' + formatError(err));
    res.status(500).json({ error: 'Failed to sync files.' });
  }
});

router.get('/status', (req, res) => {
  res.json(syncQueueToDrive.getSyncStatus ? syncQueueToDrive.getSyncStatus() : {});
});

function formatError(error) {
    return error && error.stack ? error.stack : String(error);
}

module.exports = router;
