<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="search-bar-container">
        <input v-model="search" @input="onSearch" placeholder="Search Movies & TV Shows..." class="search-bar" />
      </div>
      <div class="source-toggle">
        <button :class="['toggle-btn', sourceType === 'plex' ? 'active' : '']" @click="setSource('plex')">Plex</button>
        <button :class="['toggle-btn', sourceType === 'local' ? 'active' : '']" @click="setSource('local')">Local</button>
      </div>
    </div>
    <div v-if="search.trim()">
      <h2 class="section-title">Search Results <span class="plex-note">(Movies & TV Shows in Plex)</span></h2>
      <div v-if="loadingSearch" class="loading">Searching...</div>
      <div v-else-if="searchResults.length === 0" class="no-results">No results found.</div>
      <div v-else>
        <component :is="getViewComponent('mixed')" :items="searchResults" />
      </div>
    </div>
    <div v-else>
      <div class="dashboard-section">
        <h2 class="section-title">Newest TV Shows <span class="plex-note">(Newest in {{ sourceTypeLabel }})</span></h2>
        <div v-if="loadingTV" class="loading">Loading TV shows...</div>
        <div v-else-if="displayedTV.length === 0" class="no-results">No TV shows found.</div>
        <div v-else>
          <div class="media-grid">
            <div v-for="item in displayedTV" :key="item.key || item.path" class="media-card">
              <div class="poster-wrapper">
                <img v-if="getPoster(item)" :src="getPoster(item)" :alt="item.title" class="poster" />
                <div v-else class="no-poster">{{ item.title?.charAt(0) }}</div>
                <button 
                  class="add-btn" 
                  @click="addToQueue(item)"
                  :disabled="isInQueue(item.key || item.path) || isOnDrive(item)"
                >
                  <span v-if="isOnDrive(item)">On Drive</span>
                  <span v-else-if="isInQueue(item.key || item.path)">✓</span>
                  <span v-else>+</span>
                </button>
              </div>
              <div class="media-info">
                <h3 class="title">{{ item.title }}</h3>
                <p v-if="item.year" class="year">{{ item.year }}</p>
              </div>
            </div>
          </div>
        </div>
        <router-link to="/library/tv" class="see-all">See all TV Shows</router-link>
      </div>
      <div class="dashboard-section">
        <h2 class="section-title">Newest Movies <span class="plex-note">(Newest in {{ sourceTypeLabel }})</span></h2>
        <div v-if="loadingMovies" class="loading">Loading movies...</div>
        <div v-else-if="displayedMovies.length === 0" class="no-results">No movies found.</div>
        <div v-else>
          <div class="media-grid">
            <div v-for="item in displayedMovies" :key="item.key || item.path" class="media-card">
              <div class="poster-wrapper">
                <img v-if="getPoster(item)" :src="getPoster(item)" :alt="item.title" class="poster" />
                <div v-else class="no-poster">{{ item.title?.charAt(0) }}</div>
                <button 
                  class="add-btn" 
                  @click="addToQueue(item)"
                  :disabled="isInQueue(item.key || item.path) || isOnDrive(item)"
                >
                  <span v-if="isOnDrive(item)">On Drive</span>
                  <span v-else-if="isInQueue(item.key || item.path)">✓</span>
                  <span v-else>+</span>
                </button>
              </div>
              <div class="media-info">
                <h3 class="title">{{ item.title }}</h3>
                <p v-if="item.year" class="year">{{ item.year }}</p>
              </div>
            </div>
          </div>
        </div>
        <router-link to="/library/movies" class="see-all">See all Movies</router-link>
      </div>
      <div class="dashboard-section">
        <h2 class="section-title">Local Media Index <span class="plex-note">(Scanned from folders)</span></h2>
        <button class="fetch-meta-btn" @click="fetchMetadata" :disabled="fetchingMeta">Fetch Metadata for All</button>
        <span v-if="fetchingMeta" class="loading">Fetching metadata...</span>
        <span v-if="metaSummary" class="meta-summary">Updated: {{ metaSummary.updated }}, Failed: {{ metaSummary.failed }}</span>
        <div v-if="localMedia.length === 0" class="no-results">No local media indexed yet.</div>
        <div v-else class="media-grid">
          <div v-for="item in localMedia" :key="item.path" class="media-card">
            <div class="poster-wrapper">
              <img v-if="getPoster(item)" :src="getPoster(item)" :alt="item.title" class="poster" />
              <div v-else class="no-poster">{{ item.title?.charAt(0) }}</div>
            </div>
            <div class="media-info">
              <h3 class="title">{{ item.title }}</h3>
              <p class="type">{{ item.type }}</p>
              <p v-if="item.season">S{{ item.season }}E{{ item.episode }}</p>
              <p v-if="item.metadata">Matched</p>
              <p v-else>
                Unmatched
                <button class="match-btn" @click="openMatchModal(item)">Match</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Manual Match Modal -->
    <div v-if="showMatchModal" class="modal-overlay">
      <div class="modal">
        <h3>Manual Match: {{ matchTarget?.title }}</h3>
        <input v-model="matchQuery" @input="onMatchSearch" placeholder="Search TMDb..." class="modal-search" />
        <div v-if="matchLoading" class="modal-loading">Searching...</div>
        <div v-else-if="matchResults.length === 0" class="modal-no-results">No results found.</div>
        <div v-else class="modal-results">
          <div v-for="result in matchResults" :key="result.id" class="modal-result" @click="selectMatch(result)">
            <img v-if="result.poster_path" :src="'https://image.tmdb.org/t/p/w92' + result.poster_path" class="modal-thumb" />
            <span>{{ result.title || result.name }} <span v-if="result.release_date || result.first_air_date">({{ result.release_date || result.first_air_date }})</span></span>
          </div>
        </div>
        <button class="modal-close" @click="closeMatchModal">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import useViewMode from '../composables/useViewMode'

