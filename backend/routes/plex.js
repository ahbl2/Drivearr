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

  // Log all available Plex library sections (title and type) with clear markers
  console.log('[PlexLibrary] === Available Plex Library Sections ===');
  dirs.forEach(d => {
    console.log(`[PlexLibrary] Section: Title="${d.$.title}", Type="${d.$.type}"`);
  });
  console.log('[PlexLibrary] === End of Section List ===');

  // More robust: find TV and Movie sections by type, prefer title match but fallback to first of type
  const tvSection =
    dirs.find(d => d.$.type === 'show' && d.$.title.toLowerCase() === 'tv shows') ||
    dirs.find(d => d.$.type === 'show');
  const movieSection =
    dirs.find(d => d.$.type === 'movie' && d.$.title.toLowerCase() === 'movies') ||
    dirs.find(d => d.$.type === 'movie');

  // Log detected section keys and titles
  console.log('[PlexLibrary] Detected TV section:', tvSection?.$.key, tvSection?.$.title);
  console.log('[PlexLibrary] Detected Movie section:', movieSection?.$.key, movieSection?.$.title);

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

    // Error handling for missing section keys
    if (!tv) {
      return res.status(500).json({ error: 'Could not find a TV Shows section in Plex.' });
    }
    if (!movies) {
      return res.status(500).json({ error: 'Could not find a Movies section in Plex.' });
    }

    // --- Pagination, type, and search support ---
    const type = req.query.type; // 'movie' or 'show'
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 50;
    const search = (req.query.search || '').toLowerCase();
    const startsWith = (req.query.startsWith || '').toLowerCase();

    // If startsWith is provided, fetch all items without pagination
    const shouldPaginate = !startsWith;
    const effectiveLimit = shouldPaginate ? limit : 999999;
    const effectiveOffset = shouldPaginate ? offset : 0;

    // Use Plex's built-in pagination for fast loading
    const [tvRes, movieRes] = await Promise.all([
      axios.get(`${baseUrl}/library/sections/${tv}/all?X-Plex-Token=${token}&X-Plex-Container-Start=${effectiveOffset}&X-Plex-Container-Size=${effectiveLimit}`,
        { headers: { Accept: 'application/xml' } }),
      axios.get(`${baseUrl}/library/sections/${movies}/all?X-Plex-Token=${token}&X-Plex-Container-Start=${effectiveOffset}&X-Plex-Container-Size=${effectiveLimit}`,
        { headers: { Accept: 'application/xml' } }),
    ]);

    // Make a separate request for the total count (no items, just the count)
    let total = 0;
    if (type === 'movie') {
      const totalRes = await axios.get(
        `${baseUrl}/library/sections/${movies}/all?X-Plex-Token=${token}&X-Plex-Container-Start=0&X-Plex-Container-Size=0`,
        { headers: { Accept: 'application/xml' } }
      );
      const totalParsed = await xml2js.parseStringPromise(totalRes.data);
      console.log('[PlexLibrary] Movie total response:', totalParsed.MediaContainer);
      total = parseInt(
        (totalParsed.MediaContainer.$ && (totalParsed.MediaContainer.$.totalSize || totalParsed.MediaContainer.$.size)) ||
        totalParsed.MediaContainer.totalSize ||
        totalParsed.MediaContainer.size ||
        0
      );
    } else if (type === 'show') {
      const totalRes = await axios.get(
        `${baseUrl}/library/sections/${tv}/all?X-Plex-Token=${token}&X-Plex-Container-Start=0&X-Plex-Container-Size=0`,
        { headers: { Accept: 'application/xml' } }
      );
      const totalParsed = await xml2js.parseStringPromise(totalRes.data);
      console.log('[PlexLibrary] TV total response:', totalParsed.MediaContainer);
      total = parseInt(
        (totalParsed.MediaContainer.$ && (totalParsed.MediaContainer.$.totalSize || totalParsed.MediaContainer.$.size)) ||
        totalParsed.MediaContainer.totalSize ||
        totalParsed.MediaContainer.size ||
        0
      );
    } else {
      // Both
      const [tvTotalRes, movieTotalRes] = await Promise.all([
        axios.get(`${baseUrl}/library/sections/${tv}/all?X-Plex-Token=${token}&X-Plex-Container-Start=0&X-Plex-Container-Size=0`,
          { headers: { Accept: 'application/xml' } }),
        axios.get(`${baseUrl}/library/sections/${movies}/all?X-Plex-Token=${token}&X-Plex-Container-Start=0&X-Plex-Container-Size=0`,
          { headers: { Accept: 'application/xml' } })
      ]);
      const tvTotalParsed = await xml2js.parseStringPromise(tvTotalRes.data);
      const movieTotalParsed = await xml2js.parseStringPromise(movieTotalRes.data);
      console.log('[PlexLibrary] TV total response:', tvTotalParsed.MediaContainer);
      console.log('[PlexLibrary] Movie total response:', movieTotalParsed.MediaContainer);
      const tvTotal = parseInt(
        (tvTotalParsed.MediaContainer.$ && (tvTotalParsed.MediaContainer.$.totalSize || tvTotalParsed.MediaContainer.$.size)) ||
        tvTotalParsed.MediaContainer.totalSize ||
        tvTotalParsed.MediaContainer.size ||
        0
      );
      const movieTotal = parseInt(
        (movieTotalParsed.MediaContainer.$ && (movieTotalParsed.MediaContainer.$.totalSize || movieTotalParsed.MediaContainer.$.size)) ||
        movieTotalParsed.MediaContainer.totalSize ||
        movieTotalParsed.MediaContainer.size ||
        0
      );
      total = tvTotal + movieTotal;
    }

    const tvParsed = await xml2js.parseStringPromise(tvRes.data);
    const movieParsed = await xml2js.parseStringPromise(movieRes.data);

    let tvShows = [];
    if (tvParsed.MediaContainer.Directory) {
      tvShows = tvParsed.MediaContainer.Directory.map(show => ({
        title: show.$.title,
        key: show.$.key,
        thumb: show.$.thumb ? `${baseUrl}${show.$.thumb}?X-Plex-Token=${token}` : '',
        type: 'show'
      }));
    } else if (tvParsed.MediaContainer.Video) {
      tvShows = tvParsed.MediaContainer.Video.map(show => ({
        title: show.$.title,
        key: show.$.key,
        thumb: show.$.thumb ? `${baseUrl}${show.$.thumb}?X-Plex-Token=${token}` : '',
        type: 'show'
      }));
    }

    let moviesList = movieParsed.MediaContainer.Video?.map(movie => ({
      title: movie.$.title,
      key: movie.$.key,
      thumb: movie.$.thumb ? `${baseUrl}${movie.$.thumb}?X-Plex-Token=${token}` : '',
      type: 'movie'
    })) || [];

    let items = [];
    if (type === 'movie') items = moviesList;
    else if (type === 'show') items = tvShows;
    else items = [...tvShows, ...moviesList];

    // Filter by search if needed
    if (search) {
      items = items.filter(item => item.title && item.title.toLowerCase().includes(search));
    }
    // Filter by first letter if startsWith is set
    if (startsWith) {
      if (startsWith === '#') {
        // Show items that start with a number
        items = items.filter(item => item.title && /^[0-9]/.test(item.title));
      } else {
        items = items.filter(item => item.title && item.title[0].toLowerCase() === startsWith);
      }
    }
    // No in-memory slice needed, Plex already paginates
    const paged = items;

    // Fallback if total is 0, NaN, or missing (must be after items is defined)
    if (!total || isNaN(total)) {
      total = items.length;
      console.log('[PlexLibrary] Fallback to items.length for total:', total);
    }

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
