<template>
  <div>
    <h2 class="section-title">TV Shows</h2>
    <div class="media-grid">
      <div
        v-for="show in library.tvShows"
        :key="show.key"
        class="media-card"
        @click="addToQueue(show)"
      >
        <div class="poster-wrapper">
          <img :src="show.thumb" :alt="show.title" class="poster" />
          <button class="add-btn" title="Add to Sync Queue">
            <i class="fa fa-plus"></i>
          </button>
        </div>
        <p class="media-title">{{ show.title }}</p>
      </div>
    </div>

    <h2 class="section-title">Movies</h2>
    <div class="media-grid">
      <div
        v-for="movie in library.movies"
        :key="movie.key"
        class="media-card"
        @click="addToQueue(movie)"
      >
        <div class="poster-wrapper">
          <img :src="movie.thumb" :alt="movie.title" class="poster" />
          <button class="add-btn" title="Add to Sync Queue">
            <i class="fa fa-plus"></i>
          </button>
        </div>
        <p class="media-title">{{ movie.title }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive } from 'vue'
import axios from 'axios'

const library = reactive({ tvShows: [], movies: [] })
const emit = defineEmits(['add'])

const addToQueue = (item) => {
  emit('add', item)
}

onMounted(async () => {
  const res = await axios.get('/api/plex/library')
  library.tvShows = res.data.tvShows
  library.movies = res.data.movies
})
</script>

<style scoped>
.section-title {
  color: #bfc7d5;
  font-size: 1.2rem;
  margin: 2rem 0 1rem 0;
  font-weight: 600;
  letter-spacing: 1px;
}
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.media-card {
  background: #23293a;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}
.media-card:hover {
  transform: translateY(-4px) scale(1.03);
  box-shadow: 0 6px 18px rgba(0,0,0,0.18);
}
.poster-wrapper {
  position: relative;
  width: 100%;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #181c24;
}
.poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0 0 10px 10px;
  transition: filter 0.2s;
}
.add-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  cursor: pointer;
}
.media-card:hover .add-btn {
  opacity: 1;
}
.add-btn:hover {
  background: #2563eb;
}
.media-title {
  color: #fff;
  font-size: 1rem;
  font-weight: 500;
  margin: 1rem 0 0.5rem 0;
  text-align: center;
  padding: 0 0.5rem;
  word-break: break-word;
}
</style>
