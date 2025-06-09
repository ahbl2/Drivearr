const fs = require('fs');
const path = require('path');
const { writeManifestFile, readManifestFile } = require('./syncService');

jest.mock('fs');

// Explicitly mock fs.promises.writeFile and fs.promises.readFile
fs.promises = {
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(JSON.stringify({
    driveId: 'drive-123',
    profile: { name: 'Test Drive', label: 'Test', createdAt: '2023-01-01T00:00:00.000Z' },
    history: [],
    lastSync: { timestamp: '2023-01-01T00:00:00.000Z', status: 'success' }
  }))
};

describe('writeManifestFile', () => {
  beforeEach(() => {
    fs.promises.writeFile.mockClear();
  });

  it('should write a manifest file with the correct structure', async () => {
    const drivePath = '/test/drive';
    const syncResults = [
      { type: 'movie', source: 'local', status: 'success', error: null },
      { type: 'tv', source: 'plex', status: 'success', error: null }
    ];

    await writeManifestFile(drivePath, syncResults);

    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      path.join(drivePath, '.drivearr-manifest.json'),
      expect.stringContaining('driveId'),
      'utf8'
    );
  });

  it('should handle errors from writeFile gracefully', async () => {
    fs.promises.writeFile.mockRejectedValueOnce(new Error('Disk full'));
    const drivePath = '/test/drive';
    const syncResults = [];
    await expect(writeManifestFile(drivePath, syncResults)).rejects.toThrow('Disk full');
  });

  it('should write a manifest with correct content', async () => {
    const drivePath = '/test/drive';
    const syncResults = [
      { type: 'movie', source: 'local', status: 'success', error: null }
    ];
    let manifestString = '';
    fs.promises.writeFile.mockImplementationOnce((_, data) => {
      manifestString = data;
      return Promise.resolve();
    });
    await writeManifestFile(drivePath, syncResults);
    const manifest = JSON.parse(manifestString);
    expect(manifest).toHaveProperty('driveId');
    expect(manifest).toHaveProperty('profile');
    expect(Array.isArray(manifest.history)).toBe(true);
    expect(manifest.history[0].type).toBe('movie');
    expect(manifest.lastSync.status).toBe('success');
  });

  it('should write a manifest even if syncResults is empty', async () => {
    const drivePath = '/test/drive';
    const syncResults = [];
    let manifestString = '';
    fs.promises.writeFile.mockImplementationOnce((_, data) => {
      manifestString = data;
      return Promise.resolve();
    });
    await writeManifestFile(drivePath, syncResults);
    const manifest = JSON.parse(manifestString);
    expect(Array.isArray(manifest.history)).toBe(true);
    expect(manifest.history.length).toBe(0);
  });

  it('should include error fields for failed sync items', async () => {
    const drivePath = '/test/drive';
    const syncResults = [
      { type: 'movie', source: 'local', status: 'failed', error: 'File not found' }
    ];
    let manifestString = '';
    fs.promises.writeFile.mockImplementationOnce((_, data) => {
      manifestString = data;
      return Promise.resolve();
    });
    await writeManifestFile(drivePath, syncResults);
    const manifest = JSON.parse(manifestString);
    expect(manifest.history[0].status).toBe('failed');
    expect(manifest.history[0].error).toBe('File not found');
  });
});

describe('readManifestFile', () => {
  it('should read and parse the manifest file correctly', async () => {
    const drivePath = '/test/drive';
    const manifest = await readManifestFile(drivePath);
    expect(manifest).toHaveProperty('driveId', 'drive-123');
    expect(manifest).toHaveProperty('profile');
    expect(manifest.profile.name).toBe('Test Drive');
    expect(manifest.profile.label).toBe('Test');
    expect(manifest.profile.createdAt).toBe('2023-01-01T00:00:00.000Z');
    expect(Array.isArray(manifest.history)).toBe(true);
    expect(manifest.lastSync.status).toBe('success');
  });

  it('should return null if the manifest file does not exist', async () => {
    fs.promises.readFile.mockRejectedValueOnce(new Error('File not found'));
    const drivePath = '/test/drive';
    const manifest = await readManifestFile(drivePath);
    expect(manifest).toBeNull();
  });
}); 