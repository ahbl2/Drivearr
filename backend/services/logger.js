const fs = require('fs')
const path = require('path')

const logDir = path.join(__dirname, '../../logs')
const logFile = path.join(logDir, 'drivearr.log')

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir)
}

function getTimestamp() {
  return new Date().toISOString()
}

function log(level, message, meta = null) {
  let metaOut = meta;
  if (meta instanceof Error) {
    metaOut = meta.stack || meta.toString();
  } else if (meta && typeof meta !== 'string') {
    try {
      metaOut = JSON.stringify(meta);
    } catch (e) {
      metaOut = String(meta);
    }
  }
  const entry = {
    timestamp: getTimestamp(),
    level,
    message,
    ...(metaOut ? { meta: metaOut } : {})
  }
  const line = JSON.stringify(entry)
  fs.appendFileSync(logFile, line + '\n')
  if (level === 'error') {
    console.error(`[${entry.timestamp}] [${level.toUpperCase()}]`, message, metaOut || '')
  } else {
    console.log(`[${entry.timestamp}] [${level.toUpperCase()}]`, message, metaOut || '')
  }
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  error: (msg, meta) => log('error', msg, meta)
} 