const express = require('express');
const router = express.Router();
const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../services/logger');
const { loadConfig } = require('../config/configManager');

// Plex section keys cache
let sectionCache = null;

async function getPlexSections(config) {
  const protocol = config.PLEX_SSL ? 'https' : 'http';
  const baseUrl = `${protocol}://${config.PLEX_HOST}:${config.PLEX_PORT}`;
  const token = config.PLEX_TOKEN;
  const url = `${baseUrl}/library/sections?X-Plex-Token=${token}`;
  const res = await axios.get(url, {
    headers: { Accept: 'application/xml' }
  });
  // Log the raw response for debugging
  console.log('[PlexLibrary] Raw response:', res.data);
  const parsed = await xml2js.parseStringPromise(res.data);
  const dirs = parsed.MediaContainer.Directory;

  // Always select the section with title 'Movies' and 'TV Shows'
  const tvSection = dirs.find(d => d.$.type === 'show' && d.$.title === 'TV Shows');
  const movieSection = dirs.find(d => d.$.type === 'movie' && d.$.title === 'Movies');

  return {
    tv: tvSection?.$.key,
    tvPath: tvSection?.Location?.[0]?.$.path,
    movies: movieSection?.$.key,
    moviesPath: movieSection?.Location?.[0]?.$.path,
    baseUrl,
    token
  };
}

router.get('/library', async (req, res) => {
  try {
    const config = await loadConfig();
    if (!config) {
      return res.status(400).json({ error: 'Plex is not configured (no config file).' });
    }
    if (!config.PLEX_HOST || !config.PLEX_PORT || !config.PLEX_TOKEN) {
      return res.status(400).json({ error: 'Plex is not configured.' });
    }
    // Log the config being used
    console.log('[PlexLibrary] Using config:', {
      host: config.PLEX_HOST,
      port: config.PLEX_PORT,
      ssl: config.PLEX_SSL,
      token: config.PLEX_TOKEN && config.PLEX_TOKEN.substring(0, 6) + '...'
    });
    if (!sectionCache) {
      sectionCache = await getPlexSections(config);
    }
    const { baseUrl, token, tv, movies } = sectionCache;
    console.log('[PlexLibrary] baseUrl:', baseUrl, 'tv:', tv, 'movies:', movies);
    const [tvRes, movieRes] = await Promise.all([
      axios.get(`${baseUrl}/library/sections/${tv}/all?X-Plex-Token=${token}`, { headers: { Accept: 'application/xml' } }),
      axios.get(`${baseUrl}/library/sections/${movies}/all?X-Plex-Token=${token}`, { headers: { Accept: 'application/xml' } }),
    ]);

    const tvParsed = await xml2js.parseStringPromise(tvRes.data);
    const movieParsed = await xml2js.parseStringPromise(movieRes.data);

    let tvShows = tvParsed.MediaContainer.Video?.map(show => ({
      title: show.$.title,
      key: show.$.key,
      thumb: `${baseUrl}${show.$.thumb}?X-Plex-Token=${token}`,
      type: 'show'
    })) || [];

    let moviesList = movieParsed.MediaContainer.Video?.map(movie => ({
      title: movie.$.title,
      key: movie.$.key,
      thumb: `${baseUrl}${movie.$.thumb}?X-Plex-Token=${token}`,
      type: 'movie'
    })) || [];

    // --- Pagination, type, and search support ---
    const type = req.query.type; // 'movie' or 'show'
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 50;
    const search = (req.query.search || '').toLowerCase();

    let items = [];
    if (type === 'movie') items = moviesList;
    else if (type === 'show') items = tvShows;
    else items = [...tvShows, ...moviesList];

    if (search) {
      items = items.filter(item => item.title.toLowerCase().includes(search));
    }
    const total = items.length;
    const paged = items.slice(offset, offset + limit);

    res.json({
      results: paged,
      total,
      tvSourcePath: sectionCache.tvPath,
      moviesSourcePath: sectionCache.moviesPath
    });
  } catch (err) {
    // Log the error details
    console.error('[PlexLibrary] Failed to fetch library:', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Failed to fetch library from Plex' });
  }
});

module.exports = router;
