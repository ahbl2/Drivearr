const express = require('express')
const router = express.Router()
const { scanDrive } = require('../services/driveScanner')
const fs = require('fs-extra')
const { readManifest } = require('../services/manifestManager')
const logger = require('../services/logger')
const os = require('os')
const path = require('path')
const { loadConfig } = require('../config/configManager')

const usbRoot = process.env.USB_MOUNT_ROOT || '/usbdrives/FriendsDrive'

router.get('/scanned', async (req, res) => {
  try {
    const scanned = await scanDrive(usbRoot)
    const manifest = await readManifest(usbRoot)

    // Defensive: ensure scanned is always an array
    const scannedArray = Array.isArray(scanned) ? scanned : []

    const result = scannedArray.map(file => {
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

// Discover available drives/mount points
router.get('/discover', async (req, res) => {
  try {
    let drives = []
    if (os.platform() === 'win32') {
      // Windows: list all drive letters
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => l + ':\\')
      drives = possible.filter(p => {
        try { return fs.existsSync(p) } catch { return false }
      })
    } else {
      // Linux/Unraid: check common mount points
      const mountDirs = ['/mnt/disks', '/mnt/remotes', '/media', '/usbdrives']
      for (const dir of mountDirs) {
        if (fs.existsSync(dir)) {
          const subdirs = fs.readdirSync(dir).map(f => path.join(dir, f)).filter(f => fs.lstatSync(f).isDirectory())
          drives.push(...subdirs)
        }
      }
    }
    res.json({ drives })
  } catch (err) {
    res.status(500).json({ error: 'Failed to discover drives.' })
  }
})

// Get current attached drive status
router.get('/status', async (req, res) => {
  try {
    const config = await loadConfig()
    const syncDrivePath = config && config.SYNC_DRIVE_PATH
    let present = false
    if (syncDrivePath) {
      try {
        present = fs.existsSync(syncDrivePath) && fs.lstatSync(syncDrivePath).isDirectory()
      } catch {}
    }
    res.json({ syncDrivePath, present })
  } catch (err) {
    res.status(500).json({ error: 'Failed to get drive status.' })
  }
})

// Safe eject endpoint
router.post('/eject', async (req, res) => {
  try {
    const config = await loadConfig()
    const syncDrivePath = config && config.SYNC_DRIVE_PATH
    if (!syncDrivePath) return res.status(400).json({ error: 'No sync drive configured.' })

    let result = null
    if (os.platform() === 'win32') {
      // Windows: Use diskpart to remove the drive letter (basic, not production safe)
      const driveLetter = syncDrivePath[0]
      const script = `remove letter=${driveLetter}`
      const { exec } = require('child_process')
      exec(`echo select volume ${driveLetter} & echo ${script} | diskpart`, (err, stdout, stderr) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to eject drive', details: stderr })
        }
        res.json({ success: true, message: 'Drive ejected (Windows, basic).' })
      })
      return
    } else {
      // Linux/Unix: Use umount
      const { exec } = require('child_process')
      exec(`umount "${syncDrivePath}"`, (err, stdout, stderr) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to eject drive', details: stderr })
        }
        res.json({ success: true, message: 'Drive ejected (Linux/Unix).' })
      })
      return
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to eject drive.' })
  }
})

function formatError(error) {
    return error && error.stack ? error.stack : String(error);
}

module.exports = router
