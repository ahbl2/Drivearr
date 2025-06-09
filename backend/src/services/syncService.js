const path = require('path');
const fs = require('fs');

// New function to write the manifest file after sync
async function writeManifestFile(drivePath, syncResults) {
  const manifestPath = path.join(drivePath, '.drivearr-manifest.json');
  const manifest = {
    driveId: 'drive-' + Date.now(), // Generate a unique ID for the drive
    profile: {
      name: 'Default Drive Profile',
      label: 'Drive ' + new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    },
    history: syncResults.map(item => ({
      timestamp: new Date().toISOString(),
      type: item.type,
      source: item.source,
      status: item.status,
      error: item.error || null
    })),
    lastSync: {
      timestamp: new Date().toISOString(),
      status: 'success'
    }
  };
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Manifest file written to:', manifestPath);
}

// New function to read the manifest file from the drive
async function readManifestFile(drivePath) {
  const manifestPath = path.join(drivePath, '.drivearr-manifest.json');
  try {
    const data = await fs.promises.readFile(manifestPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading manifest file:', error);
    return null;
  }
}

// Ensure the sync function is async
async function sync(drivePath, syncResults) {
  // ... existing sync logic ...

  // Write manifest file after sync
  await writeManifestFile(drivePath, syncResults);
}

module.exports = {
  writeManifestFile,
  readManifestFile,
  sync
};

// ... existing code ... 