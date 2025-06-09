const axios = require('axios');
const logger = require('./logger');

async function getPlexFileInfo(plexKey, options) {
  const { plexHost, plexPort, plexToken, plexSSL } = options;
  const protocol = plexSSL ? 'https' : 'http';
  const url = `${protocol}://${plexHost}:${plexPort}/library/metadata/${plexKey}?X-Plex-Token=${plexToken}`;

  try {
    const response = await axios.get(url, { headers: { Accept: 'application/xml' } });
    const media = response.data.MediaContainer.Video[0].Media[0].Part[0];
    return {
      filePath: media.$.file,
      size: parseInt(media.$.size, 10),
      duration: parseInt(media.$.duration, 10),
      container: media.$.container,
      videoCodec: media.$.videoCodec,
      audioCodec: media.$.audioCodec
    };
  } catch (err) {
    logger.error(`Failed to get Plex file info for key ${plexKey}: ${err.message}`);
    throw new Error(`Failed to get Plex file info: ${err.message}`);
  }
}

module.exports = {
  getPlexFileInfo
}; 