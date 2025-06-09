<template>
  <div class="drive-page">
    <h2>Drive</h2>
    <div class="drive-status">
      <button class="rescan-btn" @click="manualRescan" :disabled="rescanning">
        <i class="fa fa-sync"></i> Rescan Drive
      </button>
      <template v-if="loadingStatus">
        <span class="spinner"></span> Loading drive status...
      </template>
      <template v-else-if="statusError">
        <span class="error">{{ statusError }}</span>
      </template>
      <template v-else>
        <span v-if="!driveStatus.attached" class="error">No drive attached. Please attach a drive.</span>
        <span v-else>
          <b>Drive:</b> {{ driveStatus.drivePath }}<br />
          <b>Free Space:</b> {{ formatBytes(driveStatus.free) }} / <b>Total:</b> {{ formatBytes(driveStatus.total) }}
        </span>
      </template>
    </div>
    <div class="status-legend">
      <span class="status-tag complete"><i class="fa fa-check-circle"></i> Complete</span>
      <span class="status-tag partial"><i class="fa fa-exclamation-triangle"></i> Partial</span>
      <span class="status-tag missing"><i class="fa fa-times-circle"></i> Missing</span>
      <span class="legend-desc">Legend: <b>Complete</b> = all content present, <b>Partial</b> = some missing, <b>Missing</b> = not present on drive</span>
    </div>
    <div class="drive-content">
      <h3>Movies on Drive</h3>
      <div class="bulk-actions-row">
        <label><input type="checkbox" v-model="allMoviesSelected" @change="toggleSelectAll('movies')" /> Select All</label>
        <button class="bulk-btn" @click="deleteSelected('movies')" :disabled="selectedMovies.length === 0"><i class="fa fa-trash"></i> Delete Selected</button>
      </div>
      <div v-if="loadingContents"><span class="spinner"></span> Loading movies...</div>
      <div v-else-if="contentsError" class="error">{{ contentsError }}</div>
      <div v-else>
        <div v-if="movies.length === 0">No movies found on drive.</div>
        <ul v-else class="movies-list">
          <li v-for="movie in movies" :key="movie.title + (movie.year || '')" :class="{ selected: selectedMovies.includes(movieKey(movie)) }">
            <input type="checkbox" v-model="selectedMovies" :value="movieKey(movie)" />
            <b>{{ movie.title }}</b> <span v-if="movie.year">({{ movie.year }})</span>
            <span class="status-tag" :class="movie.status">
              <i v-if="movie.status === 'complete'" class="fa fa-check-circle"></i>
              <i v-else-if="movie.status === 'partial'" class="fa fa-exclamation-triangle"></i>
              <i v-else class="fa fa-times-circle"></i>
              {{ movie.status }}
            </span>
            <button class="delete-btn" @click="deleteMovie(movie)"><i class="fa fa-trash"></i></button>
          </li>
        </ul>
      </div>
      <h3>TV Shows on Drive</h3>
      <div class="bulk-actions-row">
        <label><input type="checkbox" v-model="allShowsSelected" @change="toggleSelectAll('shows')" /> Select All</label>
        <button class="bulk-btn" @click="deleteSelected('shows')" :disabled="selectedShows.length === 0"><i class="fa fa-trash"></i> Delete Selected</button>
        <button class="bulk-btn sync" @click="bulkSyncMissing()" :disabled="!hasPartialSelected"><i class="fa fa-plus"></i> Sync Missing for Selected</button>
      </div>
      <div v-if="loadingContents"><span class="spinner"></span> Loading TV shows...</div>
      <div v-else-if="contentsError" class="error">{{ contentsError }}</div>
      <div v-else>
        <div v-if="tvShows.length === 0">No TV shows found on drive.</div>
        <ul v-else class="tvshows-list">
          <li v-for="show in tvShows" :key="show.title" :class="{ selected: selectedShows.includes(show.title) }">
            <input type="checkbox" v-model="selectedShows" :value="show.title" />
            <b>{{ show.title }}</b>
            <span class="status-tag" :class="show.status">
              <i v-if="show.status === 'complete'" class="fa fa-check-circle"></i>
              <i v-else-if="show.status === 'partial'" class="fa fa-exclamation-triangle"></i>
              <i v-else class="fa fa-times-circle"></i>
              {{ show.status }}
            </span>
            <span v-if="show.status === 'partial'">
              - Missing:
              <span v-if="show.missingSeasons">Seasons {{ show.missingSeasons.join(', ') }}</span>
              <span v-if="show.missingEpisodes">Episodes
                <span v-for="ep in show.missingEpisodes" :key="ep.season">
                  [S{{ ep.season }}: {{ ep.episodes.join(', ') }}]
                </span>
              </span>
              <button class="sync-btn" @click="syncMissing(show)"><i class="fa fa-plus"></i> Sync Missing</button>
            </span>
            <button class="delete-btn" @click="deleteShow(show)"><i class="fa fa-trash"></i></button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'

