const express = require('express');
const router = express.Router();
const { scanDrive } = require('../services/driveScanner');
const { syncQueueToDrive } = require('../services/syncEngine');
const { writeManifest } = require('../services/manifestManager');
const logger = require('../services/logger');

const usbRoot = process.env.USB_MOUNT_ROOT || '/usbdrives/FriendsDrive';

router.post('/start', async (req, res) => {
  const queue = req.body.queue;

  if (!Array.isArray(queue) || queue.length === 0) {
    return res.status(400).json({ error: 'Queue is empty or invalid.' });
  }

  try {
    const driveContents = await scanDrive(usbRoot);
    const result = await syncQueueToDrive(queue, driveContents, { usbRoot });
    await writeManifest(usbRoot, result.copied);

    res.json(result);
  } catch (err) {
    logger.error('Sync error:', err);
    res.status(500).json({ error: 'Failed to sync files.' });
  }
});

router.get('/status', (req, res) => {
  res.json(syncQueueToDrive.getSyncStatus ? syncQueueToDrive.getSyncStatus() : {});
});

module.exports = router;
