<template>
  <div class="advanced-filters">
    <div class="filter-header" @click="isExpanded = !isExpanded">
      <h3>Advanced Filters</h3>
      <span class="expand-icon">{{ isExpanded ? '▼' : '▶' }}</span>
    </div>
    
    <div v-if="isExpanded" class="filter-content">
      <!-- Year Range -->
      <div class="filter-group">
        <label>Year Range</label>
        <div class="range-inputs">
          <input 
            type="number" 
            v-model.number="filters.yearStart" 
            placeholder="From"
            min="1900"
            max="2100"
          >
          <span>to</span>
          <input 
            type="number" 
            v-model.number="filters.yearEnd" 
            placeholder="To"
            min="1900"
            max="2100"
          >
        </div>
      </div>

      <!-- Genres -->
      <div class="filter-group">
        <label>Genres</label>
        <div class="genre-tags">
          <div 
            v-for="genre in availableGenres" 
            :key="genre"
            class="genre-tag"
            :class="{ active: filters.genres.includes(genre) }"
            @click="toggleGenre(genre)"
          >
            {{ genre }}
          </div>
        </div>
      </div>

      <!-- Rating Range -->
      <div class="filter-group">
        <label>Rating</label>
        <div class="range-inputs">
          <input 
            type="number" 
            v-model.number="filters.minRating" 
            placeholder="Min"
            min="0"
            max="10"
            step="0.1"
          >
          <span>to</span>
          <input 
            type="number" 
            v-model.number="filters.maxRating" 
            placeholder="Max"
            min="0"
            max="10"
            step="0.1"
          >
        </div>
      </div>

      <!-- Duration Range (Movies only) -->
      <div v-if="type === 'movie'" class="filter-group">
        <label>Duration (minutes)</label>
        <div class="range-inputs">
          <input 
            type="number" 
            v-model.number="filters.minDuration" 
            placeholder="Min"
            min="0"
          >
          <span>to</span>
          <input 
            type="number" 
            v-model.number="filters.maxDuration" 
            placeholder="Max"
            min="0"
          >
        </div>
      </div>

      <!-- Status (TV Shows only) -->
      <div v-if="type === 'show'" class="filter-group">
        <label>Status</label>
        <select v-model="filters.status">
          <option value="">Any</option>
          <option value="continuing">Ongoing</option>
          <option value="ended">Ended</option>
        </select>
      </div>

      <!-- Season Count (TV Shows only) -->
      <div v-if="type === 'show'" class="filter-group">
        <label>Seasons</label>
        <div class="range-inputs">
          <input 
            type="number" 
            v-model.number="filters.minSeasons" 
            placeholder="Min"
            min="0"
          >
          <span>to</span>
          <input 
            type="number" 
            v-model.number="filters.maxSeasons" 
            placeholder="Max"
            min="0"
          >
        </div>
      </div>

      <!-- Filter Actions -->
      <div class="filter-actions">
        <button class="clear-btn" @click="clearFilters">Clear Filters</button>
        <button class="apply-btn" @click="applyFilters">Apply Filters</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import useFilters from '../composables/useFilters'

export default {
  name: 'AdvancedFilters',
  props: {
    type: {
      type: String,
      required: true,
      validator: value => ['movie', 'show'].includes(value)
    },
    availableGenres: {
      type: Array,
      default: () => []
    }
  },
  setup(props, { emit }) {
    const isExpanded = ref(false)
    const { filters, hasActiveFilters, clearFilters, getActiveFilters } = useFilters(props.type)

    function toggleGenre(genre) {
      const index = filters.value.genres.indexOf(genre)
      if (index === -1) {
        filters.value.genres.push(genre)
      } else {
        filters.value.genres.splice(index, 1)
      }
    }

    function handleClearFilters() {
      clearFilters()
      emit('filters-cleared')
    }

    function handleApplyFilters() {
      emit('filters-applied', getActiveFilters())
    }

    return {
      isExpanded,
      filters,
      hasActiveFilters,
      toggleGenre,
      handleClearFilters,
      handleApplyFilters
    }
  }
}
</script>

<style scoped>
.advanced-filters {
  background: #2a2a2a;
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden;
}

.filter-header {
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: #333;
  transition: background-color 0.2s;
}

.filter-header:hover {
  background: #3a3a3a;
}

.filter-header h3 {
  margin: 0;
  font-size: 1.1em;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-header h3::after {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1a73e8;
  opacity: 0;
  transition: opacity 0.2s;
}

.filter-header h3:has(+ .has-filters)::after {
  opacity: 1;
}

.expand-icon {
  color: #888;
  font-size: 0.8em;
}

.filter-content {
  padding: 20px;
}

.filter-group {
  margin-bottom: 20px;
}

.filter-group label {
  display: block;
  margin-bottom: 8px;
  color: #ccc;
  font-size: 0.9em;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
}

.range-inputs input {
  flex: 1;
  padding: 8px;
  border: 1px solid #444;
  border-radius: 4px;
  background: #333;
  color: #fff;
}

.range-inputs span {
  color: #888;
}

.genre-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.genre-tag {
  padding: 6px 12px;
  background: #333;
  border: 1px solid #444;
  border-radius: 16px;
  color: #ccc;
  cursor: pointer;
  transition: all 0.2s;
}

.genre-tag:hover {
  background: #3a3a3a;
}

.genre-tag.active {
  background: #4a4a4a;
  border-color: #666;
  color: #fff;
}

select {
  width: 100%;
  padding: 8px;
  border: 1px solid #444;
  border-radius: 4px;
  background: #333;
  color: #fff;
}

.filter-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.filter-actions button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.clear-btn {
  background: #444;
  color: #ccc;
}

.clear-btn:hover {
  background: #555;
}

.apply-btn {
  background: #1a73e8;
  color: #fff;
}

.apply-btn:hover {
  background: #1557b0;
}
</style> 