const toast = useToast()
const driveStatus = ref({})
const loadingStatus = ref(true)
const statusError = ref('')

const movies = ref([])
const tvShows = ref([])
const loadingContents = ref(true)
const contentsError = ref('')
const rescanning = ref(false)

const selectedMovies = ref([])
const selectedShows = ref([])
const allMoviesSelected = computed({
  get: () => movies.value.length > 0 && selectedMovies.value.length === movies.value.length,
  set: (val) => toggleSelectAll('movies', val)
})
const allShowsSelected = computed({
  get: () => tvShows.value.length > 0 && selectedShows.value.length === tvShows.value.length,
  set: (val) => toggleSelectAll('shows', val)
})

const hasPartialSelected = computed(() => {
  return selectedShows.value.some(title => {
    const show = tvShows.value.find(s => s.title === title)
    return show && show.status === 'partial'
  })
})

function movieKey(movie) {
  return movie.title + (movie.year || '')
}

function toggleSelectAll(type, val) {
  if (type === 'movies') {
    if (val === undefined) val = !allMoviesSelected.value
    selectedMovies.value = val ? movies.value.map(movieKey) : []
  } else if (type === 'shows') {
    if (val === undefined) val = !allShowsSelected.value
    selectedShows.value = val ? tvShows.value.map(show => show.title) : []
  }
}

async function deleteSelected(type) {
  if (type === 'movies' && selectedMovies.value.length > 0) {
    if (!confirm(`Delete ${selectedMovies.value.length} selected movie(s) from drive? This cannot be undone.`)) return
    for (const key of selectedMovies.value) {
      const movie = movies.value.find(m => movieKey(m) === key)
      if (movie) {
        try {
          await axios.post('/api/drive/delete', { type: 'movie', title: movie.title, year: movie.year })
        } catch {}
      }
    }
    await fetchDriveContents()
    selectedMovies.value = []
    toast.success('Selected movies deleted from drive.')
  } else if (type === 'shows' && selectedShows.value.length > 0) {
    if (!confirm(`Delete ${selectedShows.value.length} selected TV show(s) from drive? This cannot be undone.`)) return
    for (const title of selectedShows.value) {
      try {
        await axios.post('/api/drive/delete', { type: 'show', title })
      } catch {}
    }
    await fetchDriveContents()
    selectedShows.value = []
    toast.success('Selected TV shows deleted from drive.')
  }
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return 'N/A'
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 Byte'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 10) / 10 + ' ' + sizes[i]
}

async function fetchDriveStatus() {
  loadingStatus.value = true
  statusError.value = ''
  try {
    const res = await axios.get('/api/drive/status')
    driveStatus.value = res.data
  } catch (err) {
    statusError.value = 'Failed to fetch drive status.'
    toast.error('Failed to fetch drive status.')
  } finally {
    loadingStatus.value = false
  }
}

async function fetchDriveContents() {
  loadingContents.value = true
  contentsError.value = ''
  try {
    const res = await axios.get('/api/drive/contents')
    movies.value = res.data.comparison.movies || []
    tvShows.value = res.data.comparison.tvShows || []
  } catch (err) {
    contentsError.value = 'Failed to fetch drive contents.'
    toast.error('Failed to fetch drive contents.')
  } finally {
    loadingContents.value = false
  }
}

async function manualRescan() {
  rescanning.value = true
  toast.info('Rescanning drive...')
  try {
    const res = await axios.post('/api/drive/rescan')
    movies.value = res.data.comparison.movies || []
    tvShows.value = res.data.comparison.tvShows || []
    await fetchDriveStatus()
    toast.success('Drive rescan complete!')
  } catch (err) {
    toast.error('Failed to rescan drive.')
  } finally {
    rescanning.value = false
  }
}

