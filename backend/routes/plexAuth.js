const express = require('express');
const router = express.Router();
const plexAuth = require('../services/plexAuthService');

// Use the app's settings page as the forwardUrl
const FORWARD_URL = 'http://localhost:5173/settings/plex';

router.post('/pin', async (req, res) => {
  try {
    const pin = await plexAuth.getPin();
    const oauthUrl = plexAuth.getOauthUrl(pin, FORWARD_URL);
    // Log PIN info for debugging
    console.log('[PlexAuth] Generated PIN:', { id: pin.id, code: pin.code, oauthUrl });
    res.json({ id: pin.id, code: pin.code, oauthUrl });
  } catch (err) {
    console.error('[PlexAuth] Error generating PIN:', err.message || err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/token/:pinId', async (req, res) => {
  try {
    // Log PIN ID being checked
    console.log('[PlexAuth] Checking PIN ID:', req.params.pinId);
    const pin = await plexAuth.checkPin(req.params.pinId);
    // Log response from Plex
    console.log('[PlexAuth] checkPin response:', pin);
    res.json(pin);
  } catch (err) {
    console.error('[PlexAuth] Error checking PIN:', err.message || err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/servers/:token', async (req, res) => {
  try {
    const servers = await plexAuth.getServers(req.params.token);
    res.json(servers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 