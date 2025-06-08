<template>
  <DynamicScroller
    :items="items"
    key-field="key"
    class="media-grid"
  >
    <template #default="{ item, index }">
      <DynamicScrollerItem :item="item" :active="true" :index="index">
        <div class="media-card" :key="item.key">
          <div class="poster-wrapper">
            <img v-if="item.thumb_url" :src="item.thumb_url" :alt="item.title" class="poster" />
            <div v-else class="no-poster">{{ item.title?.charAt(0) }}</div>
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
          <div class="media-info">
            <h3 class="title">{{ item.title }}</h3>
            <p v-if="item.year" class="year">{{ item.year }}</p>
          </div>
        </div>
      </DynamicScrollerItem>
    </template>
  </DynamicScroller>
</template>

<script setup>
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
defineProps(['items', 'addToQueue', 'isInQueue', 'isOnDrive'])
</script>

<style scoped>
@import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
.media-grid {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 2rem;
}
.media-card {
  background: #2d3748;
  border-radius: 0.5rem;
  overflow: hidden;
  transition: transform 0.2s;
  min-width: 0;
  width: 100%;
}
.media-card:hover {
  transform: translateY(-4px);
}
.poster-wrapper {
  position: relative;
  aspect-ratio: 2/3;
  background: #1a202c;
  min-width: 0;
  width: 100%;
}
.poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.no-poster {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #4a5568;
  background: #2d3748;
}
.add-btn {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #4299e1;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: background 0.2s;
}
.add-btn:hover:not(:disabled) {
  background: #3182ce;
}
.add-btn:disabled {
  background: #48bb78;
  cursor: default;
}
.media-info {
  padding: 1rem;
}
.title {
  margin: 0;
  font-size: 1rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.year {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: #a0aec0;
}
</style> 