async function deleteMovie(movie) {
  if (!confirm(`Delete movie "${movie.title}" from drive? This cannot be undone.`)) return
  try {
    await axios.post('/api/drive/delete', { type: 'movie', title: movie.title, year: movie.year })
    await fetchDriveContents()
    toast.success('Movie deleted from drive.')
  } catch (err) {
    toast.error('Failed to delete movie from drive.')
  }
}

async function deleteShow(show) {
  if (!confirm(`Delete TV show "${show.title}" from drive? This cannot be undone.`)) return
  try {
    await axios.post('/api/drive/delete', { type: 'show', title: show.title })
    await fetchDriveContents()
    toast.success('TV show deleted from drive.')
  } catch (err) {
    toast.error('Failed to delete TV show from drive.')
  }
}

async function syncMissing(show) {
  if (!confirm(`Add missing episodes/seasons for "${show.title}" to the sync queue?`)) return
  try {
    await axios.post('/api/drive/sync-missing', {
      title: show.title,
      missingSeasons: show.missingSeasons,
      missingEpisodes: show.missingEpisodes
    })
    toast.success('Missing content added to sync queue.')
  } catch (err) {
    toast.error('Failed to add missing content to sync queue.')
  }
}

async function bulkSyncMissing() {
  const partialShows = selectedShows.value
    .map(title => tvShows.value.find(s => s.title === title))
    .filter(show => show && show.status === 'partial')
  if (partialShows.length === 0) return
  if (!confirm(`Sync missing content for ${partialShows.length} selected partial TV show(s)?`)) return
  let successCount = 0
  for (const show of partialShows) {
    try {
      await axios.post('/api/drive/sync-missing', {
        title: show.title,
        missingSeasons: show.missingSeasons,
        missingEpisodes: show.missingEpisodes
      })
      successCount++
    } catch {}
  }
  if (successCount > 0) toast.success(`Added missing content for ${successCount} show(s) to sync queue.`)
  else toast.error('No missing content was added.')
}

onMounted(() => {
  fetchDriveStatus()
  fetchDriveContents()
})
</script>

<style scoped>
.drive-page {
  padding: 2rem;
}
.drive-status {
  margin-bottom: 2rem;
  font-size: 1.1rem;
  color: #2563eb;
}
.drive-content h3 {
  margin-top: 2rem;
  color: #bfc7d5;
}
.movies-list, .tvshows-list {
  background: #23293a;
  border-radius: 8px;
  padding: 1.2rem;
  margin-bottom: 1.5rem;
  color: #bfc7d5;
  list-style: none;
}
.status-tag {
  margin-left: 1rem;
  padding: 0.2rem 0.7rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  text-transform: capitalize;
}
.status-tag.complete {
  background: #34d399;
  color: #fff;
}
.status-tag.partial {
  background: #fbbf24;
  color: #23293a;
}
.status-tag.missing {
  background: #f87171;
  color: #fff;
}
.error {
  color: #f87171;
  font-weight: 600;
}
.delete-btn {
  margin-left: 1.2rem;
  background: #f87171;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.18s;
}
.delete-btn:hover {
  background: #dc2626;
}
.sync-btn {
  margin-left: 1.2rem;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 1.1rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.18s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.sync-btn:hover {
  background: #2563eb;
}
.status-legend {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.2rem;
  flex-wrap: wrap;
}
.status-legend .status-tag {
  font-size: 0.98rem;
  font-weight: 500;
  padding: 0.2rem 0.8rem;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.status-legend .legend-desc {
  color: #7c8493;
  font-size: 0.95rem;
  margin-left: 1.5rem;
}
.rescan-btn {
  background: #64748b;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 1.2rem;
  margin-right: 1.2rem;
  cursor: pointer;
  transition: background 0.18s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.rescan-btn:disabled {
  background: #334155;
  cursor: not-allowed;
}
.rescan-btn:hover:not(:disabled) {
  background: #475569;
}
.bulk-actions-row {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 0.7rem;
}
.bulk-btn {
  background: #f87171;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 1.1rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.18s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.bulk-btn:disabled {
  background: #334155;
  cursor: not-allowed;
}
.bulk-btn:hover:not(:disabled) {
  background: #dc2626;
}
.bulk-btn.sync {
  background: #3b82f6;
}
.bulk-btn.sync:hover:not(:disabled) {
  background: #2563eb;
}
.selected {
  background: #334155;
}
.spinner {
  display: inline-block;
  width: 1.1em;
  height: 1.1em;
  border: 2.5px solid #bfc7d5;
  border-top: 2.5px solid #2563eb;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-right: 0.7em;
  vertical-align: middle;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 