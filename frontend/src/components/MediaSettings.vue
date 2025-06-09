<template>
  <div class="settings-form">
    <!-- Sync Drive Section -->
    <div class="section">
      <h3>Sync Drive</h3>
      <p class="section-description">Select the drive where media will be synced to</p>
      <div class="drive-selector">
        <input v-model="syncDrivePath" placeholder="Drive path..." readonly />
        <button type="button" class="detect-btn" @click="detectDrives">Detect Drives</button>
        <select v-if="drives.length" v-model="syncDrivePath" class="drives-select">
          <option v-for="d in drives" :key="d" :value="d">{{ d }}</option>
        </select>
        <button class="save-btn" @click="saveSyncDrive">Save Drive</button>
      </div>
      <div v-if="driveStatusMsg" :class="['drive-status-msg', driveAttached ? 'attached' : 'detached']">
        {{ driveStatusMsg }}
      </div>
    </div>

    <!-- TV Show Folders Section -->
    <div class="section">
      <h3>TV Show Folders</h3>
      <p class="section-description">Add folders containing your TV shows to scan from</p>
      <ul class="folders-list">
        <li v-for="folder in tvFolders" :key="folder">
          <span>{{ folder }}</span>
          <button class="remove-folder-btn" @click="removeTvFolder(folder)">Remove</button>
        </li>
      </ul>
      <div class="add-folder-row">
        <input v-model="newTvFolder" placeholder="Add TV show folder path..." />
        <input ref="tvFolderInput" type="file" webkitdirectory directory multiple style="display:none" @change="onTvFolderPicked" />
        <button class="add-folder-btn" @click="triggerTvFolderPicker">Browse</button>
        <button class="add-folder-btn" @click="addTvFolder">Add Folder</button>
      </div>
    </div>

    <!-- Movie Folders Section -->
    <div class="section">
      <h3>Movie Folders</h3>
      <p class="section-description">Add folders containing your movies to scan from</p>
      <ul class="folders-list">
        <li v-for="folder in movieFolders" :key="folder">
          <span>{{ folder }}</span>
          <button class="remove-folder-btn" @click="removeMovieFolder(folder)">Remove</button>
        </li>
      </ul>
      <div class="add-folder-row">
        <input v-model="newMovieFolder" placeholder="Add movie folder path..." />
        <input ref="movieFolderInput" type="file" webkitdirectory directory multiple style="display:none" @change="onMovieFolderPicked" />
        <button class="add-folder-btn" @click="triggerMovieFolderPicker">Browse</button>
        <button class="add-folder-btn" @click="addMovieFolder">Add Folder</button>
      </div>
    </div>

    <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const syncDrivePath = ref('')
const tvFolders = ref([])
const movieFolders = ref([])
const newTvFolder = ref('')
const newMovieFolder = ref('')
const drives = ref([])
const successMsg = ref('')
const driveAttached = ref(true)
const driveStatusMsg = ref('')
let driveCheckInterval = null

const tvFolderInput = ref(null)
const movieFolderInput = ref(null)

const triggerTvFolderPicker = () => {
  tvFolderInput.value && tvFolderInput.value.click()
}
const triggerMovieFolderPicker = () => {
  movieFolderInput.value && movieFolderInput.value.click()
}

const onTvFolderPicked = (e) => {
  const files = e.target.files
  if (files && files.length > 0) {
    // Get the common root folder
    const first = files[0]
    let folderPath = ''
    if (first.webkitRelativePath) {
      folderPath = first.webkitRelativePath.split('/')[0]
    }
    if (folderPath) {
      // On Windows, webkitRelativePath uses \\ as separator
      folderPath = folderPath.replace(/\\/g, '/')
      newTvFolder.value = folderPath
    }
  }
}
const onMovieFolderPicked = (e) => {
  const files = e.target.files
  if (files && files.length > 0) {
    const first = files[0]
    let folderPath = ''
    if (first.webkitRelativePath) {
      folderPath = first.webkitRelativePath.split('/')[0]
    }
    if (folderPath) {
      folderPath = folderPath.replace(/\\/g, '/')
      newMovieFolder.value = folderPath
    }
  }
}

const loadConfig = async () => {
  try {
    const res = await axios.get('/api/config')
    syncDrivePath.value = res.data.SYNC_DRIVE_PATH || ''
    tvFolders.value = Array.isArray(res.data.TV_SHOW_FOLDERS) ? res.data.TV_SHOW_FOLDERS : []
    movieFolders.value = Array.isArray(res.data.MOVIE_FOLDERS) ? res.data.MOVIE_FOLDERS : []
  } catch {}
}