const { viewMode, setViewMode, viewOptions } = useViewMode('dashboardViewMode', 'posters')
const newestTV = ref([])
const newestMovies = ref([])
const loadingTV = ref(true)
const loadingMovies = ref(true)
const queue = ref(new Set())
const toast = useToast()
const search = ref('')
const searchResults = ref([])
const loadingSearch = ref(false)
const scanned = ref([])
let searchTimeout
const showDropdown = ref(false)
const localMedia = ref([])
const fetchingMeta = ref(false)
const metaSummary = ref(null)
const showMatchModal = ref(false)
const matchTarget = ref(null)
const matchQuery = ref('')
const matchResults = ref([])
const matchLoading = ref(false)
const sourceType = ref('plex')
const sourceTypeLabel = computed(() => sourceType.value === 'plex' ? 'Plex' : 'Local')

function isInQueue(key) {
  return queue.value.has(key)
}

function isOnDrive(item) {
  if (item.type === 'movie') {
    return scanned.value.some(s => s.type === 'movie' && s.title.toLowerCase() === item.title.toLowerCase())
  } else if (item.type === 'show') {
    // For shows, check if any episode for this show exists
    return scanned.value.some(s => s.type === 'episode' && s.title.toLowerCase() === item.title.toLowerCase())
  }
  return false
}

async function addToQueue(item) {
  if (isInQueue(item.key) || isOnDrive(item)) {
    toast.info('Already exists on drive')
    return
  }
  try {
    await axios.post('/api/sync/queue', {
      items: [{
        plexKey: item.key,
        title: item.title,
        type: item.type
      }]
    })
    queue.value.add(item.key)
    toast.success(`Added ${item.title} to sync queue`)
  } catch (error) {
    toast.error('Failed to add to queue')
    console.error('Error adding to queue:', error)
  }
}

function onSearch() {
  clearTimeout(searchTimeout)
  if (!search.value.trim()) {
    searchResults.value = []
    return
  }
  loadingSearch.value = true
  searchTimeout = setTimeout(async () => {
    try {
      const [movieRes, showRes] = await Promise.all([
        axios.get('/api/plex/browse', { params: { type: 'movie', search: search.value, pageSize: 20, page: 1 } }),
        axios.get('/api/plex/browse', { params: { type: 'show', search: search.value, pageSize: 20, page: 1 } })
      ])
      searchResults.value = [
        ...(showRes.data.results || []).map(item => ({ ...item, type: 'show' })),
        ...(movieRes.data.results || []).map(item => ({ ...item, type: 'movie' }))
      ]
    } catch (err) {
      searchResults.value = []
    }
    loadingSearch.value = false
  }, 300)
}

async function fetchScanned() {
  try {
    const res = await axios.get('/api/usb/scanned')
    scanned.value = res.data
  } catch (err) {
    scanned.value = []
  }
}

function getViewComponent(type) {
  if (viewMode.value === 'posters') return 'PosterGridView'
  if (viewMode.value === 'overview') return 'OverviewListView'
  if (viewMode.value === 'table') {
    if (type === 'tv') return 'TVTableView'
    if (type === 'movie') return 'MovieTableView'
    return 'MixedTableView'
  }
  return 'PosterGridView'
}

