const express = require('express');
const router = express.Router();
const { scanDrive } = require('../services/driveScanner');
const { syncQueueToDrive } = require('../services/syncEngine');
const { writeManifest } = require('../services/manifestManager');
const logger = require('../services/logger');
const databaseService = require('../services/databaseService');

const usbRoot = process.env.USB_MOUNT_ROOT || '/usbdrives/FriendsDrive';

// Get the current sync queue
router.get('/queue', async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  if (page < 1) page = 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const allQueue = await databaseService.getQueue();
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedQueue = allQueue.slice(start, end);
  res.json({
    items: paginatedQueue,
    total: allQueue.length,
    page,
    pageSize
  });
});

// Add items to the sync queue
router.post('/queue', async (req, res) => {
  let items = req.body.items;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items must be an array.' });
  }
  try {
    await databaseService.addQueueItems(items);
    const allQueue = await databaseService.getQueue();
    res.json({ success: true, queue: allQueue });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add items to queue.' });
  }
});

// Remove an item from the sync queue
router.post('/remove', async (req, res) => {
  const item = req.body.item;
  if (!item) return res.status(400).json({ error: 'Missing item.' });
  try {
    await databaseService.removeQueueItem(item);
    const allQueue = await databaseService.getQueue();
    res.json({ success: true, queue: allQueue });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove item from queue.' });
  }
});

// Clear the sync queue
router.post('/clear', async (req, res) => {
  try {
    await databaseService.clearQueue();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear queue.' });
  }
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
router.post('/clear-completed', async (req, res) => {
  try {
    await databaseService.clearCompletedItems();
    const allQueue = await databaseService.getQueue();
    res.json({ success: true, queue: allQueue });
  } catch (err) {
    logger.error('Error clearing completed items: ' + formatError(err));
    res.status(500).json({ error: 'Failed to clear completed items.' });
  }
});

// Retry a failed sync item
router.post('/retry', async (req, res) => {
  try {
    const { item } = req.body;
    if (!item) {
      return res.status(400).json({ error: 'No item provided' });
    }

    // Reset the item's status in the sync queue
    await databaseService.resetQueueItem(item);
    const allQueue = await databaseService.getQueue();
    res.json({ success: true, queue: allQueue });
  } catch (err) {
    logger.error('Error retrying sync: ' + formatError(err));
    res.status(500).json({ error: 'Failed to retry sync' });
  }
});

router.post('/start', async (req, res) => {
  const queue = req.body.queue;

  if (!Array.isArray(queue) || queue.length === 0) {
    return res.status(400).json({ error: 'Queue is empty or invalid.' });
  }

  try {
    const driveContents = await scanDrive(usbRoot);
    const result = await syncQueueToDrive(queue, driveContents, { usbRoot });
    // Merge all results for manifest history
    const allResults = [
      ...result.copied.map(item => ({ ...item, status: 'success', error: null })),
      ...result.skipped.map(item => ({ ...item, status: 'skipped', error: null })),
      ...result.errors.map(e => ({ ...e.item, status: 'error', error: e.error }))
    ];
    await writeManifest(usbRoot, allResults);
    await databaseService.clearQueue(); // Clear the persistent queue after successful sync
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
