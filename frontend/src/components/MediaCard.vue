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
.media-card { width: 170px; background: #23293a; border-radius: 12px; overflow: hidden; }
.poster { width: 100%; height: 250px; object-fit: cover; }
.title { padding: 0.5rem; color: #fff; font-size: 1rem; text-align: center; }
</style> 