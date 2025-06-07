<template>
  <table class="media-table">
    <thead>
      <tr>
        <th>Type</th>
        <th>Poster</th>
        <th>Title</th>
        <th>Year</th>
        <th>Summary</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in items" :key="item.key">
        <td>{{ item.type }}</td>
        <td>
          <img v-if="item.thumb_url" :src="item.thumb_url" :alt="item.title" class="table-poster" />
        </td>
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
defineProps(['items', 'addToQueue', 'isInQueue', 'isOnDrive'])
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
}
.table-poster {
  width: 50px;
  height: 75px;
  object-fit: cover;
  border-radius: 0.3rem;
  background: #1a202c;
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