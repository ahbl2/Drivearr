const express = require('express')
const router = express.Router()
const { loadConfig, saveConfig } = require('../config/configManager')

router.get('/', async (req, res) => {
  const config = await loadConfig()
  res.json(config || {})
})

router.post('/', async (req, res) => {
  const newConfig = req.body

  if (!newConfig.PLEX_BASE_URL || !newConfig.PLEX_TOKEN || !newConfig.MEDIA_TV_DIR || !newConfig.MEDIA_MOVIES_DIR || !newConfig.USB_MOUNT_ROOT) {
    return res.status(400).json({ error: 'Missing required fields.' })
  }

  await saveConfig(newConfig)
  res.json({ success: true })
})

module.exports = router
