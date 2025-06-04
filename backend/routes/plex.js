const express = require('express');
const router = express.Router();
const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../services/logger');

const { PLEX_BASE_URL, PLEX_TOKEN } = process.env;

// Plex section keys cache
let sectionCache = null;

async function getPlexSections() {
  const url = `${PLEX_BASE_URL}/library/sections?X-Plex-Token=${PLEX_TOKEN}`;
  const res = await axios.get(url);
  const parsed = await xml2js.parseStringPromise(res.data);
  const dirs = parsed.MediaContainer.Directory;

  const tvSection = dirs.find(d => d.$.type === 'show');
  const movieSection = dirs.find(d => d.$.type === 'movie');

  return {
    tv: tvSection?.$.key,
    movies: movieSection?.$.key,
  };
}

router.get('/library', async (req, res) => {
  try {
    if (!sectionCache) {
      sectionCache = await getPlexSections();
    }

    const [tvRes, movieRes] = await Promise.all([
      axios.get(`${PLEX_BASE_URL}/library/sections/${sectionCache.tv}/all?X-Plex-Token=${PLEX_TOKEN}`),
      axios.get(`${PLEX_BASE_URL}/library/sections/${sectionCache.movies}/all?X-Plex-Token=${PLEX_TOKEN}`),
    ]);

    const tvParsed = await xml2js.parseStringPromise(tvRes.data);
    const movieParsed = await xml2js.parseStringPromise(movieRes.data);

    const tvShows = tvParsed.MediaContainer.Video?.map(show => ({
      title: show.$.title,
      key: show.$.key,
      thumb: `${PLEX_BASE_URL}${show.$.thumb}?X-Plex-Token=${PLEX_TOKEN}`,
      type: 'show'
    })) || [];

    const movies = movieParsed.MediaContainer.Video?.map(movie => ({
      title: movie.$.title,
      key: movie.$.key,
      thumb: `${PLEX_BASE_URL}${movie.$.thumb}?X-Plex-Token=${PLEX_TOKEN}`,
      type: 'movie'
    })) || [];

    res.json({ tvShows, movies });
  } catch (err) {
    logger.error('Plex library error:', err);
    res.status(500).json({ error: 'Failed to fetch library from Plex' });
  }
});

module.exports = router;
