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
  res.json(syncQueue);
});

// Add items to the sync queue
router.post('/queue', (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items must be an array.' });
  }
  syncQueue = syncQueue.concat(items);
  res.json({ success: true, queue: syncQueue });
});

// Remove an item from the sync queue
router.post('/remove', (req, res) => {
  const item = req.body.item;
  if (!item) return res.status(400).json({ error: 'Missing item.' });
  syncQueue = syncQueue.filter(q => (q.key || q.path) !== (item.key || item.path));
  res.json({ success: true, queue: syncQueue });
});

// Clear the sync queue
router.post('/clear', (req, res) => {
  syncQueue = [];
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
