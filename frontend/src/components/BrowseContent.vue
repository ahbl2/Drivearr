<template>
  <div class="browse-content">
    <div class="browse-header">
      <span class="source-toggle">
        <button :class="['toggle-btn', sourceType === 'plex' ? 'active' : '']" @click="setSource('plex')">Plex</button>
        <button :class="['toggle-btn', sourceType === 'local' ? 'active' : '']" @click="setSource('local')">Local</button>
      </span>
    </div>
    <div v-if="!sectionSelected && sourceType === 'plex'" class="no-section-msg">
      <p>Please select a {{ type === 'movie' ? 'Movies' : 'TV Shows' }} section in Plex Settings first.</p>
    </div>
    <div v-else>
      <LibraryHeader
        :title="type === 'movie' ? 'Movies' : 'TV Shows'"
        :viewMode="viewMode.value"
        :viewOptions="viewOptions"
        :yearFilter="yearFilter"
        :alphaLetters="alphaLetters"
        :activeLetter="activeLetter"
        :search="search"
        :currentPage="currentPage"
        :totalPages="totalPages"
        @update:viewMode="setViewMode"
        @update:year="onYearFilter"
        @update:alpha="setAlpha"
        @update:search="onSearch"
        @prevPage="prevPage"
        @nextPage="nextPage"
      />
      <div class="source-badge">Source: {{ sourceTypeLabel }}</div>
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="items.length === 0" class="no-results">
        No {{ type === 'movie' ? 'movies' : 'TV shows' }} found.
      </div>
      <div v-else>
        <div v-if="viewMode.value === 'posters'" class="media-grid">
          <component
            :is="viewComponent"
            :items="items"
            :addToQueue="addToQueue"
            :isInQueue="isInQueue"
            :isOnDrive="isOnDrive"
          />
        </div>
        <component
          v-else
          :is="viewComponent"
          :items="items"
          :addToQueue="addToQueue"
          :isInQueue="isInQueue"
          :isOnDrive="isOnDrive"
        />
        <div v-if="hasMoreItems" ref="loadMoreTrigger" class="load-more-trigger"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, onUnmounted } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import useViewMode from '../composables/useViewMode'
import PosterGridView from './PosterGridView.vue'
import OverviewListView from './OverviewListView.vue'
import TVTableView from './TVTableView.vue'
import MovieTableView from './MovieTableView.vue'
import MixedTableView from './MixedTableView.vue'
import LibraryHeader from './LibraryHeader.vue'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['movie', 'show'].includes(value)
  }
})

console.log('BrowseContent mounted for type:', props.type)

const toast = useToast()
const items = ref([])
const search = ref('')
const loading = ref(false)
const queue = ref(new Set())
const sectionKey = ref('')
const sectionSelected = ref(true)
const scanned = ref([])
const showDropdown = ref(false)
const yearFilter = ref('')
const currentPage = ref(1)
const hasMoreItems = ref(true)
const loadMoreTrigger = ref(null)
const observer = ref(null)
const sourceType = ref('plex')
const sourceTypeLabel = computed(() => sourceType.value === 'plex' ? 'Plex' : 'Local')

const { viewMode, setViewMode, viewOptions } = useViewMode(props.type + 'ViewMode', 'posters')

const alphaLetters = [
  '#', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)), '*'
]
const activeLetter = ref('#')

const componentMap = {
  PosterGridView,
  OverviewListView,
  TVTableView,
  MovieTableView,
  MixedTableView
}

function getViewComponentKey(type) {
  if (viewMode.value === 'posters') return 'PosterGridView'
  if (viewMode.value === 'overview') return 'OverviewListView'
  if (viewMode.value === 'table') {
    if (type === 'show') return 'TVTableView'
    if (type === 'movie') return 'MovieTableView'
    return 'MixedTableView'
  }
  return 'PosterGridView'
}

const viewComponent = computed(() => componentMap[getViewComponentKey(props.type)])

function setAlpha(letter) {
  activeLetter.value = letter
  search.value = ''
  fetchItems()
}

async function checkSectionSelected() {
  try {
    const { data } = await axios.get('/api/config')
    if (props.type === 'movie') {
      sectionKey.value = data.PLEX_MOVIES_SECTION_KEY
      sectionSelected.value = !!data.PLEX_MOVIES_SECTION_KEY
    } else if (props.type === 'show') {
      sectionKey.value = data.PLEX_SHOWS_SECTION_KEY
      sectionSelected.value = !!data.PLEX_SHOWS_SECTION_KEY
    }
  } catch (err) {
    sectionSelected.value = false
  }
}

let searchTimeout
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    activeLetter.value = ''
    fetchItems()
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

function clearYearFilter() {
  yearFilter.value = ''
  currentPage.value = 1
  hasMoreItems.value = true
  items.value = []
  fetchItems()
}

function onYearFilter() {
  const yearStr = String(yearFilter.value);
  if (/^\d{4}$/.test(yearStr)) {
    currentPage.value = 1;
    hasMoreItems.value = true;
    items.value = [];
    fetchItems();
  } else {
    // Not a valid year, clear results (show all)
    clearYearFilter();
  }
}

function setSource(type) {
  sourceType.value = type
  fetchItems()
}