const checkDriveStatus = async () => {
  try {
    const res = await axios.get('/api/usb/status')
    driveAttached.value = !!(res.data.present && res.data.syncDrivePath)
    if (driveAttached.value) {
      driveStatusMsg.value = `Drive attached: ${res.data.syncDrivePath}`
    } else {
      driveStatusMsg.value = 'No drive detected or drive is empty. Please attach a drive.'
    }
  } catch {
    driveAttached.value = false
    driveStatusMsg.value = 'No drive detected or drive is empty. Please attach a drive.'
  }
}

const detectDrives = async () => {
  try {
    const res = await axios.get('/api/usb/discover')
    drives.value = res.data.drives || []
    if (drives.value.length === 1) {
      syncDrivePath.value = drives.value[0]
    }
  } catch (err) {
    alert('Failed to detect drives')
  }
}

const saveSyncDrive = async () => {
  if (!syncDrivePath.value) return
  try {
    const res = await axios.post('/api/config/sync-drive', { path: syncDrivePath.value })
    successMsg.value = 'Sync drive saved!'
    setTimeout(() => { successMsg.value = '' }, 2000)
  } catch {
    alert('Failed to save sync drive')
  }
}

const addTvFolder = async () => {
  if (!newTvFolder.value) return
  try {
    const res = await axios.post('/api/config/add-tv-folder', { folder: newTvFolder.value })
    tvFolders.value = res.data.TV_SHOW_FOLDERS
    newTvFolder.value = ''
    successMsg.value = 'TV folder added!'
    setTimeout(() => { successMsg.value = '' }, 2000)
  } catch {
    alert('Failed to add TV folder')
  }
}

const removeTvFolder = async (folder) => {
  try {
    const res = await axios.post('/api/config/remove-tv-folder', { folder })
    tvFolders.value = res.data.TV_SHOW_FOLDERS
    successMsg.value = 'TV folder removed!'
    setTimeout(() => { successMsg.value = '' }, 2000)
  } catch {
    alert('Failed to remove TV folder')
  }
}

const addMovieFolder = async () => {
  if (!newMovieFolder.value) return
  try {
    const res = await axios.post('/api/config/add-movie-folder', { folder: newMovieFolder.value })
    movieFolders.value = res.data.MOVIE_FOLDERS
    newMovieFolder.value = ''
    successMsg.value = 'Movie folder added!'
    setTimeout(() => { successMsg.value = '' }, 2000)
  } catch {
    alert('Failed to add movie folder')
  }
}

const removeMovieFolder = async (folder) => {
  try {
    const res = await axios.post('/api/config/remove-movie-folder', { folder })
    movieFolders.value = res.data.MOVIE_FOLDERS
    successMsg.value = 'Movie folder removed!'
    setTimeout(() => { successMsg.value = '' }, 2000)
  } catch {
    alert('Failed to remove movie folder')
  }
}

onMounted(() => {
  loadConfig()
  checkDriveStatus()
  driveCheckInterval = setInterval(checkDriveStatus, 5000)
})
onUnmounted(() => {
  if (driveCheckInterval) clearInterval(driveCheckInterval)
})
</script>

<style scoped>
.settings-form {
  background: #23293a;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  padding: 2.5rem 2rem 2rem 2rem;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  max-width: 900px;
  align-self: stretch;
  margin: 0;
}

.section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #bfc7d5;
}

.section-description {
  margin: 0;
  font-size: 0.9rem;
  color: #94a3b8;
}

.drive-selector {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  width: 100%;
}

.folders-list {
  width: 100%;
  list-style: none;
  padding: 0;
  margin: 0;
}

.folders-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #181c24;
  border-radius: 6px;
  padding: 0.7rem 1.2rem;
  margin-bottom: 0.5rem;
}

.remove-folder-btn {
  background: #f87171;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.remove-folder-btn:hover {
  background: #dc2626;
}

.add-folder-row {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  width: 100%;
}

input {
  flex: 1;
  background: #181c24;
  color: #fff;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 0.7rem 1rem;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
}

.add-folder-btn, .save-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.7rem 1.2rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
}

.add-folder-btn:hover, .save-btn:hover {
  background: #2563eb;
}

.detect-btn {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.7rem 1.2rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
}

.detect-btn:hover {
  background: #3b82f6;
}

.drives-select {
  background: #181c24;
  color: #fff;
  border-radius: 6px;
  border: 1px solid #334155;
  padding: 0.7rem 1.2rem;
  font-size: 1rem;
}

.drive-status-msg {
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
}

.drive-status-msg.attached {
  color: #34d399;
}

.drive-status-msg.detached {
  color: #f87171;
}

.success-msg {
  color: #34d399;
  background: #23293a;
  border-radius: 6px;
  padding: 0.7rem 1.2rem;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
}
</style> 