const path = require('path');
const fs = require('fs-extra');

const MANIFEST_FILENAME = '.plex2drive.json';

async function readManifest(usbRoot) {
  const manifestPath = path.join(usbRoot, MANIFEST_FILENAME);
  try {
    const data = await fs.readJson(manifestPath);
    return data;
  } catch {
    return { synced: [], inProgress: [] };
  }
}

async function writeManifest(usbRoot, copiedItems) {
  const manifestPath = path.join(usbRoot, MANIFEST_FILENAME);
  let currentManifest = await readManifest(usbRoot);

  for (const item of copiedItems) {
    const exists = currentManifest.synced.find((e) =>
      item.type === 'episode'
        ? e.type === 'episode' &&
          e.title === item.title &&
          e.season === item.season &&
          e.episode === item.episode
        : e.type === 'movie' && e.title === item.title
    );

    if (!exists) {
      currentManifest.synced.push({
        title: item.title,
        type: item.type,
        season: item.season,
        episode: item.episode,
        path: item.destPath,
        syncedAt: new Date().toISOString()
      });
    }
  }

  await fs.writeJson(manifestPath, currentManifest, { spaces: 2 });
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
