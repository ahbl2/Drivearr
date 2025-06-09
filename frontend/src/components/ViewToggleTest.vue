<template>
  <div style="margin: 2rem;">
    <div style="color: red;">mode: {{ mode }}</div>
    <button
      v-for="opt in options"
      :key="opt"
      :class="['toggle-btn', { active: mode === opt }]"
      :style="mode === opt ? 'background: red !important; color: yellow !important; border: 3px solid lime !important; z-index: 1000;' : ''"
      @click="mode = opt"
    >{{ opt }}</button>
    <div style="margin-top: 1rem; color: #333;">mode: {{ mode }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const options = ['posters', 'overview', 'table']
const mode = ref('posters')
</script>

<style>
.toggle-btn {
  background: #23293a;
  color: #fff;
  border: none;
  padding: 0.5rem 1.2rem;
  margin: 0 0.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}
.toggle-btn.active {
  background: #60a5fa;
  color: #fff;
  border-bottom: 3px solid #2563eb;
}
</style> 