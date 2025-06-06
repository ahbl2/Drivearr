<template>
  <div class="media-list">
    <h2>All Movies</h2>
    <input v-model="search" @input="onSearch" placeholder="Search Movies..." class="search-bar" />
    <div class="media-grid">
      <MediaCard v-for="movie in movies" :key="movie.key" :media="movie" />
    </div>
    <div class="pagination">
      <button @click="prevPage" :disabled="offset === 0">Previous</button>
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button @click="nextPage" :disabled="offset + limit >= total">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import MediaCard from './MediaCard.vue'

const movies = ref([])
const total = ref(0)
const limit = 50
const offset = ref(0)
const search = ref('')
const loading = ref(false)

const page = computed(() => Math.floor(offset.value / limit) + 1)
const totalPages = computed(() => Math.ceil(total.value / limit))

async function fetchMovies() {
  loading.value = true
  const res = await axios.get('/api/plex/library', {
    params: {
      type: 'movie',
      offset: offset.value,
      limit,
      search: search.value
    }
  })
  movies.value = res.data.results || []
  total.value = res.data.total || 0
  loading.value = false
}

function nextPage() {
  if (offset.value + limit < total.value) {
    offset.value += limit
    fetchMovies()
  }
}
function prevPage() {
  if (offset.value >= limit) {
    offset.value -= limit
    fetchMovies()
  }
}
function onSearch() {
  offset.value = 0
  fetchMovies()
}

watch([offset, search], fetchMovies, { immediate: true })
</script>

<style scoped>
.media-list { padding: 2rem; }
.media-grid { display: flex; flex-wrap: wrap; gap: 1.5rem; }
.pagination { margin-top: 1.5rem; display: flex; align-items: center; gap: 1rem; }
.search-bar { margin-bottom: 1rem; padding: 0.5rem 1rem; border-radius: 6px; border: 1px solid #334155; background: #181c24; color: #fff; font-size: 1rem; width: 100%; max-width: 340px; }
</style> 