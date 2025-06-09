const express = require('express');
const driveRoutes = require('./routes/driveRoutes');

const app = express();
app.use(express.json());

// Use the drive routes
app.use('/api/drives', driveRoutes);

// Serve static files (if any)
app.use(express.static('public'));

// ... existing code ...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 