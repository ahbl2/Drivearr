const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');
const { markInProgress, markCompleted, readManifest } = require('./manifestManager');

// In-memory sync status
let syncStatus = {
  active: false,
  total: 0,
  completed: 0,
  items: [] // { key, title, status, progress (0-100), error }
};

function getSyncStatus() {
  return syncStatus;
}

function resetSyncStatus() {
  syncStatus = {
    active: false,
    total: 0,
    completed: 0,
    items: []
  };
}

function updateSyncStatusItem(key, update) {
  const idx = syncStatus.items.findIndex(i => i.key === key);
  if (idx !== -1) {
    syncStatus.items[idx] = { ...syncStatus.items[idx], ...update };
  }
}

function isEpisodeOnDrive(queueItem, scannedDriveItems) {
  return scannedDriveItems.some(item =>
    item.type === 'episode' &&
    item.title.toLowerCase() === queueItem.title.toLowerCase() &&
    item.season === queueItem.season &&
    item.episode === queueItem.episode
  );
}

function isMovieOnDrive(queueItem, scannedDriveItems) {
  return scannedDriveItems.some(item =>
    item.type === 'movie' &&
    item.title.toLowerCase() === queueItem.title.toLowerCase()
  );
}

async function syncQueueToDrive(queue, scannedDrive, options) {
  resetSyncStatus();
  syncStatus.active = true;
  syncStatus.total = queue.length;
  syncStatus.completed = 0;
  syncStatus.items = queue.map(item => ({
    key: item.key || item.path,
    title: item.title,
    status: 'pending',
    progress: 0,
    error: null
  }));

  // Recover in-progress items from previous run
  const manifest = await readManifest(options.usbRoot);
  let recoveryQueue = manifest.inProgress || [];
  if (recoveryQueue.length > 0) {
    logger.info(`Recovering ${recoveryQueue.length} in-progress items from previous sync.`);
    queue = [...recoveryQueue, ...queue];
  }

  const results = {
    copied: [],
    skipped: [],
    errors: []
  };

  for (const item of queue) {
    const itemKey = item.key || item.path;
    updateSyncStatusItem(itemKey, { status: 'pending', progress: 0, error: null });
    const alreadyExists =
      item.type === 'episode'
        ? isEpisodeOnDrive(item, scannedDrive)
        : isMovieOnDrive(item, scannedDrive);

    if (alreadyExists) {
      results.skipped.push(item);
      await markCompleted(options.usbRoot, item);
      updateSyncStatusItem(itemKey, { status: 'skipped', progress: 100 });
      syncStatus.completed++;
      continue;
    }

    const destBase = item.type === 'episode'
      ? path.join(options.usbRoot, 'TV Shows', item.title, `Season ${item.season}`)
      : path.join(options.usbRoot, 'Movies', item.title);

    const fileName = path.basename(item.path);
    const destPath = path.join(destBase, fileName);

    try {
      await fs.ensureDir(destBase);
      await markInProgress(options.usbRoot, item);
      let copied = false;
      let attempts = 0;
      let lastError = null;
      updateSyncStatusItem(itemKey, { status: 'syncing', progress: 0 });
      while (!copied && attempts < 3) {
        try {
          // Progress tracking for large files
          await new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(item.path);
            const writeStream = fs.createWriteStream(destPath);
            let totalBytes = 0;
            let copiedBytes = 0;
            try {
              totalBytes = fs.statSync(item.path).size;
            } catch {}
            readStream.on('data', chunk => {
              copiedBytes += chunk.length;
              let percent = totalBytes ? Math.round((copiedBytes / totalBytes) * 100) : 0;
              updateSyncStatusItem(itemKey, { progress: percent });
            });
            readStream.on('error', err => reject(err));
            writeStream.on('error', err => reject(err));
            writeStream.on('close', resolve);
            readStream.pipe(writeStream);
          });
          copied = true;
        } catch (err) {
          attempts++;
          lastError = err;
          logger.error(`Retry ${attempts} for copying ${fileName}:`, err);
          if (attempts < 3) await new Promise(res => setTimeout(res, 1000));
        }
      }
      if (copied) {
        results.copied.push({ ...item, destPath });
        await markCompleted(options.usbRoot, item);
        updateSyncStatusItem(itemKey, { status: 'done', progress: 100 });
      } else {
        logger.error(`Failed to copy ${fileName} after 3 attempts:`, lastError);
        results.errors.push({ item, error: lastError.message });
        updateSyncStatusItem(itemKey, { status: 'error', error: lastError.message });
      }
    } catch (err) {
      logger.error(`Error copying ${fileName}:`, err);
      results.errors.push({ item, error: err.message });
      updateSyncStatusItem(itemKey, { status: 'error', error: err.message });
    }
    syncStatus.completed++;
  }

  syncStatus.active = false;
  return results;
}

module.exports = {
  syncQueueToDrive,
  getSyncStatus
};
