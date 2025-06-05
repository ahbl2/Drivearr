const express = require('express')
const router = express.Router()
const { loadConfig, saveConfig } = require('../config/configManager')

router.get('/', async (req, res) => {
  const config = await loadConfig()
  res.json(config || {})
})

router.post('/', async (req, res) => {
  const newConfig = req.body;
  const currentConfig = await loadConfig() || {};
  const mergedConfig = { ...currentConfig, ...newConfig };
  await saveConfig(mergedConfig);
  res.json({ success: true });
})

module.exports = router