async function fetchLocalMedia() {
  try {
    const res = await axios.get('/api/config/local-media-index')
    localMedia.value = res.data.items || []
  } catch {
    localMedia.value = []
  }
}

async function fetchMetadata() {
  fetchingMeta.value = true
  metaSummary.value = null
  try {
    const res = await axios.post('/api/config/fetch-metadata')
    metaSummary.value = { updated: res.data.updated, failed: res.data.failed }
    await fetchLocalMedia()
  } catch {
    metaSummary.value = { updated: 0, failed: 0 }
  }
  fetchingMeta.value = false
}

function getPoster(item) {
  if (!item.metadata) return null
  try {
    const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
    if (meta.poster_path) return 'https://image.tmdb.org/t/p/w300' + meta.poster_path
    if (meta.still_path) return 'https://image.tmdb.org/t/p/w300' + meta.still_path
    if (meta.show_tmdb_id && meta.show_name && meta.show_poster_path) return 'https://image.tmdb.org/t/p/w300' + meta.show_poster_path
  } catch {}
  return null
}

function openMatchModal(item) {
  showMatchModal.value = true
  matchTarget.value = item
  matchQuery.value = item.title
  matchResults.value = []
  matchLoading.value = false
  onMatchSearch()
}

function closeMatchModal() {
  showMatchModal.value = false
  matchTarget.value = null
  matchQuery.value = ''
  matchResults.value = []
  matchLoading.value = false
}

async function onMatchSearch() {
  if (!matchQuery.value.trim() || !matchTarget.value) return
  matchLoading.value = true
  matchResults.value = []
  try {
    let res
    if (matchTarget.value.type === 'movie') {
      res = await axios.get('https://api.themoviedb.org/3/search/movie', {
        params: { api_key: import.meta.env.VITE_TMDB_API_KEY || '', query: matchQuery.value }
      })
      matchResults.value = res.data.results || []
    } else {
      res = await axios.get('https://api.themoviedb.org/3/search/tv', {
        params: { api_key: import.meta.env.VITE_TMDB_API_KEY || '', query: matchQuery.value }
      })
      matchResults.value = res.data.results || []
    }
  } catch {
    matchResults.value = []
  }
  matchLoading.value = false
}

async function selectMatch(result) {
  if (!matchTarget.value) return
  try {
    await axios.post('/api/config/manual-match', {
      path: matchTarget.value.path,
      type: matchTarget.value.type,
      tmdbId: result.id
    })
    await fetchLocalMedia()
    closeMatchModal()
  } catch {
    // error handling
  }
}

const displayedTV = ref([])
const displayedMovies = ref([])

async function refreshSource() {
  loadingTV.value = true
  loadingMovies.value = true
  if (sourceType.value === 'plex') {
    try {
      const tvRes = await axios.get('/api/plex/browse', { params: { type: 'show', pageSize: 20, page: 1, recent: true } })
      displayedTV.value = tvRes.data.results || []
    } finally {
      loadingTV.value = false
    }
    try {
      const movieRes = await axios.get('/api/plex/browse', { params: { type: 'movie', pageSize: 20, page: 1, recent: true } })
      displayedMovies.value = movieRes.data.results || []
    } finally {
      loadingMovies.value = false
    }
  } else {
    await fetchLocalMedia()
    // TV: group episodes by show, show newest 20 shows by most recent episode
    const tvShowsMap = {}
    for (const item of localMedia.value) {
      if (item.type === 'episode' && item.metadata) {
        const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
        const showKey = meta.show_tmdb_id || meta.id || item.title
        if (!tvShowsMap[showKey]) {
          tvShowsMap[showKey] = { ...item, meta, latestMtime: item.mtime }
        }
        if (item.mtime > tvShowsMap[showKey].latestMtime) {
          tvShowsMap[showKey].latestMtime = item.mtime
        }
      }
    }
    displayedTV.value = Object.values(tvShowsMap)
      .sort((a, b) => b.latestMtime - a.latestMtime)
      .slice(0, 20)
    // Movies: show newest 20 by mtime
    displayedMovies.value = localMedia.value
      .filter(item => item.type === 'movie' && item.metadata)
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 20)
    loadingTV.value = false
    loadingMovies.value = false
  }
}

function setSource(type) {
  sourceType.value = type
  refreshSource()
}

onMounted(async () => {
  await fetchScanned()
  await refreshSource()
  await fetchLocalMedia()
})
</script>

