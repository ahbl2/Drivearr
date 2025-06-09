# Drive Management & Sync Awareness Roadmap

## Summary
This feature adds robust drive management and sync awareness to Drivearr. The app will scan the attached drive for existing movies and TV shows, compare its contents to the local library, and intelligently determine which items are already present ("Complete") and which are missing content ("Partial"). Users can view, manage, and sync their drive contents from a new Drive page in the UI. The system supports live/auto scanning, bulk actions, and provides clear status and management tools for the sync drive.

Key capabilities:
- Scan the attached drive for existing media and keep the index up to date in real time.
- Mark movies/shows as "Complete" if fully present, or "Partial" if missing seasons/episodes.
- Allow syncing only missing content for partial shows.
- Enable deletion of any movie or show from the drive.
- Provide a dedicated Drive page with status, health, and management tools.
- Move drive selection/attachment UI to the Drive page for better UX.
- Support bulk actions, drive health info, sync history, and safe eject (optional).

---

## Checklist

### Backend
- [x] Drive scanning/indexing logic
- [x] Compare drive contents to local index (Complete/Partial)
- [x] API: Get drive contents (movies, shows, episodes)
- [x] API: Add missing content to sync queue
- [x] API: Delete movie/show from drive
- [x] API: Get drive status (attached, space, health)
- [x] API: Manual rescan endpoint
- [x] Accurate, cross-platform disk space reporting
- [x] API: Get drive sync history (by drive)
- [x] API: List all known drives/profiles

### Frontend
- [x] Sidebar: Add "Drive" link
- [x] Drive page: Drive status/attachment UI
- [x] Drive page: List/table of movies and TV shows
- [x] Drive page: "Partial"/"Complete" indicators for TV shows
- [x] Drive page: Sync missing content button
- [x] Drive page: Delete button for movie/show
- [x] Drive page: Manual rescan button
- [x] Drive page: Bulk actions (optional)
- [ ] Drive page: Sync history/log (optional)
- [ ] Drive page: Drive health/space info
- [ ] Drive page: Safe eject button (optional)

### Live/Auto Scanning
- [ ] Implement live scanning for drive
- [ ] Real-time UI updates

### Polish & UX
- [ ] Error handling for drive issues
- [ ] UI/UX polish and user feedback
- [ ] Documentation update

---

## Drive History & Profile Management
- [ ] **Manifest File Structure**
  - [ ] Define manifest file structure (e.g., `.drivearr-manifest.json`) to include:
    - Drive unique ID (generated and persisted)
    - Drive profile info (name, user label, creation date, etc.)
    - History of synced items (with timestamps, types, source info, etc.)
    - Optionally, last sync status and errors
- [ ] **Update Sync Logic to Write Manifest**
  - [ ] Locate the sync logic where files are copied to the drive
  - [ ] Add logic to write or update the manifest file after each sync
  - [ ] Ensure robust, atomic writing of the manifest file
- [ ] **Integrate Manifest Reading into Drive Connection Logic**
  - [ ] Read manifest file when a drive is connected
  - [ ] Log manifest details for debugging and user feedback
- [ ] **Store Drive Profiles and History in Local Database**
  - [x] Implement logic to store drive profiles and history in the local database
  - [x] Ensure robust error handling and logging

---

## Drive History & Profile Management (Next Major Focus)

### Backend
- [ ] Write a manifest/history file to the drive after each sync
- [ ] Read manifest/history file when drive is connected
- [ ] Store drive profiles/history in local database
- [ ] API: Get drive sync history (by drive)
- [ ] API: List all known drives/profiles
- [ ] API: Manually assign a drive to a known profile
- [ ] API: Delete a drive profile/history

### Frontend
- [ ] Sidebar: Add "Drive History" under Drive
- [ ] Drive History page: List/table of synced movies and TV shows for the current drive
- [ ] Drive History page: Filter/search by title, type, date
- [ ] Drive History page: Show drive info (label, ID, last sync, etc.)
- [ ] Drive History page: Manual profile selection if drive not auto-detected
- [ ] Drive History page: Delete drive profile/history
- [ ] UI polish and feedback

### Polish & UX
- [ ] Error handling for missing/corrupt manifest/history files
- [ ] User feedback for drive recognition and profile management

---

**Note:**
- Delete buttons for movies/shows and the manual rescan button are now available in the Drive page UI.
- Next major focus: Drive sync history/log, drive profile management, and Drive History page. 