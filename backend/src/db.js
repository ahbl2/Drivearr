const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create a new database connection
const dbPath = path.join(__dirname, '../database/drivearr.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Function to execute SQL queries
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

module.exports = {
  query
}; 