<style scoped>
.dashboard { padding: 2rem; }
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.search-bar-container {
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
}
.search-bar {
  width: 100%;
  max-width: 400px;
  padding: 0.5rem 1rem;
  border: 1px solid #2d3748;
  border-radius: 0.5rem;
  background: #1a202c;
  color: #fff;
  font-size: 1.1rem;
}
.section-title {
  color: #111;
  font-size: 1.5rem;
  margin: 2rem 0 1rem 0;
  font-weight: 700;
  letter-spacing: 1px;
}
.plex-note {
  color: #333;
  font-size: 0.95rem;
  font-weight: 400;
}
.view-toggle {
  position: relative;
  display: flex;
  align-items: center;
}
.view-toggle-btn {
  background: #23293a;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  cursor: pointer;
  transition: background 0.2s;
}
.view-toggle-btn:hover {
  background: #3b82f6;
}
.view-dropdown {
  position: absolute;
  top: 110%;
  right: 0;
  background: #23293a;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  z-index: 10;
  min-width: 160px;
  padding: 0.5rem 0;
}
.view-option {
  padding: 0.6rem 1.2rem;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-size: 1rem;
  transition: background 0.15s;
}
.view-option:hover {
  background: #3b82f6;
}
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  width: 100%;
  box-sizing: border-box;
}
.media-card {
  background: #2d3748;
  border-radius: 0.5rem;
  overflow: hidden;
  transition: transform 0.2s;
  min-width: 0;
  width: 100%;
}
.media-card:hover {
  transform: translateY(-4px);
}
.poster-wrapper {
  position: relative;
  aspect-ratio: 2/3;
  background: #1a202c;
  min-width: 0;
  width: 100%;
}
.poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.no-poster {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #4a5568;
  background: #2d3748;
}
.add-btn {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #4299e1;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: background 0.2s;
}
.add-btn:hover:not(:disabled) {
  background: #3182ce;
}
.add-btn:disabled {
  background: #48bb78;
  cursor: default;
}
.media-info {
  padding: 1rem;
}
.title {
  margin: 0;
  font-size: 1rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.year {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: #fff;
}
.type-tag {
  display: inline-block;
  margin-top: 0.3rem;
  font-size: 0.85rem;
  color: #3b82f6;
  background: #181c24;
  border-radius: 0.3rem;
  padding: 0.1rem 0.5rem;
}
.see-all {
  display: block;
  margin: 1rem 0 2rem 0;
  color: #3b82f6;
  text-align: right;
}
.loading {
  text-align: center;
  color: #a0aec0;
  margin: 2rem 0;
}
.no-results {
  text-align: center;
  color: #a0aec0;
  margin: 2rem 0;
  font-size: 1.1rem;
}
.fetch-meta-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.3rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 1rem;
}
.fetch-meta-btn:hover {
  background: #2d3748;
}
.fetch-meta-btn:disabled {
  background: #48bb78;
  cursor: default;
}
.meta-summary {
  color: #a0aec0;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}
.match-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.3rem 0.8rem;
  font-size: 0.95rem;
  margin-left: 0.7rem;
  cursor: pointer;
  transition: background 0.2s;
}
.match-btn:hover {
  background: #2563eb;
}
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  background: #23293a;
  border-radius: 12px;
  padding: 2rem 2.5rem;
  min-width: 340px;
  max-width: 95vw;
  box-shadow: 0 2px 24px rgba(0,0,0,0.18);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.2rem;
}
.modal-search {
  padding: 0.7rem 1rem;
  border-radius: 6px;
  border: 1px solid #334155;
  font-size: 1rem;
  background: #181c24;
  color: #fff;
}
.modal-results {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  max-height: 260px;
  overflow-y: auto;
}
.modal-result {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #181c24;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.modal-result:hover {
  background: #334155;
}
.modal-thumb {
  width: 48px;
  border-radius: 6px;
}
.modal-close {
  background: #f87171;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  align-self: flex-end;
  margin-top: 1rem;
}
.modal-close:hover {
  background: #dc2626;
}
.modal-loading, .modal-no-results {
  color: #bfc7d5;
  font-size: 1rem;
  text-align: center;
  margin: 1rem 0;
}
.source-toggle {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-left: 2rem;
}
.toggle-btn {
  background: #23293a;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.toggle-btn.active {
  background: #3b82f6;
  color: #fff;
}
.toggle-btn:not(.active):hover {
  background: #334155;
}
</style> 