async function fetchItems() {
  if (loading.value) return
  loading.value = true
  try {
    if (sourceType.value === 'plex') {
      const params = {
        type: props.type,
        page: currentPage.value,
        pageSize: 100
      }
      
      // Check if we have any active filters
      const hasActiveFilters = search.value || activeLetter.value || yearFilter.value
      
      if (search.value) {
        params.search = search.value
      } else if (activeLetter.value && !yearFilter.value) {
        params.startsWith = activeLetter.value
      }
      if (yearFilter.value && String(yearFilter.value).trim() !== '') {
        params.year = yearFilter.value
      }
      
      // If we have active filters, fetch all items at once
      if (hasActiveFilters) {
        params.pageSize = 10000 // Large number to get all items
        params.page = 1
      }
      
      const res = await axios.get('/api/plex/browse', { params })
      
      if (currentPage.value === 1 || hasActiveFilters) {
        items.value = res.data.results
      } else {
        items.value = [...items.value, ...res.data.results]
      }
      
      // Only enable pagination for unfiltered view
      hasMoreItems.value = !hasActiveFilters && res.data.results.length === 100
      if (hasMoreItems.value) {
        currentPage.value++
      }
    } else {
      // Local source
      const res = await axios.get('/api/config/local-media-index')
      let all = res.data.items || []
      // Filter by type
      all = all.filter(i => i.type === (props.type === 'show' ? 'episode' : 'movie') && i.metadata)
      // Group TV episodes by show for 'show' type
      if (props.type === 'show') {
        const tvShowsMap = {}
        for (const item of all) {
          const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
          const showKey = meta.show_tmdb_id || meta.id || item.title
          if (!tvShowsMap[showKey]) {
            tvShowsMap[showKey] = { ...item, meta, latestMtime: item.mtime }
          }
          if (item.mtime > tvShowsMap[showKey].latestMtime) {
            tvShowsMap[showKey].latestMtime = item.mtime
          }
        }
        items.value = Object.values(tvShowsMap)
          .sort((a, b) => b.latestMtime - a.latestMtime)
      } else {
        // Movies: sort by mtime
        items.value = all.sort((a, b) => b.mtime - a.mtime)
      }
      hasMoreItems.value = false
    }
  } catch (error) {
    toast.error('Failed to fetch content')
    console.error('Error fetching items:', error)
  }
  loading.value = false
}

function isInQueue(key) {
  return queue.value.has(key)
}

function isOnDrive(item) {
  if (props.type === 'movie') {
    return scanned.value.some(s => s.type === 'movie' && s.title.toLowerCase() === item.title.toLowerCase())
  } else if (props.type === 'show') {
    // If this is a show, check if all episodes for this show/season exist
    // For now, just check if any episode for this show exists
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
      items: [
        {
          plexKey: item.key,
          title: item.title,
          type: props.type
        }
      ]
    })
    queue.value.add(item.key)
    toast.success(`Added ${item.title} to sync queue`)
  } catch (error) {
    toast.error('Failed to add to queue')
    console.error('Error adding to queue:', error)
  }
}

function setupInfiniteScroll() {
  if (observer.value) {
    observer.value.disconnect()
  }

  observer.value = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMoreItems.value && !loading.value && yearFilter.value) {
      fetchItems()
    }
  })

  if (loadMoreTrigger.value) {
    observer.value.observe(loadMoreTrigger.value)
  }
}

watch(() => props.type, async () => {
  activeLetter.value = '#'
  search.value = ''
  yearFilter.value = ''
  currentPage.value = 1
  hasMoreItems.value = true
  items.value = []
  await checkSectionSelected()
  if (sectionSelected.value) fetchItems()
  await fetchScanned()
  setupInfiniteScroll()
})

onMounted(async () => {
  await checkSectionSelected()
  if (sectionSelected.value) fetchItems()
  await fetchScanned()
  setupInfiniteScroll()
})

onUnmounted(() => {
  if (observer.value) {
    observer.value.disconnect()
  }
})

const totalPages = computed(() => 10) // TODO: Replace with real total pages logic
function prevPage() { /* TODO: Implement prev page logic */ }
function nextPage() { /* TODO: Implement next page logic */ }
</script>

<style scoped>
.browse-content {
  padding: 2rem;
}

.browse-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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
  z-index: 1000;
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

.filters {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.year-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.year-input {
  width: 120px;
  padding: 0.5rem;
  border: 1px solid #2d3748;
  border-radius: 0.5rem;
  background: #1a202c;
  color: #fff;
}

.filter-year-btn {
  background: #23293a;
  border: none;
  color: #fff;
  border-radius: 4px;
  padding: 0.4rem 0.7rem;
  margin-left: 0.2rem;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.filter-year-btn:hover {
  background: #3b82f6;
  color: #fff;
}

.clear-year-btn {
  background: none;
  border: none;
  color: #a0aec0;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-year-btn:hover {
  background: #2d3748;
  color: #fff;
}

.alpha-pagination {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 1.2rem;
  flex-wrap: wrap;
}

.alpha-btn {
  background: #23293a;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 0.4rem 0.7rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.alpha-btn.active, .alpha-btn:hover {
  background: #3b82f6;
  color: #fff;
}

.search-container {
  margin: 1rem 0;
}

.search-bar {
  width: 100%;
  max-width: 400px;
  padding: 0.5rem 1rem;
  border: 1px solid #2d3748;
  border-radius: 0.5rem;
  background: #1a202c;
  color: #fff;
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
  color: #a0aec0;
}

.loading, .no-results {
  text-align: center;
  color: #a0aec0;
  margin: 2rem 0;
}

.no-section-msg {
  color: #f87171;
  background: #23293a;
  padding: 2rem;
  border-radius: 0.5rem;
  text-align: center;
  font-size: 1.2rem;
  margin: 2rem 0;
}

.load-more-trigger {
  height: 20px;
  width: 100%;
}

.source-toggle {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1.5rem;
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

.source-badge {
  color: #3b82f6;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

@media (max-width: 900px) {
  .browse-content { padding: 1rem 0.5rem; }
}
@media (max-width: 600px) {
  .browse-content { padding: 0.2rem 0.2rem; }
}
</style> 