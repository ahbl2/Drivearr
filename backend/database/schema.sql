-- Media Library Tables
CREATE TABLE IF NOT EXISTS media_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plex_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'movie' or 'show'
    thumb_url TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP,
    sync_status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
    metadata JSON -- Store additional Plex metadata
);

-- TV Show Episodes
CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    show_id INTEGER NOT NULL,
    plex_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    season_number INTEGER,
    episode_number INTEGER,
    thumb_url TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    metadata JSON,
    FOREIGN KEY (show_id) REFERENCES media_items(id) ON DELETE CASCADE
);

-- Sync History
CREATE TABLE IF NOT EXISTS sync_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_id INTEGER NOT NULL,
    sync_type TEXT NOT NULL, -- 'full', 'incremental'
    status TEXT NOT NULL, -- 'success', 'failed'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    FOREIGN KEY (media_id) REFERENCES media_items(id) ON DELETE CASCADE
);

-- Cache for API responses
CREATE TABLE IF NOT EXISTS api_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    params TEXT NOT NULL, -- JSON string of parameters
    response TEXT NOT NULL, -- JSON string of response
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    UNIQUE(endpoint, params)
);

-- Sync Queue (persistent)
CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plex_key TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'movie', 'show', or 'episode'
    season INTEGER,
    episode INTEGER,
    path TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON
);

-- Local Media Index
CREATE TABLE IF NOT EXISTS local_media_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'movie' or 'episode'
    title TEXT NOT NULL,
    season INTEGER,
    episode INTEGER,
    size INTEGER,
    mtime INTEGER,
    hash TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drive Profiles
CREATE TABLE IF NOT EXISTS drive_profiles (
    drive_id TEXT PRIMARY KEY,
    profile_name TEXT NOT NULL,
    profile_label TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

-- Drive History
CREATE TABLE IF NOT EXISTS drive_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drive_id TEXT NOT NULL,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    timestamp TIMESTAMP NOT NULL,
    FOREIGN KEY (drive_id) REFERENCES drive_profiles(drive_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_items_type ON media_items(type);
CREATE INDEX IF NOT EXISTS idx_media_items_sync_status ON media_items(sync_status);
CREATE INDEX IF NOT EXISTS idx_episodes_show_id ON episodes(show_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_media_id ON sync_history(media_id);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at); 