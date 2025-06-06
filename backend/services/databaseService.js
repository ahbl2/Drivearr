const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

class DatabaseService {
    constructor() {
        this.db = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Ensure data directory exists
            const dataDir = path.join(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Initialize database
            const dbPath = path.join(dataDir, 'drivearr.db');
            this.db = new Database(dbPath);
            
            // Enable foreign keys
            this.db.pragma('foreign_keys = ON');
            
            // Read and execute schema
            const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            this.db.exec(schema);

            this.initialized = true;
            logger.info('Database initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize database: ' + formatError(error));
            throw error;
        }
    }

    // Media Items Operations
    async upsertMediaItem(item) {
        const stmt = this.db.prepare(`
            INSERT INTO media_items (plex_key, title, type, thumb_url, metadata)
            VALUES (@plex_key, @title, @type, @thumb_url, @metadata)
            ON CONFLICT(plex_key) DO UPDATE SET
                title = @title,
                thumb_url = @thumb_url,
                metadata = @metadata,
                updated_at = CURRENT_TIMESTAMP
        `);

        return stmt.run(item);
    }

    async getMediaItems(type = null, limit = 100, offset = 0) {
        let query = 'SELECT * FROM media_items';
        const params = [];

        if (type) {
            query += ' WHERE type = ?';
            params.push(type);
        }

        query += ' ORDER BY title LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }

    async searchMediaItems(query, type = null) {
        let sql = 'SELECT * FROM media_items WHERE title LIKE ?';
        const params = [`%${query}%`];

        if (type) {
            sql += ' AND type = ?';
            params.push(type);
        }

        sql += ' ORDER BY title';
        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    // API Cache Operations
    async getCachedResponse(endpoint, params) {
        const stmt = this.db.prepare(`
            SELECT response FROM api_cache 
            WHERE endpoint = ? AND params = ? AND expires_at > CURRENT_TIMESTAMP
        `);
        
        const result = stmt.get(endpoint, JSON.stringify(params));
        return result ? JSON.parse(result.response) : null;
    }

    async cacheResponse(endpoint, params, response, ttlSeconds = 3600) {
        const stmt = this.db.prepare(`
            INSERT INTO api_cache (endpoint, params, response, expires_at)
            VALUES (?, ?, ?, datetime('now', '+' || ? || ' seconds'))
            ON CONFLICT(endpoint, params) DO UPDATE SET
                response = excluded.response,
                created_at = CURRENT_TIMESTAMP,
                expires_at = datetime('now', '+' || ? || ' seconds')
        `);

        return stmt.run(
            endpoint,
            JSON.stringify(params),
            JSON.stringify(response),
            ttlSeconds,
            ttlSeconds
        );
    }

    // Sync History Operations
    async recordSync(mediaId, syncType, status, errorMessage = null) {
        const stmt = this.db.prepare(`
            INSERT INTO sync_history (media_id, sync_type, status, error_message)
            VALUES (?, ?, ?, ?)
        `);

        return stmt.run(mediaId, syncType, status, errorMessage);
    }

    async updateMediaSyncStatus(mediaId, status) {
        const stmt = this.db.prepare(`
            UPDATE media_items 
            SET sync_status = ?, last_synced_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(status, mediaId);
    }

    // Cleanup Operations
    async cleanupExpiredCache() {
        const stmt = this.db.prepare('DELETE FROM api_cache WHERE expires_at <= CURRENT_TIMESTAMP');
        return stmt.run();
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close();
            this.initialized = false;
        }
    }
}

function formatError(error) {
    return error && error.stack ? error.stack : String(error);
}

// Export singleton instance
const databaseService = new DatabaseService();
module.exports = databaseService; 