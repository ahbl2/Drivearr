const express = require('express');
const router = express.Router();
const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../services/logger');
const { loadConfig } = require('../config/configManager');
const databaseService = require('../services/databaseService');

// Plex section keys cache
let sectionCache = null;

async function getPlexSections(config) {
    // Try to get from database cache first
    const cachedResponse = await databaseService.getCachedResponse(
        '/library/sections',
        { token: config.PLEX_TOKEN }
    );

    if (cachedResponse) {
        const parsed = await xml2js.parseStringPromise(cachedResponse);
        return parsed.MediaContainer.Directory;
    }

    // If not in cache, fetch from Plex
    const protocol = config.PLEX_SSL ? 'https' : 'http';
    const baseUrl = `${protocol}://${config.PLEX_HOST}:${config.PLEX_PORT}`;
    const url = `${baseUrl}/library/sections?X-Plex-Token=${config.PLEX_TOKEN}`;
    
    const res = await axios.get(url, {
        headers: { Accept: 'application/xml' }
    });

    // Cache the response
    await databaseService.cacheResponse(
        '/library/sections',
        { token: config.PLEX_TOKEN },
        res.data,
        3600 // 1 hour cache
    );

    const parsed = await xml2js.parseStringPromise(res.data);
    return parsed.MediaContainer.Directory;
}

function formatError(error) {
    return error && error.stack ? error.stack : String(error);
}

