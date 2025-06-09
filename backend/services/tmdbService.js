const axios = require('axios');
const { loadConfig } = require('../config/configManager');

const TMDB_BASE = 'https://api.themoviedb.org/3';

async function getApiKey() {
  const config = await loadConfig();
  return config.TMDB_API_KEY;
}

async function searchMovie(query, year = null) {
  const apiKey = await getApiKey();
  const params = { api_key: apiKey, query };
  if (year) params.year = year;
  const res = await axios.get(`${TMDB_BASE}/search/movie`, { params });
  return res.data.results;
}

async function searchTV(query, first_air_date_year = null) {
  const apiKey = await getApiKey();
  const params = { api_key: apiKey, query };
  if (first_air_date_year) params.first_air_date_year = first_air_date_year;
  const res = await axios.get(`${TMDB_BASE}/search/tv`, { params });
  return res.data.results;
}

async function getMovieDetails(id) {
  const apiKey = await getApiKey();
  const res = await axios.get(`${TMDB_BASE}/movie/${id}`, { params: { api_key: apiKey } });
  return res.data;
}

async function getTVDetails(id) {
  const apiKey = await getApiKey();
  const res = await axios.get(`${TMDB_BASE}/tv/${id}`, { params: { api_key: apiKey } });
  return res.data;
}

async function getEpisodeDetails(tvId, season, episode) {
  const apiKey = await getApiKey();
  const res = await axios.get(`${TMDB_BASE}/tv/${tvId}/season/${season}/episode/${episode}`, { params: { api_key: apiKey } });
  return res.data;
}

module.exports = {
  searchMovie,
  searchTV,
  getMovieDetails,
  getTVDetails,
  getEpisodeDetails
}; 