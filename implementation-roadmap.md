# Drivearr Metadata & Sync Implementation Roadmap

## **Goal**
Transition Drivearr from relying solely on Plex for metadata and file paths to a robust, Sonarr/Radarr-style system:
- Scan user-specified media folders for real files
- Fetch and match metadata from online sources (TheTVDB, TMDb, etc.)
- Retain Plex integration for recent items and server-specific info

---

## **Roadmap & Checklist**

### 1. **Research & Reference**
- [x] Review Sonarr's and Radarr's code for:
  - Folder scanning/indexing
  - Metadata fetching (TheTVDB, TMDb, etc.)
  - File-to-metadata matching logic
  - **Summary:**
    - Sonarr lets users specify "Root Folders" for TV/Movies, then recursively scans these folders for media files.
    - It uses robust filename parsing and folder structure (see `/Sonarr-5-develop/src/NzbDrone.Core/Parser/` and `/MediaFiles/`) to match files to shows/episodes.
    - Sonarr maintains a local database/index of all files and their matched metadata.
    - Metadata is fetched from online sources (TheTVDB, TMDb) and matched to local files.
    - Best practice: always let the user specify root folders, build a local index, and use strong filename parsing/matching logic.
- [ ] Identify best open-source libraries/APIs for metadata (e.g., [TMDb API](https://www.themoviedb.org/documentation/api), [TheTVDB API](https://thetvdb.github.io/v4-api/))

### 2. **Media Folder Configuration**
- [x] UI: Let users specify one or more media root folders (Movies, TV, etc.)
- [x] Backend: Store and manage these paths

**Summary:**
- Users can now add TV Show and Movie folders via the settings UI, including browsing for folders using a folder picker dialog. The backend stores these paths separately for TV and Movies.

*Next step: Begin local media scanning and indexing logic.*

### 3. **Local Media Scanning**
- [x] Recursively scan configured folders for media files
- [x] Build a local index (filename, size, date, etc.)
- [x] Detect new, moved, or deleted files

**Summary:**
- Real-time file watching is implemented using chokidar. The backend instantly updates the local media index for new, changed, or deleted files in all configured folders.
- The index is always up-to-date on startup, and whenever folders are added or removed.

*Next step: Metadata Fetching & Matching.*

### 4. **Metadata Fetching & Matching**
- [x] For each file, attempt to match to online metadata (by filename, folder, etc.)
- [x] Store matched metadata (title, year, poster, summary, etc.)
- [x] Handle ambiguous or unmatched files (UI for manual match?)
- [x] Reference Sonarr's matching logic for best practices

**Summary:**
- Improved fuzzy matching using string-similarity, year/season/episode logic, and parent folder for TV.
- Modal dialog UI for manual correction of unmatched files, with instant backend update.

*Next step: UI integration (show local library, add to sync queue, etc.).*

### 5. **UI Integration**
- [x] Show local library using matched metadata (not just Plex)
- [ ] Allow adding to sync queue using real file paths
- [ ] Show unmatched files and allow user to match/correct

**Summary:**
- Plex/Local toggle now available on all library pages (dashboard, TV, Movies), with seamless UI and data source swap. Users can browse their local indexed library or Plex library with a single click.

*Next: sync queue integration, etc.*

### 6. **Retain Plex Integration**
- [ ] Keep Plex API integration for:
    - Recent items (e.g., 20 most recently added)
    - Server-specific info (e.g., on library dashboard)
- [ ] Allow toggling between Plex and local/online metadata views

### 7. **Sync Logic**
- [ ] When syncing, use the real file path from the local index
- [ ] Ensure robust error handling if files are moved/deleted

### 8. **Testing & Migration**
- [ ] Test with various folder structures and platforms (Windows, Unraid, Docker)
- [ ] Provide migration guide for users switching from Plex-only to hybrid/local

---

## **References**
- Sonarr source: `/Sonarr-5-develop/`
- [Sonarr Docs](https://github.com/Sonarr/Sonarr/wiki)
- [Radarr Docs](https://wiki.servarr.com/Radarr)
- [TMDb API](https://www.themoviedb.org/documentation/api)
- [TheTVDB API](https://thetvdb.github.io/v4-api/)

---

## **Notes**
- Keep Plex code for future/optional use (recent items, server info, etc.)
- Prioritize robust matching and user control over automation
- Use Sonarr/Radarr as reference for best practices in scanning, matching, and metadata management

---

**Checklist Progress:**
- [x] Research: Sonarr/Radarr folder scanning/indexing and matching logic
- [ ] Research: Best metadata APIs
- [x] Folder config UI
- [x] Backend: Store and manage these paths
- [x] Local scan/index
- [x] Metadata fetch/match
- [x] UI integration
- [ ] Plex integration retained
- [ ] Sync logic updated
- [ ] Migration tested 