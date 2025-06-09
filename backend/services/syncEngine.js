const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');
const { markInProgress, markCompleted, readManifest } = require('./manifestManager');
const { getPlexFileInfo } = require('./plexService');
const axios = require('axios');

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

function updateSyncStatusItem(key, update) {
  const item = syncStatus.items.find(i => i.key === key);
  if (item) {
    Object.assign(item, update);
  }
}

function resetSyncStatus() {
  syncStatus = {
    active: false,
    total: 0,
    completed: 0,
    items: []
  };
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

// Helper to validate file exists and is accessible
async function validateSourceFile(filePath) {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }
    return true;
  } catch (err) {
    throw new Error(`Source file validation failed: ${err.message}`);
  }
}

// Helper to validate destination directory
async function validateDestDir(dirPath) {
  try {
    await fs.ensureDir(dirPath);
    await fs.access(dirPath, fs.constants.W_OK);
    return true;
  } catch (err) {
    throw new Error(`Destination directory validation failed: ${err.message}`);
  }
}

// Helper to format error messages
function formatError(err) {
  return err.message || err.toString();
}

// Helper to refresh Plex section
async function refreshPlexSection(sectionId, plexHost, plexPort, plexToken, useSSL = false) {
  const protocol = useSSL ? 'https' : 'http';
  const url = `${protocol}://${plexHost}:${plexPort}/library/sections/${sectionId}/refresh?X-Plex-Token=${plexToken}`;
  try {
    await axios.get(url);
    logger.info(`Triggered refresh for Plex section ${sectionId}`);
  } catch (err) {
    logger.error(`Failed to refresh Plex section ${sectionId}: ${err.message}`);
  }
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

    try {
      // Check if item already exists on drive
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

      // Get source path - either from local path or resolve from Plex
      let sourcePath = item.path;
      if (!sourcePath && item.plexKey) {
        try {
          const plexInfo = await getPlexFileInfo(item.plexKey, options);
          sourcePath = plexInfo.filePath;
        } catch (err) {
          throw new Error(`Failed to get Plex file info: ${err.message}`);
        }
      }

      if (!sourcePath) {
        throw new Error('No file path available for sync item');
      }

      // Validate source file
      await validateSourceFile(sourcePath);

      // Prepare destination path
      const destBase = item.type === 'episode'
        ? path.join(options.usbRoot, 'TV Shows', item.title, `Season ${item.season}`)
        : path.join(options.usbRoot, 'Movies', item.title);

      // Validate destination directory
      await validateDestDir(destBase);

      const fileName = path.basename(sourcePath);
      const destPath = path.join(destBase, fileName);

      // Check if destination file already exists
      if (await fs.pathExists(destPath)) {
        const destStats = await fs.stat(destPath);
        const sourceStats = await fs.stat(sourcePath);
        if (destStats.size === sourceStats.size) {
          results.skipped.push(item);
          await markCompleted(options.usbRoot, item);
          updateSyncStatusItem(itemKey, { status: 'skipped', progress: 100 });
          syncStatus.completed++;
          continue;
        }
      }

      await markInProgress(options.usbRoot, item);
      updateSyncStatusItem(itemKey, { status: 'syncing', progress: 0 });

      // Copy file with progress tracking
      let copied = false;
      let attempts = 0;
      let lastError = null;

      while (!copied && attempts < 3) {
        try {
          await new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(sourcePath);
            const writeStream = fs.createWriteStream(destPath);
            let totalBytes = 0;
            let copiedBytes = 0;

            try {
              totalBytes = fs.statSync(sourcePath).size;
            } catch {}

            readStream.on('data', chunk => {
              copiedBytes += chunk.length;
              const percent = totalBytes ? Math.round((copiedBytes / totalBytes) * 100) : 0;
              updateSyncStatusItem(itemKey, { progress: percent });
            });

            readStream.on('error', err => reject(err));
            writeStream.on('error', err => reject(err));
            writeStream.on('close', resolve);
            readStream.pipe(writeStream);
          });

          // Verify the copy was successful
          const sourceStats = await fs.stat(sourcePath);
          const destStats = await fs.stat(destPath);
          if (sourceStats.size !== destStats.size) {
            throw new Error('File size mismatch after copy');
          }

          copied = true;
        } catch (err) {
          attempts++;
          lastError = err;
          logger.error(`Retry ${attempts} for copying ${fileName}: ${formatError(err)}`);
          if (attempts < 3) {
            await new Promise(res => setTimeout(res, 1000));
            // Clean up failed copy attempt
            try {
              await fs.remove(destPath);
            } catch {}
          }
        }
      }

      if (copied) {
        results.copied.push({ ...item, destPath });
        await markCompleted(options.usbRoot, item);
        updateSyncStatusItem(itemKey, { status: 'done', progress: 100 });

        // Trigger Plex refresh for the correct section
        const sectionId = item.type === 'movie' ? options.plexMoviesSection : options.plexShowsSection;
        if (options.plexHost && options.plexPort && options.plexToken) {
          await refreshPlexSection(
            sectionId,
            options.plexHost,
            options.plexPort,
            options.plexToken,
            options.plexSSL
          );
        }
      } else {
        throw new Error(`Failed to copy after 3 attempts: ${formatError(lastError)}`);
      }
    } catch (err) {
      logger.error(`Error processing ${item.title}: ${formatError(err)}`);
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
