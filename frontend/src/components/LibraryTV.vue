<template>
  <div class="media-list">
    <h2>All TV Shows</h2>
    <input v-model="search" @input="onSearch" placeholder="Search TV Shows..." class="search-bar" />
    <div class="media-grid">
      <MediaCard v-for="show in tvShows" :key="show.key" :media="show" />
    </div>
    <div v-if="!loading && tvShows.length === 0">No TV shows found.</div>
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

const tvShows = ref([])
const total = ref(0)
const limit = 50
const offset = ref(0)
const search = ref('')
const loading = ref(false)

const page = computed(() => Math.floor(offset.value / limit) + 1)
const totalPages = computed(() => Math.ceil(total.value / limit))

async function fetchTVShows() {
  loading.value = true
  const res = await axios.get('/api/plex/library', {
    params: {
      type: 'show',
      offset: offset.value,
      limit,
      search: search.value
    }
  })
  tvShows.value = res.data.results || []
  console.log('Fetched TV Shows:', tvShows.value)
  total.value = res.data.total || 0
  loading.value = false
}

function nextPage() {
  if (offset.value + limit < total.value) {
    offset.value += limit
    fetchTVShows()
  }
}
function prevPage() {
  if (offset.value >= limit) {
    offset.value -= limit
    fetchTVShows()
  }
}
function onSearch() {
  offset.value = 0
  fetchTVShows()
}

watch([offset, search], fetchTVShows, { immediate: true })
</script>

<style scoped>
.media-list { padding: 2rem; }
.media-grid { display: flex; flex-wrap: wrap; gap: 1.5rem; }
.pagination { margin-top: 1.5rem; display: flex; align-items: center; gap: 1rem; }
.search-bar { margin-bottom: 1rem; padding: 0.5rem 1rem; border-radius: 6px; border: 1px solid #334155; background: #181c24; color: #fff; font-size: 1rem; width: 100%; max-width: 340px; }
</style> 