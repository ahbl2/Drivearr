<template>
  <div class="media-list">
    <div class="header-actions">
      <h2>All TV Shows</h2>
      <button @click="openBrowse" class="browse-btn">
        Browse TV Shows
      </button>
    </div>
    <input v-model="search" @input="onSearch" placeholder="Search TV Shows..." class="search-bar" />
    <div class="az-bar">
      <button
        v-for="letter in azLetters"
        :key="letter"
        :class="['az-btn', { active: startsWith === letter }]"
        @click="onAZ(letter)"
      >
        {{ letter }}
      </button>
    </div>
    <div class="media-grid">
      <MediaCard v-for="show in tvShows" :key="show.key" :media="show" />
    </div>
    <div v-if="!loading && tvShows.length === 0">No TV shows found.</div>

    <!-- Browse Modal -->
    <div v-if="showBrowse" class="modal-overlay" @click="showBrowse = false">
      <div class="modal-content" @click.stop>
        <button class="close-btn" @click="showBrowse = false">&times;</button>
        <BrowseContent type="show" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from 'axios'
import MediaCard from './MediaCard.vue'
import BrowseContent from './BrowseContent.vue'

const props = defineProps({
  globalSearch: {
    type: String,
    default: ''
  }
})

const tvShows = ref([])
const search = ref('')
const loading = ref(false)
const startsWith = ref('#')
const showBrowse = ref(false)
const azLetters = [
  '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
]

async function fetchTVShows() {
  loading.value = true
  const res = await axios.get('/api/plex/library', {
    params: {
      type: 'show',
      limit: 999999, // Always fetch all items
      search: props.globalSearch || search.value, // Use global search if available
      startsWith: (props.globalSearch || search.value) ? '' : startsWith.value // Clear letter filter when searching
    }
  })
  tvShows.value = res.data.results || []
  loading.value = false
}

function onAZ(letter) {
  startsWith.value = startsWith.value === letter ? '' : letter
  search.value = '' // Clear search when changing letter
  fetchTVShows()
}

function onSearch() {
  startsWith.value = '' // Clear letter filter when searching
  fetchTVShows()
}

function openBrowse() {
  console.log('Browse TV Shows button clicked')
  showBrowse.value = true
}

watch([search, startsWith, () => props.globalSearch], () => {
  fetchTVShows()
})

onMounted(fetchTVShows)
</script>

<style scoped>
.media-list { padding: 2rem; }
.media-grid { display: flex; flex-wrap: wrap; gap: 1.5rem; }
.pagination { margin-top: 1.5rem; display: flex; align-items: center; gap: 1rem; }
.search-bar { margin-bottom: 1rem; padding: 0.5rem 1rem; border-radius: 6px; border: 1px solid #334155; background: #181c24; color: #fff; font-size: 1rem; width: 100%; max-width: 340px; }
.az-bar { display: flex; gap: 0.4rem; margin-bottom: 1.2rem; flex-wrap: wrap; }
.az-btn { background: #23293a; color: #bfc7d5; border: none; border-radius: 5px; padding: 0.3rem 0.7rem; font-size: 1rem; cursor: pointer; transition: background 0.18s, color 0.18s; }
.az-btn.active, .az-btn:hover { background: #2563eb; color: #fff; }

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.browse-btn {
  padding: 0.5rem 1rem;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background 0.2s;
}

.browse-btn:hover {
  background: #3182ce;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #1a202c;
  border-radius: 0.5rem;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 1;
}

.close-btn:hover {
  color: white;
}
</style> 