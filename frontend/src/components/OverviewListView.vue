<template>
  <div class="overview-list">
    <div v-for="item in items" :key="item.key" class="overview-card">
      <img v-if="item.thumb_url" :src="item.thumb_url" :alt="item.title" class="overview-poster" />
      <div class="overview-info">
        <h3 class="title">{{ item.title }}</h3>
        <p v-if="item.year" class="year">{{ item.year }}</p>
        <p v-if="item.summary" class="summary">{{ item.summary }}</p>
        <button 
          class="add-btn" 
          @click="addToQueue(item)"
          :disabled="isInQueue(item.key) || isOnDrive(item)"
        >
          <span v-if="isOnDrive(item)">On Drive</span>
          <span v-else-if="isInQueue(item.key)">✓</span>
          <span v-else>+</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps(['items', 'addToQueue', 'isInQueue', 'isOnDrive'])
</script>

<style scoped>
.overview-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.overview-card {
  display: flex;
  background: #23293a;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  align-items: flex-start;
}
.overview-poster {
  width: 90px;
  height: 135px;
  object-fit: cover;
  border-radius: 0.5rem 0 0 0.5rem;
  background: #1a202c;
}
.overview-info {
  flex: 1;
  padding: 1rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.title {
  margin: 0;
  font-size: 1.1rem;
  color: #fff;
  font-weight: 600;
}
.year {
  color: #a0aec0;
  font-size: 0.95rem;
}
.summary {
  color: #bfc7d5;
  font-size: 0.98rem;
  margin: 0.5rem 0 0.5rem 0;
}
.add-btn {
  align-self: flex-start;
  margin-top: 0.5rem;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 1.2rem;
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