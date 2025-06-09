const fs = require('fs');
const path = require('path');
const { readDriveManifest, storeDriveProfile } = require('./driveService');
const { readManifestFile } = require('./syncService');

jest.mock('./syncService');
jest.mock('../db');

describe('driveService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readDriveManifest', () => {
    it('should read and log the manifest file when it exists', async () => {
      const drivePath = '/test/drive';
      const mockManifest = {
        driveId: 'drive-123',
        profile: { name: 'Test Drive', label: 'Test', createdAt: '2023-01-01T00:00:00.000Z' },
        history: []
      };
      readManifestFile.mockResolvedValue(mockManifest);

      const manifest = await readDriveManifest(drivePath);

      expect(readManifestFile).toHaveBeenCalledWith(drivePath);
      expect(manifest).toEqual(mockManifest);
    });

    it('should log a message when no manifest file is found', async () => {
      const drivePath = '/test/drive';
      readManifestFile.mockResolvedValue(null);

      const manifest = await readDriveManifest(drivePath);

      expect(readManifestFile).toHaveBeenCalledWith(drivePath);
      expect(manifest).toBeNull();
    });
  });

  describe('storeDriveProfile', () => {
    it('should store drive profile and history in the database', async () => {
      const mockManifest = {
        driveId: 'drive-123',
        profile: { name: 'Test Drive', label: 'Test', createdAt: '2023-01-01T00:00:00.000Z' },
        history: [
          { type: 'movie', source: 'local', status: 'success', error: null, timestamp: '2023-01-01T00:00:00.000Z' }
        ]
      };

      await storeDriveProfile(mockManifest);

      expect(require('../db').query).toHaveBeenCalledTimes(2); // One for profile, one for history
    });
  });
}); 