// Endpoint to get all Plex sections
router.get('/sections', async (req, res) => {
    try {
        const config = await loadConfig();
        if (!config) {
            return res.status(400).json({ error: 'Plex is not configured (no config file).' });
        }
        if (!config.PLEX_HOST || !config.PLEX_PORT || !config.PLEX_TOKEN) {
            return res.status(400).json({ error: 'Plex is not configured.' });
        }
        const sections = await getPlexSections(config);
        res.json(sections);
    } catch (error) {
        logger.error('Error in /sections route: ' + formatError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper to get the correct section key for a type
async function getSectionKeyForType(config, type) {
    if (type === 'movie' && config.PLEX_MOVIES_SECTION_KEY) return config.PLEX_MOVIES_SECTION_KEY;
    if (type === 'show' && config.PLEX_SHOWS_SECTION_KEY) return config.PLEX_SHOWS_SECTION_KEY;
    const sections = await getPlexSections(config);
    const section = sections.find(s => s.$.type === type);
    return section ? section.$.key : null;
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

        const type = req.query.type; // 'movie' or 'show'
        const search = (req.query.search || '').toLowerCase();
        const startsWith = (req.query.startsWith || '').toLowerCase();

        // Only get from database
        let items;
        if (search) {
            items = await databaseService.searchMediaItems(search, type);
        } else if (startsWith) {
            items = await databaseService.getMediaItems(type);
            if (startsWith === '#') {
                items = items.filter(item => /^[0-9]/.test(item.title));
            } else {
                items = items.filter(item => item.title[0].toLowerCase() === startsWith);
            }
        } else {
            items = await databaseService.getMediaItems(type);
        }

        // Apply filters (redundant, but keep for safety)
        if (search) {
            items = items.filter(item => item.title.toLowerCase().includes(search));
        }
        if (startsWith) {
            if (startsWith === '#') {
                items = items.filter(item => /^[0-9]/.test(item.title));
            } else {
                items = items.filter(item => item.title[0].toLowerCase() === startsWith);
            }
        }

        res.json({
            results: items,
            total: items.length
        });
    } catch (error) {
        logger.error('Error in /library route: ' + formatError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/browse', async (req, res) => {
    try {
        const config = await loadConfig();
        if (!config) {
            return res.status(400).json({ error: 'Plex is not configured (no config file).' });
        }
        if (!config.PLEX_HOST || !config.PLEX_PORT || !config.PLEX_TOKEN) {
            return res.status(400).json({ error: 'Plex is not configured.' });
        }

        const type = req.query.type; // 'movie' or 'show'
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 50;
        const recent = req.query.recent === 'true';

        // Get the correct section key for the type
        const sectionKey = await getSectionKeyForType(config, type);
        if (!sectionKey) {
            return res.status(400).json({ error: `No Plex section found for type: ${type}` });
        }

        // Build the Plex API URL
        const protocol = config.PLEX_SSL ? 'https' : 'http';
        const baseUrl = `${protocol}://${config.PLEX_HOST}:${config.PLEX_PORT}`;
        let url;
        if (recent) {
            url = `${baseUrl}/library/sections/${sectionKey}/recentlyAdded?X-Plex-Token=${config.PLEX_TOKEN}`;
        } else {
            url = `${baseUrl}/library/sections/${sectionKey}/all?X-Plex-Token=${config.PLEX_TOKEN}`;
        }
        // Add search if provided (only works for /all)
        if (search && !recent) {
            url += `&title=${encodeURIComponent(search)}`;
        }
        // Add pagination
        let effectivePageSize = pageSize;
        const startsWith = (req.query.startsWith || '').toUpperCase();
        if (startsWith) {
            effectivePageSize = 10000; // fetch a large number to ensure all matches
        }
        url += `&X-Plex-Container-Start=0`;
        url += `&X-Plex-Container-Size=${effectivePageSize}`;

        // Log for debugging
        if (recent) {
            console.log(`[Plex /browse] sectionKey: ${sectionKey}, type: ${type}, url: ${url}`);
        }

        // Fetch from Plex
        const response = await axios.get(url, {
            headers: { Accept: 'application/xml' }
        });

        // Parse the XML response
        const parsed = await xml2js.parseStringPromise(response.data);
        let items = [];
        if (recent) {
            // recentlyAdded returns a mix of types
            let allItems = [];
            if (parsed.MediaContainer.Video) {
                allItems = allItems.concat(parsed.MediaContainer.Video);
            }
            if (parsed.MediaContainer.Directory) {
                allItems = allItems.concat(parsed.MediaContainer.Directory);
            }
            if (type === 'movie') {
                items = allItems.filter(item => item.$.type === 'movie');
                // Sort by addedAt if available (descending)
                items.sort((a, b) => {
                    const aTime = parseInt(a.$.addedAt || a.$.added_at || 0);
                    const bTime = parseInt(b.$.addedAt || b.$.added_at || 0);
                    return bTime - aTime;
                });
                items = items.slice(0, pageSize);
            } else if (type === 'show') {
                // Paginate through recentlyAdded to find 20 unique series
                const seen = new Set();
                let shows = [];
                let start = 0;
                const batchSize = 100;
                let more = true;
                while (shows.length < pageSize && more) {
                    let batchUrl = `${baseUrl}/library/sections/${sectionKey}/recentlyAdded?X-Plex-Token=${config.PLEX_TOKEN}`;
                    batchUrl += `&X-Plex-Container-Start=${start}`;
                    batchUrl += `&X-Plex-Container-Size=${batchSize}`;
                    const batchResponse = await axios.get(batchUrl, { headers: { Accept: 'application/xml' } });
                    const batchParsed = await xml2js.parseStringPromise(batchResponse.data);
                    let episodes = [];
                    if (batchParsed.MediaContainer.Video) {
                        episodes = episodes.concat(batchParsed.MediaContainer.Video.filter(item => item.$.type === 'episode'));
                    }
                    // Sort by addedAt if available (descending)
                    episodes.sort((a, b) => {
                        const aTime = parseInt(a.$.addedAt || a.$.added_at || 0);
                        const bTime = parseInt(b.$.addedAt || b.$.added_at || 0);
                        return bTime - aTime;
                    });
                    for (const ep of episodes) {
                        const showKey = ep.$.grandparentRatingKey;
                        if (showKey && !seen.has(showKey)) {
                            seen.add(showKey);
                            shows.push({
                                key: showKey,
                                title: ep.$.grandparentTitle,
                                type: 'show',
                                thumb_url: ep.$.grandparentThumb ? `${baseUrl}${ep.$.grandparentThumb}?X-Plex-Token=${config.PLEX_TOKEN}` : null,
                                year: ep.$.grandparentYear,
                                summary: ep.$.grandparentSummary || '',
                            });
                        }
                        if (shows.length >= pageSize) break;
                    }
                    // If we got less than batchSize, there are no more episodes
                    if (episodes.length < batchSize) {
                        more = false;
                    }
                    start += batchSize;
                }
                items = shows;
            }
        } else {
            if (type === 'show') {
                items = parsed.MediaContainer.Directory || [];
            } else {
                items = parsed.MediaContainer.Video || [];
            }
        }

        // Transform the items to match your frontend format
        let results;
        if (recent && type === 'show') {
            // Already processed as custom show objects
            results = items;
        } else {
            results = items.map(item => ({
                key: item.$.ratingKey,
                title: item.$.title,
                type: type,
                thumb_url: item.$.thumb ? `${baseUrl}${item.$.thumb}?X-Plex-Token=${config.PLEX_TOKEN}` : null,
                year: item.$.year,
                summary: item.$.summary,
                // Add any other fields you need
            }));
            // Apply startsWith filtering if present
            if (startsWith) {
                results = results.filter(item => {
                    if (!item.title || typeof item.title !== 'string') return false;
                    const firstChar = item.title.trim()[0] || '';
                    if (startsWith === '#') {
                        return /^[0-9]/.test(firstChar);
                    } else if (startsWith === '*') {
                        return !/^[A-Z0-9]/i.test(firstChar);
                    } else if (/^[A-Z]$/.test(startsWith)) {
                        return firstChar.toUpperCase() === startsWith;
                    }
                    return false;
                });
            }
        }

        // Get total count for pagination
        const totalSize = parseInt(parsed.MediaContainer.$.totalSize) || 0;

        res.json({
            results,
            total: results.length,
            page,
            pageSize,
            totalPages: Math.ceil(results.length / pageSize)
        });

    } catch (error) {
        logger.error('Error in /browse route: ' + formatError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
