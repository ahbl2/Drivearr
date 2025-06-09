# Drivearr: Hybrid Media Management (Plex + Local)

**Drivearr** is a self-hosted sync tool and media management app that lets you copy movies and TV shows from your Plex library or local folders to external USB drives — perfect for offline access, sharing with friends, or portable viewing. Now with robust local indexing, metadata matching, and continued Plex integration for recent items and server info.

---

## ⚙️ Features
- **Hybrid Library:** Browse and manage both Plex and local media libraries.
- **Real File Path Sync:** Sync queue uses actual file paths from your local index.
- **Metadata Matching:** Fetches and matches metadata from TMDb, TheTVDB, etc.
- **Manual Matching:** UI for correcting unmatched files.
- **Plex Integration:** Retain recent items and server info from Plex.
- **Robust Error Handling:** Retry failed syncs, clear completed, and detailed status/errors.
- 🔍 Browse your Plex library with posters
- ✅ Select full shows, seasons, or episodes
- 🔄 Detect existing USB content and sync only what's missing
- 💾 Saves sync history per drive with `.drivearr-manifest.json`
- 🧠 Smart matching of Plex content to USB structure
- 📁 Respects Plex naming/folder conventions
- 🖥️ Runs on Unraid or any Docker-capable system
- 🌙 Built-in dark mode UI
- 📊 Drive History & Profile Management: Track sync history and manage drive profiles

---

## 🚀 Setup

### Option 1: Local (npm/yarn)
1. Clone/download the Drivearr repository.
2. Install dependencies: `npm install` (or `yarn`)
3. Start the backend: `npm run start:backend`
4. Start the frontend: `npm run start:frontend`
5. Access the app at [http://localhost:5173](http://localhost:5173)

### Option 2: Docker
```bash
# Build & run via Docker
# Adjust volume paths as needed for your system

docker build -t drivearr .
docker run -d \
  --name drivearr \
  -p 3000:3000 \
  --restart unless-stopped \
  -v "/mnt/user/media/plex media/Media/TV Shows:/plex/tv" \
  -v "/mnt/user/media/plex media/Media/Movies:/plex/movies" \
  -v "/mnt/disks:/usbdrives" \
  drivearr
```
Open `http://<your-server-ip>:3000` in your browser.

---

## 📁 Project Structure
- `backend/` – Node.js Express API + Plex sync engine
- `frontend/` – Vue 3 interface (served via Vite)
- `config/config.json` – App settings (automatically created)
- `.drivearr-manifest.json` – USB-level sync manifest

---

## Setup & Configuration

### 1. Initial Configuration
- **Add Media Folders:**
  - Go to **Settings** > **Media Folders**.
  - Add root folders for Movies and TV Shows.
- **Connect Plex:**
  - Enter your Plex server details and authenticate.
  - Select Plex sections for Movies and TV Shows.

### 2. Folder Scanning & Indexing
- Drivearr will scan all configured folders recursively and build a local index.
- Real-time updates: New, moved, or deleted files are detected instantly.
- View the local index in the **Library** or **Settings**.

### 3. Metadata Fetching & Matching
- Metadata is fetched from TMDb, TheTVDB, etc.
- Files are matched using filename, folder structure, and fuzzy logic.
- Unmatched files are shown in the UI with a "No Match" badge.
- Use the manual match dialog to correct unmatched files.

---

## Syncing Media
- Add items to the sync queue from either Plex or local views.
- The sync queue uses real file paths from your local index.
- Start sync to copy files to your external drive.
- Progress, errors, and status are shown in real time.
- Retry failed syncs and clear completed items from the queue.
- Drive status is checked automatically; errors are shown if the drive is missing or full.

---

## Plex Integration
- Plex is used for recent items and server info.
- Toggle between Plex and local/online metadata views in the UI.
- Plex is no longer the source of truth for file paths, but remains for activity and server data.

---

## Drive History & Profile Management
- **Manifest File:** Each drive has a `.drivearr-manifest.json` file that tracks sync history and profile info.
- **Drive History:** View a history of synced items, including timestamps, types, and status.
- **Profile Management:** Assign and manage drive profiles with custom labels and names.
- **UI Integration:** Access drive history and profile management from the Drive History page.

---

## Migration Guide: Plex-only → Hybrid/Local

### Before You Begin
- **Backup** your Plex library and Drivearr data.
- Note: File path handling and sync logic have changed; review new features in this guide.

### Migration Steps
1. **Upgrade Drivearr** to the latest version.
2. **Configure local media folders** in Settings.
3. **Allow initial scan and metadata fetch** to complete.
4. **Verify local index**: Check that all media is detected and matched.
5. **Test sync queue**: Add items from both Plex and local views, and perform a test sync.
6. **Review unmatched files**: Use the UI to manually match any remaining files.
7. **Retain Plex integration**: Confirm recent items and server info are still available.

### Troubleshooting
- **Missing files:** Ensure folders are correctly configured and accessible.
- **Unmatched media:** Use the manual match UI to correct.
- **Sync errors:** Check drive status, file permissions, and retry failed items.
- **Logs:** Check backend logs for detailed error messages.

---

## Best Practices & Tips
- Use clear, consistent folder structures for best matching.
- Regularly update metadata and scan for new files.
- Use the manual match UI for edge cases.
- Keep Plex credentials up to date for recent items.

---

## FAQ
- **Can I use only local or only Plex?**
  - Yes, but hybrid mode is recommended for best results.
- **What happens if I move or rename files?**
  - Drivearr will detect changes and update the index automatically.
- **How do I migrate my sync queue?**
  - The queue is now based on real file paths; simply re-add items as needed.

---

## 🔧 Roadmap
- Friend-specific profiles
- Scheduled syncs
- File integrity check (hashes)
- Drag-and-drop USB drive detection

---

## References
- [Sonarr Docs](https://github.com/Sonarr/Sonarr/wiki)
- [Radarr Docs](https://wiki.servarr.com/Radarr)
- [TMDb API](https://www.themoviedb.org/documentation/api)
- [TheTVDB API](https://thetvdb.github.io/v4-api/)

---

## Support
- For issues, open a GitHub issue or check the logs for troubleshooting tips.

> 🧑‍💻 Contributed by [your name here]. Built for private/offline use. Not affiliated with Plex, Sonarr, or Radarr.
