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

app.use('/api/plex', plexRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/config', configRoutes);
app.use('/api/usb', usbRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Drivearr backend running at http://localhost:${port}`);
});
