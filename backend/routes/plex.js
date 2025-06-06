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

        // Get the correct section key for the type
        const sectionKey = await getSectionKeyForType(config, type);
        if (!sectionKey) {
            return res.status(400).json({ error: `No Plex section found for type: ${type}` });
        }

        // Build the Plex API URL
        const protocol = config.PLEX_SSL ? 'https' : 'http';
        const baseUrl = `${protocol}://${config.PLEX_HOST}:${config.PLEX_PORT}`;
        let url = `${baseUrl}/library/sections/${sectionKey}/all?X-Plex-Token=${config.PLEX_TOKEN}`;
        
        // Add search if provided
        if (search) {
            url += `&title=${encodeURIComponent(search)}`;
        }

        // Add pagination
        url += `&X-Plex-Container-Start=${(page - 1) * pageSize}`;
        url += `&X-Plex-Container-Size=${pageSize}`;

        // Fetch from Plex
        const response = await axios.get(url, {
            headers: { Accept: 'application/xml' }
        });

        // Parse the XML response
        const parsed = await xml2js.parseStringPromise(response.data);
        let items = [];
        if (type === 'show') {
            items = parsed.MediaContainer.Directory || [];
        } else {
            items = parsed.MediaContainer.Video || [];
        }

        // Transform the items to match your frontend format
        const results = items.map(item => ({
            key: item.$.ratingKey,
            title: item.$.title,
            type: type,
            thumb_url: item.$.thumb ? `${baseUrl}${item.$.thumb}?X-Plex-Token=${config.PLEX_TOKEN}` : null,
            year: item.$.year,
            summary: item.$.summary,
            // Add any other fields you need
        }));

        // Get total count for pagination
        const totalSize = parseInt(parsed.MediaContainer.$.totalSize) || 0;

        res.json({
            results,
            total: totalSize,
            page,
            pageSize,
            totalPages: Math.ceil(totalSize / pageSize)
        });

    } catch (error) {
        logger.error('Error in /browse route: ' + formatError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
