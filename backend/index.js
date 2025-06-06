const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

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

databaseService.initialize()
  .then(() => syncService.initialize())
  .then(() => {
    app.listen(port, () => {
      console.log(`Drivearr backend running at http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize services:', err);
  });
