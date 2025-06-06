<template>
  <div class="media-list">
    <h2>All Movies</h2>
    <input v-model="search" @input="onSearch" placeholder="Search Movies..." class="search-bar" />
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
      <MediaCard v-for="movie in movies" :key="movie.key" :media="movie" />
    </div>
    <div v-if="!loading && movies.length === 0">No movies found.</div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from 'axios'
import MediaCard from './MediaCard.vue'

const props = defineProps({
  globalSearch: {
    type: String,
    default: ''
  }
})

const movies = ref([])
const search = ref('')
const loading = ref(false)
const startsWith = ref('#')
const azLetters = [
  '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
]

async function fetchMovies() {
  loading.value = true
  const res = await axios.get('/api/plex/library', {
    params: {
      type: 'movie',
      limit: 999999, // Always fetch all items
      search: props.globalSearch || search.value, // Use global search if available
      startsWith: (props.globalSearch || search.value) ? '' : startsWith.value // Clear letter filter when searching
    }
  })
  movies.value = res.data.results || []
  loading.value = false
}

function onAZ(letter) {
  startsWith.value = startsWith.value === letter ? '' : letter
  search.value = '' // Clear search when changing letter
  fetchMovies()
}

function onSearch() {
  startsWith.value = '' // Clear letter filter when searching
  fetchMovies()
}

watch([search, startsWith, () => props.globalSearch], () => {
  fetchMovies()
})

onMounted(fetchMovies)
</script>

<style scoped>
.media-list { padding: 2rem; }
.media-grid { display: flex; flex-wrap: wrap; gap: 1.5rem; }
.pagination { margin-top: 1.5rem; display: flex; align-items: center; gap: 1rem; }
.search-bar { margin-bottom: 1rem; padding: 0.5rem 1rem; border-radius: 6px; border: 1px solid #334155; background: #181c24; color: #fff; font-size: 1rem; width: 100%; max-width: 340px; }
.az-bar { display: flex; gap: 0.4rem; margin-bottom: 1.2rem; flex-wrap: wrap; }
.az-btn { background: #23293a; color: #bfc7d5; border: none; border-radius: 5px; padding: 0.3rem 0.7rem; font-size: 1rem; cursor: pointer; transition: background 0.18s, color 0.18s; }
.az-btn.active, .az-btn:hover { background: #2563eb; color: #fff; }
</style> 