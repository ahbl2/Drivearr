const fs = require('fs-extra')
const path = require('path')

const configPath = path.join(__dirname, 'config.json')

async function loadConfig() {
  try {
    const config = await fs.readJson(configPath)
    return config
  } catch {
    return null
  }
}

async function saveConfig(newConfig) {
  await fs.ensureFile(configPath)
  await fs.writeJson(configPath, newConfig, { spaces: 2 })
}

module.exports = {
  loadConfig,
  saveConfig,
  configPath
}
