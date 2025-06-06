<template>
  <div class="browse-content">
    <div v-if="!sectionSelected" class="no-section-msg">
      <p>Please select a {{ type === 'movie' ? 'Movies' : 'TV Shows' }} section in Plex Settings first.</p>
    </div>
    <div v-else>
      <div class="browse-header">
        <h2>Browse {{ type === 'movie' ? 'Movies' : 'TV Shows' }}</h2>
        <div class="search-container">
          <input 
            v-model="search" 
            @input="onSearch" 
            :placeholder="`Search ${type === 'movie' ? 'Movies' : 'TV Shows'}...`" 
            class="search-bar" 
          />
        </div>
      </div>

      <div class="media-grid">
        <div v-for="item in items" :key="item.key" class="media-card">
          <div class="poster-wrapper">
            <img 
              v-if="item.thumb_url" 
              :src="item.thumb_url" 
              :alt="item.title" 
              class="poster"
            />
            <div v-else class="no-poster">
              {{ item.title.charAt(0) }}
            </div>
            <button 
              class="add-btn" 
              @click="addToQueue(item)"
              :disabled="isInQueue(item.key)"
            >
              {{ isInQueue(item.key) ? '✓' : '+' }}
            </button>
          </div>
          <div class="media-info">
            <h3 class="title">{{ item.title }}</h3>
            <p v-if="item.year" class="year">{{ item.year }}</p>
          </div>
        </div>
      </div>

      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="items.length === 0" class="no-results">
        No {{ type === 'movie' ? 'movies' : 'TV shows' }} found.
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button 
          :disabled="currentPage === 1" 
          @click="changePage(currentPage - 1)"
          class="page-btn"
        >
          Previous
        </button>
        <span class="page-info">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button 
          :disabled="currentPage === totalPages" 
          @click="changePage(currentPage + 1)"
          class="page-btn"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'

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
const currentPage = ref(1)
const pageSize = ref(50)
const totalPages = ref(1)
const queue = ref(new Set())
const sectionKey = ref('')

// Fetch config to check if section is selected
const sectionSelected = ref(true)

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

// Debounce search
let searchTimeout
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchItems()
  }, 300)
}

async function fetchItems() {
  loading.value = true
  try {
    const res = await axios.get('/api/plex/browse', {
      params: {
        type: props.type,
        search: search.value,
        page: currentPage.value,
        pageSize: pageSize.value
      }
    })
    items.value = res.data.results
    totalPages.value = res.data.totalPages
  } catch (error) {
    toast.error('Failed to fetch content')
    console.error('Error fetching items:', error)
  }
  loading.value = false
}

function changePage(page) {
  currentPage.value = page
  fetchItems()
}

function isInQueue(key) {
  return queue.value.has(key)
}

async function addToQueue(item) {
  if (isInQueue(item.key)) return

  try {
    await axios.post('/api/sync/queue', {
      plexKey: item.key,
      title: item.title,
      type: props.type
    })
    queue.value.add(item.key)
    toast.success(`Added ${item.title} to sync queue`)
  } catch (error) {
    toast.error('Failed to add to queue')
    console.error('Error adding to queue:', error)
  }
}

watch(() => props.type, async () => {
  currentPage.value = 1
  search.value = ''
  await checkSectionSelected()
  if (sectionSelected.value) fetchItems()
})

onMounted(async () => {
  await checkSectionSelected()
  if (sectionSelected.value) fetchItems()
})
</script>

<style scoped>
.browse-content {
  padding: 2rem;
}

.browse-header {
  margin-bottom: 2rem;
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
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.media-card {
  background: #2d3748;
  border-radius: 0.5rem;
  overflow: hidden;
  transition: transform 0.2s;
}

.media-card:hover {
  transform: translateY(-4px);
}

.poster-wrapper {
  position: relative;
  aspect-ratio: 2/3;
  background: #1a202c;
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

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.page-btn {
  padding: 0.5rem 1rem;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.page-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
}

.page-info {
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
</style> 