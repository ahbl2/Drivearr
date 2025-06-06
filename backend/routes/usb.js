const express = require('express')
const router = express.Router()
const { scanDrive } = require('../services/driveScanner')
const fs = require('fs-extra')
const { readManifest } = require('../services/manifestManager')
const logger = require('../services/logger')

const usbRoot = process.env.USB_MOUNT_ROOT || '/usbdrives/FriendsDrive'

router.get('/scanned', async (req, res) => {
  try {
    const scanned = await scanDrive(usbRoot)
    const manifest = await readManifest(usbRoot)

    const result = scanned.map(file => {
      const inManifest = manifest.synced.find(e =>
        file.type === 'episode'
          ? e.type === 'episode' &&
            e.title === file.title &&
            e.season === file.season &&
            e.episode === file.episode
          : e.type === 'movie' && e.title === file.title
      )

      return {
        ...file,
        syncedAt: inManifest?.syncedAt || null
      }
    })

    res.json(result)
  } catch (err) {
    logger.error(formatError(err))
    res.status(500).json({ error: 'Drive scan failed' })
  }
})

router.post('/remove', async (req, res) => {
  const item = req.body.item
  if (!item?.path) return res.status(400).json({ error: 'Missing path' })

  try {
    await fs.remove(item.path)
    res.json({ success: true })
  } catch (err) {
    logger.error('Remove error: ' + formatError(err))
    res.status(500).json({ error: 'Failed to delete item' })
  }
})

function formatError(error) {
    return error && error.stack ? error.stack : String(error);
}

module.exports = router
