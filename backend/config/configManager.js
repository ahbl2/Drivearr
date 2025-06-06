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

function getDefaultConfig() {
  return {
    PLEX_TOKEN: '',
    PLEX_HOST: '',
    PLEX_PORT: 32400,
    PLEX_SSL: false,
    PLEX_MOVIES_SECTION_KEY: '',
    PLEX_SHOWS_SECTION_KEY: ''
  };
}

module.exports = {
  loadConfig,
  saveConfig,
  configPath
}
