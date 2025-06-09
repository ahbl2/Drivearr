const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');

const MANIFEST_FILENAME = '.drivearr-manifest.json';

async function readManifest(usbRoot) {
  const manifestPath = path.join(usbRoot, MANIFEST_FILENAME);
  try {
    const data = await fs.readJson(manifestPath);
    return data;
  } catch {
    return null;
  }
}

async function writeManifest(usbRoot, syncResults) {
  const manifestPath = path.join(usbRoot, MANIFEST_FILENAME);
  let manifest = await readManifest(usbRoot);
  const now = new Date().toISOString();

  // Generate a persistent driveId if missing
  let driveId = manifest && manifest.driveId ? manifest.driveId : 'drive-' + crypto.randomBytes(8).toString('hex');

  // Use existing profile or default
  let profile = manifest && manifest.profile ? manifest.profile : {
    name: 'Default Drive Profile',
    label: 'Drive ' + now.split('T')[0],
    createdAt: now
  };

  // Merge history
  let history = manifest && Array.isArray(manifest.history) ? manifest.history : [];
  for (const item of syncResults) {
    history.push({
      timestamp: now,
      type: item.type,
      title: item.title,
      source: item.source || 'local',
      status: item.status || 'success',
      error: item.error || null
    });
  }

  // Prune history if needed (e.g., keep last 500)
  if (history.length > 500) history = history.slice(-500);

  // Set lastSync
  const lastSync = {
    timestamp: now,
    status: syncResults.every(i => i.status === 'success') ? 'success' : 'partial'
  };

  const newManifest = {
    driveId,
    profile,
    history,
    lastSync
  };

  // Atomic write: write to temp, then rename
  const tmpPath = manifestPath + '.tmp';
  await fs.writeJson(tmpPath, newManifest, { spaces: 2 });
  await fs.move(tmpPath, manifestPath, { overwrite: true });
  console.log('Manifest file written to:', manifestPath);
}

async function markInProgress(usbRoot, item) {
  const manifestPath = path.join(usbRoot, MANIFEST_FILENAME);
  let currentManifest = await readManifest(usbRoot);
  if (!currentManifest.inProgress) currentManifest.inProgress = [];
  const exists = currentManifest.inProgress.find((e) =>
    item.type === 'episode'
      ? e.type === 'episode' &&
        e.title === item.title &&
        e.season === item.season &&
        e.episode === item.episode
      : e.type === 'movie' && e.title === item.title
  );
  if (!exists) {
    currentManifest.inProgress.push(item);
    await fs.writeJson(manifestPath, currentManifest, { spaces: 2 });
  }
}

async function markCompleted(usbRoot, item) {
  const manifestPath = path.join(usbRoot, MANIFEST_FILENAME);
  let currentManifest = await readManifest(usbRoot);
  if (!currentManifest.inProgress) currentManifest.inProgress = [];
  currentManifest.inProgress = currentManifest.inProgress.filter((e) =>
    !(item.type === e.type && item.title === e.title &&
      (item.type === 'movie' || (item.season === e.season && item.episode === e.episode)))
  );
  await fs.writeJson(manifestPath, currentManifest, { spaces: 2 });
}

module.exports = {
  readManifest,
  writeManifest,
  markInProgress,
  markCompleted
};
