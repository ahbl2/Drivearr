<template>
  <div class="dashboard">
    <h2>Newest TV Shows</h2>
    <div class="media-grid">
      <MediaCard v-for="show in newestTV" :key="show.key" :media="show" />
    </div>
    <router-link to="/library/tv" class="see-all">See all TV Shows</router-link>

    <h2>Newest Movies</h2>
    <div class="media-grid">
      <MediaCard v-for="movie in newestMovies" :key="movie.key" :media="movie" />
    </div>
    <router-link to="/library/movies" class="see-all">See all Movies</router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import MediaCard from './MediaCard.vue'

const newestTV = ref([])
const newestMovies = ref([])

onMounted(async () => {
  const tvRes = await axios.get('/api/plex/library', { params: { type: 'show', limit: 10, offset: 0 } })
  newestTV.value = tvRes.data.results || []
  const movieRes = await axios.get('/api/plex/library', { params: { type: 'movie', limit: 10, offset: 0 } })
  newestMovies.value = movieRes.data.results || []
})
</script>

<style scoped>
.dashboard { padding: 2rem; }
.media-grid { display: flex; flex-wrap: wrap; gap: 1.5rem; }
.see-all { display: block; margin: 1rem 0 2rem 0; color: #3b82f6; }
</style> 