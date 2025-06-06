const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('./logger');
const databaseService = require('./databaseService');
const { loadConfig } = require('../config/configManager');

function formatError(error) {
    return error && error.stack ? error.stack : String(error);
}

class SyncService {
    constructor() {
        this.config = null;
    }

    async initialize() {
        try {
            this.config = await loadConfig();
            if (!this.config) {
                throw new Error('Plex configuration not found');
            }
            logger.info('Sync service initialized');
        } catch (error) {
            logger.error('Failed to initialize sync service: ' + formatError(error));
            throw error;
        }
    }
}

// Export singleton instance
const syncService = new SyncService();
module.exports = syncService; 