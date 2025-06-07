<template>
  <table class="media-table">
    <thead>
      <tr>
        <th @click="sortBy('title')" class="sortable">
          Title
          <span v-if="sortKey === 'title'">{{ sortAsc ? '▲' : '▼' }}</span>
        </th>
        <th @click="sortBy('year')" class="sortable">
          Year
          <span v-if="sortKey === 'year'">{{ sortAsc ? '▲' : '▼' }}</span>
        </th>
        <th>Summary</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in sortedItems" :key="item.key">
        <td>{{ item.title }}</td>
        <td>{{ item.year }}</td>
        <td>{{ item.summary }}</td>
        <td>
          <button 
            class="add-btn" 
            @click="addToQueue(item)"
            :disabled="isInQueue(item.key) || isOnDrive(item)"
          >
            <span v-if="isOnDrive(item)">On Drive</span>
            <span v-else-if="isInQueue(item.key)">✓</span>
            <span v-else>+</span>
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { ref, computed } from 'vue'
const props = defineProps(['items', 'addToQueue', 'isInQueue', 'isOnDrive'])
const sortKey = ref('title')
const sortAsc = ref(true)

function sortBy(key) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => {
    let aVal = a[sortKey.value] || ''
    let bVal = b[sortKey.value] || ''
    if (sortKey.value === 'year') {
      aVal = parseInt(aVal) || 0
      bVal = parseInt(bVal) || 0
    } else {
      aVal = aVal.toString().toLowerCase()
      bVal = bVal.toString().toLowerCase()
    }
    if (aVal < bVal) return sortAsc.value ? -1 : 1
    if (aVal > bVal) return sortAsc.value ? 1 : -1
    return 0
  })
})
</script>

<style scoped>
.media-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
  background: #23293a;
  color: #fff;
  border-radius: 0.5rem;
  overflow: hidden;
}
th, td {
  padding: 0.7rem 1rem;
  text-align: left;
  border-bottom: 1px solid #334155;
}
th {
  background: #181c24;
  color: #bfc7d5;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}
th.sortable:hover {
  background: #2563eb;
  color: #fff;
}
.add-btn {
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.3rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.add-btn:hover:not(:disabled) {
  background: #3182ce;
}
.add-btn:disabled {
  background: #48bb78;
  cursor: default;
}
</style> 