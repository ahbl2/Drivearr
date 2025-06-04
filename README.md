# Drivearr

**Drivearr** is a self-hosted sync tool that lets you copy movies and TV shows from your Plex library to external USB drives — perfect for offline access, sharing with friends, or portable viewing.

## ⚙️ Features

- 🔍 Browse your Plex library with posters
- ✅ Select full shows, seasons, or episodes
- 🔄 Detect existing USB content and sync only what's missing
- 💾 Saves sync history per drive with `.plex2drive.json`
- 🧠 Smart matching of Plex content to USB structure
- 📁 Respects Plex naming/folder conventions
- 🖥️ Runs on Unraid or any Docker-capable system
- 🌙 Built-in dark mode UI

## 🚀 Setup

1. Clone/download the repo and `cd` into the folder.
2. Use the first-launch setup wizard in the web UI.
3. Build & run via Docker:

```bash
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

4. Open `http://<your-server-ip>:3000` in your browser.

## 📄 Project Structure

- `backend/` – Node.js Express API + Plex sync engine
- `frontend/` – Vue 3 interface (served via Vite)
- `config/config.json` – App settings (automatically created)
- `.plex2drive.json` – USB-level sync manifest

## 🔧 Roadmap

- Friend-specific profiles
- Scheduled syncs
- File integrity check (hashes)
- Drag-and-drop USB drive detection

> 🧑‍💻 Contributed by [your name here]. Built for private/offline use. Not affiliated with Plex, Sonarr, or Radarr.
