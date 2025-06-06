<template>
  <div class="media-card">
    <img :src="media.thumb" :alt="media.title" class="poster" />
    <div class="title">{{ media.title }}</div>
  </div>
</template>

<script setup>
defineProps({ media: Object })
</script>

<style scoped>
.media-card { background: #23293a; border-radius: 12px; overflow: hidden; width: 100%; }
.poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; height: auto; }
.title { padding: 0.5rem; color: #fff; font-size: 1rem; text-align: center; }
</style> 