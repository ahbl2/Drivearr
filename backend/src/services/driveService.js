const { readManifestFile } = require('./syncService');
const db = require('../db'); // Assuming you have a database module

// New function to read the manifest file when a drive is connected
async function readDriveManifest(drivePath) {
  try {
    const manifest = await readManifestFile(drivePath);
    if (manifest) {
      console.log('Drive manifest read:', manifest);
      await storeDriveProfile(manifest);
      return manifest;
    } else {
      const msg = 'No manifest file found on drive.';
      console.warn(msg);
      return { error: msg };
    }
  } catch (err) {
    const msg = 'Error reading manifest file: ' + err.message;
    console.error(msg);
    return { error: msg };
  }
}

// New function to store drive profiles and history in the local database
async function storeDriveProfile(manifest) {
  const { driveId, profile, history } = manifest;
  const query = `
    INSERT INTO drive_profiles (drive_id, profile_name, profile_label, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(drive_id) DO UPDATE SET profile_name=excluded.profile_name, profile_label=excluded.profile_label, created_at=excluded.created_at
  `;
  await db.query(query, [driveId, profile.name, profile.label, profile.createdAt]);

  // Store history entries
  for (const item of history) {
    const historyQuery = `
      INSERT INTO drive_history (drive_id, type, source, status, error, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.query(historyQuery, [driveId, item.type, item.source, item.status, item.error, item.timestamp]);
  }
  console.log('Drive profile and history stored in database.');
}

module.exports = {
  readDriveManifest,
  storeDriveProfile
}; 