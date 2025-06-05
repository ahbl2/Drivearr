const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const CLIENT_ID_PATH = path.join(__dirname, '../config/plex_client_id.txt');

function getOrCreateClientId() {
  if (fs.existsSync(CLIENT_ID_PATH)) {
    return fs.readFileSync(CLIENT_ID_PATH, 'utf8').trim();
  } else {
    // Use a consistent identifier for our app
    const id = 'Drivearr-Client-001';
    fs.writeFileSync(CLIENT_ID_PATH, id, 'utf8');
    return id;
  }
}

const PLEX_CLIENT_ID = getOrCreateClientId();
const PLEX_PRODUCT = 'Drivearr';
const PLEX_DEVICE = 'Drivearr';
const PLEX_VERSION = '1.0.0';

const plexHeaders = {
  'X-Plex-Client-Identifier': PLEX_CLIENT_ID,
  'X-Plex-Product': PLEX_PRODUCT,
  'X-Plex-Version': PLEX_VERSION,
  'X-Plex-Device-Name': PLEX_DEVICE,
  'X-Plex-Platform': 'Windows',
  'X-Plex-Platform-Version': '10',
  'Accept': 'application/json',
};

async function getPin() {
  const res = await axios.post('https://plex.tv/api/v2/pins', {
    strong: true
  }, {
    headers: plexHeaders
  });
  return res.data;
}

function getOauthUrl(pin, forwardUrl) {
  // Construct URL exactly as per the guide
  const params = {
    clientID: PLEX_CLIENT_ID,
    code: pin.code,
    context: {
      device: {
        product: PLEX_PRODUCT,
        platform: 'Windows',
        platformVersion: '10',
        version: PLEX_VERSION
      }
    },
    forwardUrl: forwardUrl
  };

  // Convert params to URL-encoded string
  const queryString = Object.entries(params)
    .map(([key, value]) => {
      if (typeof value === 'object') {
        return Object.entries(value)
          .map(([subKey, subValue]) => {
            if (typeof subValue === 'object') {
              return Object.entries(subValue)
                .map(([subSubKey, subSubValue]) => 
                  `context[${key}][${subKey}][${subSubKey}]=${encodeURIComponent(subSubValue)}`)
                .join('&');
            }
            return `context[${key}][${subKey}]=${encodeURIComponent(subValue)}`;
          })
          .join('&');
      }
      return `${key}=${encodeURIComponent(value)}`;
    })
    .join('&');

  return `https://app.plex.tv/auth#?${queryString}`;
}

async function checkPin(pinId) {
  try {
    const res = await axios.get(`https://plex.tv/api/v2/pins/${pinId}`, {
      headers: plexHeaders
    });
    return res.data;
  } catch (err) {
    // Log the error for debugging
    console.error('Plex checkPin error:', err.response?.data || err.message || err);
    // Return a more helpful error to the frontend
    throw new Error(
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Unknown error from Plex when checking PIN'
    );
  }
}

async function getServers(authToken) {
  const res = await axios.get('https://plex.tv/api/v2/resources?includeHttps=1', {
    headers: {
      ...plexHeaders,
      'X-Plex-Token': authToken,
    }
  });
  return res.data;
}

module.exports = {
  getPin,
  getOauthUrl,
  checkPin,
  getServers
}; 