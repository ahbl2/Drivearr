<template>
  <div class="library-header">
    <h2 class="header-title">Browse {{ title }}</h2>
    <div class="header-controls">
      <div class="view-toggle">
        <button v-for="opt in viewOptions" :key="opt.value" :class="['view-btn', { active: opt.value === viewMode }]" @click="$emit('update:viewMode', opt.value)">
          <i :class="opt.icon"></i> {{ opt.label }}
        </button>
      </div>
      <div class="filters">
        <input type="number" v-model="yearFilterLocal" @change="onYearChange" placeholder="Year..." class="year-input" />
        <div class="alpha-pagination">
          <button v-for="letter in alphaLetters" :key="letter" :class="['alpha-btn', { active: letter === activeLetter }]" @click="$emit('update:alpha', letter)">{{ letter }}</button>
        </div>
      </div>
      <div class="search-container">
        <input v-model="searchLocal" @input="onSearchInput" :placeholder="`Search ${title}...`" class="search-bar" />
      </div>
    </div>
    <div class="pagination-row">
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({
  title: String,
  viewMode: String,
  viewOptions: Array,
  yearFilter: [String, Number],
  alphaLetters: Array,
  activeLetter: String,
  search: String,
  currentPage: Number,
  totalPages: Number
})
const emit = defineEmits(['update:viewMode', 'update:year', 'update:alpha', 'update:search', 'prevPage', 'nextPage'])
const yearFilterLocal = ref(props.yearFilter)
const searchLocal = ref(props.search)
watch(() => props.yearFilter, val => yearFilterLocal.value = val)
watch(() => props.search, val => searchLocal.value = val)
function onYearChange() {
  emit('update:year', yearFilterLocal.value)
}
function onSearchInput() {
  emit('update:search', searchLocal.value)
}
</script>

<style scoped>
.library-header {
  padding: 1.5rem 2rem 1rem 2rem;
  background: #181c24;
  border-radius: 0.7rem;
  margin-bottom: 2rem;
}
.header-title {
  color: #bfc7d5;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.2rem;
}
.header-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  margin-bottom: 1.2rem;
}
.view-toggle {
  display: flex;
  gap: 0.5rem;
}
.view-btn {
  background: #23293a;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.view-btn.active, .view-btn:hover {
  background: #3b82f6;
  color: #fff;
}
.filters {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.year-input {
  width: 90px;
  padding: 0.4rem;
  border: 1px solid #2d3748;
  border-radius: 0.5rem;
  background: #1a202c;
  color: #fff;
}
.alpha-pagination {
  display: flex;
  gap: 0.2rem;
}
.alpha-btn {
  background: #23293a;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 0.3rem 0.7rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.alpha-btn.active, .alpha-btn:hover {
  background: #3b82f6;
  color: #fff;
}
.search-container {
  min-width: 200px;
}
.search-bar {
  width: 100%;
  max-width: 250px;
  padding: 0.4rem 1rem;
  border: 1px solid #2d3748;
  border-radius: 0.5rem;
  background: #1a202c;
  color: #fff;
}
.pagination-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}
.pagination-row button {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.pagination-row button:disabled {
  background: #334155;
  color: #bfc7d5;
  cursor: not-allowed;
}
</style> 