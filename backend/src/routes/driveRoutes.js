const express = require('express');
const { readDriveManifest, storeDriveProfile } = require('../services/driveService');
const { query } = require('../db');

const router = express.Router();

// GET /api/drives/profiles
router.get('/profiles', async (req, res) => {
  try {
    const profiles = await query('SELECT * FROM drive_profiles');
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve drive profiles.' });
  }
});

// GET /api/drives/history/:driveId
router.get('/history/:driveId', async (req, res) => {
  const { driveId } = req.params;
  try {
    const history = await query('SELECT * FROM drive_history WHERE drive_id = ?', [driveId]);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve drive history.' });
  }
});

// POST /api/drives/assign-profile
router.post('/assign-profile', async (req, res) => {
  const { driveId, profileName, profileLabel } = req.body;
  if (!driveId || !profileName || !profileLabel) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  try {
    await query(
      `INSERT INTO drive_profiles (drive_id, profile_name, profile_label, created_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(drive_id) DO UPDATE SET profile_name=excluded.profile_name, profile_label=excluded.profile_label` ,
      [driveId, profileName, profileLabel]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign drive profile.' });
  }
});

// DELETE /api/drives/profile/:driveId
router.delete('/profile/:driveId', async (req, res) => {
  const { driveId } = req.params;
  if (!driveId) {
    return res.status(400).json({ error: 'Missing driveId.' });
  }
  try {
    await query('DELETE FROM drive_profiles WHERE drive_id = ?', [driveId]);
    await query('DELETE FROM drive_history WHERE drive_id = ?', [driveId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete drive profile/history.' });
  }
});

module.exports = router; 