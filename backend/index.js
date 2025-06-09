const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Routes
const plexRoutes = require('./routes/plex');
const syncRoutes = require('./routes/sync');
const configRoutes = require('./routes/config');
const usbRoutes = require('./routes/usb');
const plexAuthRoutes = require('./routes/plexAuth');

app.use('/api/plex', plexRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/config', configRoutes);
app.use('/api/usb', usbRoutes);
app.use('/api/plex-auth', plexAuthRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// --- Initialization order: database -> syncService -> server ---
const databaseService = require('./services/databaseService');
const syncService = require('./services/syncService');
const { scanAndIndexMediaFolders, startWatchingMediaFolders } = require('./services/driveScanner');
const { loadConfig } = require('./config/configManager');

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

databaseService.initialize()
  .then(() => syncService.initialize())
  .then(async () => {
    // Auto-scan all configured media folders on startup
    try {
      const config = await loadConfig();
      const tvFolders = Array.isArray(config.TV_SHOW_FOLDERS) ? config.TV_SHOW_FOLDERS : [];
      const movieFolders = Array.isArray(config.MOVIE_FOLDERS) ? config.MOVIE_FOLDERS : [];
      const allFolders = [...tvFolders, ...movieFolders];
      if (allFolders.length > 0) {
        const indexed = await scanAndIndexMediaFolders(allFolders);
        await startWatchingMediaFolders(allFolders);
        console.log(`Auto-scanned and watching media folders on startup. Indexed ${indexed.length} files.`);
      } else {
        console.log('No media folders configured for auto-scan.');
      }
      // Start watching the sync drive if configured
      if (config.SYNC_DRIVE_PATH) {
        await startWatchingMediaFolders([config.SYNC_DRIVE_PATH]);
        console.log(`[watcher] Watching sync drive for real-time changes: ${config.SYNC_DRIVE_PATH}`);
      }
    } catch (err) {
      console.error('Auto-scan on startup failed:', err);
    }
    server.listen(port, () => {
      console.log(`Drivearr backend running at http://localhost:${port}`);
      console.log('WebSocket server running.');
    });
  })
  .catch(err => {
    console.error('Failed to initialize services:', err);
  });

module.exports = { io };
