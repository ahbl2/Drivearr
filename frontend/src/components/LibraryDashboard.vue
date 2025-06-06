<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="search-bar-container">
        <input v-model="search" @input="onSearch" placeholder="Search Movies & TV Shows..." class="search-bar" />
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
        <h2 class="section-title">Newest TV Shows <span class="plex-note">(Newest in Plex)</span></h2>
        <div v-if="loadingTV" class="loading">Loading TV shows...</div>
        <div v-else-if="newestTV.length === 0" class="no-results">No TV shows found in Plex.</div>
        <div v-else>
          <div class="media-grid">
            <div v-for="item in newestTV" :key="item.key" class="media-card">
              <div class="poster-wrapper">
                <img v-if="item.thumb_url" :src="item.thumb_url" :alt="item.title" class="poster" />
                <div v-else class="no-poster">{{ item.title?.charAt(0) }}</div>
                <button 
                  class="add-btn" 
                  @click="addToQueue(item)"
                  :disabled="isInQueue(item.key) || isOnDrive(item)"
                >
                  <span v-if="isOnDrive(item)">On Drive</span>
                  <span v-else-if="isInQueue(item.key)">✓</span>
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
        <h2 class="section-title">Newest Movies <span class="plex-note">(Newest in Plex)</span></h2>
        <div v-if="loadingMovies" class="loading">Loading movies...</div>
        <div v-else-if="newestMovies.length === 0" class="no-results">No movies found in Plex.</div>
        <div v-else>
          <div class="media-grid">
            <div v-for="item in newestMovies" :key="item.key" class="media-card">
              <div class="poster-wrapper">
                <img v-if="item.thumb_url" :src="item.thumb_url" :alt="item.title" class="poster" />
                <div v-else class="no-poster">{{ item.title?.charAt(0) }}</div>
                <button 
                  class="add-btn" 
                  @click="addToQueue(item)"
                  :disabled="isInQueue(item.key) || isOnDrive(item)"
                >
                  <span v-if="isOnDrive(item)">On Drive</span>
                  <span v-else-if="isInQueue(item.key)">✓</span>
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
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

onMounted(async () => {
  loadingTV.value = true
  loadingMovies.value = true
  await fetchScanned()
  try {
    const tvRes = await axios.get('/api/plex/browse', { params: { type: 'show', pageSize: 20, page: 1, recent: true } })
    newestTV.value = tvRes.data.results || []
  } finally {
    loadingTV.value = false
  }
  try {
    const movieRes = await axios.get('/api/plex/browse', { params: { type: 'movie', pageSize: 20, page: 1, recent: true } })
    newestMovies.value = movieRes.data.results || []
  } finally {
    loadingMovies.value = false
  }
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
</style> 