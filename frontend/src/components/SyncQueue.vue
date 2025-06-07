<template>
  <div class="sync-queue">
    <h3 class="queue-title">Sync Queue</h3>
    <div v-if="loading" class="empty-msg">Loading sync queue...</div>
    <div v-else-if="error" class="empty-msg">{{ error }}</div>
    <div v-else-if="queue && queue.length === 0" class="empty-msg">No items in the sync queue.</div>
    <div v-else class="queue-list">
      <div
        v-for="item in queue"
        :key="item.key || item.path"
        class="queue-card"
      >
        <div class="queue-info">
          <div class="queue-title-row">
            <span class="media-title">{{ item.title }}</span>
            <span v-if="item.season" class="media-ep">S{{ item.season }}E{{ item.episode }}</span>
          </div>
          <div class="status-tag" :class="statusMap[itemStatus(item).status] || 'pending'">
            {{ statusText(itemStatus(item).status) }}
          </div>
          <div v-if="itemStatus(item).status === 'syncing' || itemStatus(item).progress > 0" class="item-progress-bar">
            <div class="progress-bar-inner" :style="{ width: itemStatus(item).progress + '%' }"></div>
            <span class="progress-label">{{ itemStatus(item).progress }}%</span>
          </div>
        </div>
        <button class="remove-btn" @click="remove(item)" title="Remove from queue">
          <i class="fa fa-times"></i>
        </button>
      </div>
    </div>
    <div class="queue-controls">
      <button class="sync-btn" @click="startSync" :disabled="queue.length === 0 || syncing">
        <i class="fa fa-play"></i> Start Sync
      </button>
      <button class="pause-btn" @click="togglePause" :disabled="!syncing">
        <i :class="paused ? 'fa fa-play' : 'fa fa-pause'"></i> {{ paused ? 'Resume' : 'Pause' }}
      </button>
      <button class="clear-completed-btn" @click="clearCompleted" :disabled="!hasCompletedItems">
        <i class="fa fa-trash"></i> Clear Completed
      </button>
    </div>
    <div v-if="syncResult" class="sync-result">
      <p>✅ Copied: {{ syncResult.copied.length }}</p>
      <p>⏩ Skipped: {{ syncResult.skipped.length }}</p>
      <p>❌ Errors: {{ syncResult.errors.length }}</p>
    </div>
    <div class="pagination">
      <button @click="prevPage" :disabled="currentPage === 1">Previous</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button @click="nextPage" :disabled="currentPage === totalPages">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const queue = ref([])
const loading = ref(true)
const error = ref(null)
const syncing = ref(false)
const syncResult = ref(null)
const syncStatus = ref({ active: false, total: 0, completed: 0, items: [] })
let pollInterval = null
const paused = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const totalItems = ref(0)

const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value))

const hasCompletedItems = computed(() => {
  return queue.value.some(item => itemStatus(item).status === 'done' || itemStatus(item).status === 'skipped')
})

const statusMap = {
  ready: 'ready',
  syncing: 'syncing',
  done: 'done',
  error: 'error',
  skipped: 'skipped',
  pending: 'pending'
}

function statusText(status) {
  switch (status) {
    case 'ready': return 'Ready'
    case 'syncing': return 'Syncing'
    case 'done': return 'Done'
    case 'error': return 'Error'
    case 'skipped': return 'Already exists'
    default: return 'Pending'
  }
}

const remove = async (item) => {
  try {
    await axios.post('/api/sync/remove', { item })
    await fetchQueue()
  } catch (err) {
    alert('Failed to remove item from queue')
  }
}

function itemStatus(item) {
  const found = syncStatus.value.items.find(i => (i.key === item.key || i.key === item.path))
  return found || { status: 'pending', progress: 0 }
}

const overallProgress = computed(() => {
  if (!syncStatus.value.total) return 0
  let sum = syncStatus.value.items.reduce((acc, i) => acc + (i.progress || 0), 0)
  return Math.round(sum / syncStatus.value.total)
})

const pollSyncStatus = async () => {
  try {
    const res = await axios.get('/api/sync/status')
    syncStatus.value = res.data
    if (!res.data.active && syncing.value) {
      syncing.value = false
    }
  } catch (err) {
    // ignore polling errors
  }
}

const startSync = async () => {
  syncing.value = true
  syncResult.value = null
  syncStatus.value = { active: true, total: queue.value.length, completed: 0, items: [] }
  pollInterval = setInterval(pollSyncStatus, 1000)

  try {
    const res = await axios.post('/api/sync/start', { queue: queue.value })
    syncResult.value = res.data
    await pollSyncStatus()
  } catch (err) {
    alert('Sync failed: ' + (err.response?.data?.error || err.message))
    console.error(err)
  } finally {
    syncing.value = false
    clearInterval(pollInterval)
    pollInterval = null
  }
}

const togglePause = async () => {
  try {
    const res = await axios.post('/api/sync/pause', { paused: !paused.value })
    paused.value = res.data.paused
  } catch (err) {
    alert('Failed to toggle pause state')
  }
}

const clearCompleted = async () => {
  try {
    await axios.post('/api/sync/clear-completed')
    await fetchQueue()
  } catch (err) {
    alert('Failed to clear completed items')
  }
}

const fetchQueue = async () => {
  loading.value = true
  error.value = null
  try {
    const safePage = Math.max(1, currentPage.value)
    const res = await axios.get('/api/sync/queue', { params: { page: safePage, pageSize: pageSize.value } })
    queue.value = res.data.items
    totalItems.value = res.data.total
  } catch (err) {
    error.value = 'Failed to load sync queue.'
    queue.value = []
  } finally {
    loading.value = false
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchQueue()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchQueue()
  }
}

onMounted(async () => {
  await fetchQueue()
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<style scoped>
.sync-queue {
  margin-top: 2rem;
  width: 100%;
  box-sizing: border-box;
}
.queue-title {
  color: #bfc7d5;
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  letter-spacing: 1px;
}
.empty-msg {
  color: #7c8493;
  text-align: center;
  margin-bottom: 2rem;
}
.overall-progress-bar {
  width: 100%;
  height: 18px;
  background: #23293a;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
}
.progress-bar-inner {
  height: 100%;
  background: #3b82f6;
  border-radius: 8px;
  transition: width 0.3s;
}
.progress-label {
  position: absolute;
  right: 12px;
  top: 0;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 18px;
}
.queue-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  margin-bottom: 2rem;
}
.queue-card {
  background: #23293a;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2rem 1.5rem;
  position: relative;
  transition: box-shadow 0.15s, transform 0.15s;
  min-width: 0;
  word-break: break-word;
}
@media (max-width: 900px) {
  .queue-card {
    padding: 0.7rem 0.5rem;
  }
}
.queue-card:hover {
  box-shadow: 0 6px 18px rgba(0,0,0,0.18);
  transform: translateY(-2px) scale(1.01);
}
.queue-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
}
.queue-title-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.media-title {
  color: #fff;
  font-size: 1.1rem;
  font-weight: 500;
}
.media-ep {
  color: #7c8493;
  font-size: 0.98rem;
  font-weight: 400;
}
.status-tag {
  width: fit-content;
  min-width: 110px;
  text-align: center;
  font-size: 0.98rem;
  font-weight: 500;
  padding: 0.2rem 0.8rem;
  margin: 0.5rem 0 0.2rem 0;
  border-radius: 6px;
  letter-spacing: 0.5px;
  display: inline-block;
}
.status-tag.ready {
  background: #2563eb;
  color: #fff;
}
.status-tag.syncing {
  background: #3b82f6;
  color: #fff;
}
.status-tag.done {
  background: #34d399;
  color: #fff;
}
.status-tag.error {
  background: #f87171;
  color: #fff;
}
.status-tag.skipped {
  background: #fbbf24;
  color: #23293a;
}
.status-tag.pending {
  background: #64748b;
  color: #fff;
}
.item-progress-bar {
  width: 100%;
  height: 10px;
  background: #181c24;
  border-radius: 6px;
  margin-top: 0.5rem;
  position: relative;
  overflow: hidden;
}
.item-progress-bar .progress-bar-inner {
  height: 100%;
  background: #3b82f6;
  border-radius: 6px;
  transition: width 0.3s;
}
.item-progress-bar .progress-label {
  position: absolute;
  right: 8px;
  top: 0;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 500;
  line-height: 10px;
}
.remove-btn {
  background: #f87171;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background 0.2s;
  margin-left: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.remove-btn:hover {
  background: #dc2626;
}
.queue-controls {
  display: flex;
  gap: 1rem;
  margin: 1.5rem 0;
}
.sync-btn, .pause-btn, .clear-completed-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.8rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  cursor: pointer;
  transition: background 0.2s;
}
.sync-btn:disabled, .pause-btn:disabled, .clear-completed-btn:disabled {
  background: #334155;
  color: #bfc7d5;
  cursor: not-allowed;
}
.sync-btn:hover:not(:disabled), .pause-btn:hover:not(:disabled), .clear-completed-btn:hover:not(:disabled) {
  background: #2563eb;
}
.sync-result {
  margin-top: 2rem;
  background: #23293a;
  border-radius: 8px;
  padding: 1rem 1.5rem;
  color: #fff;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
}
.pagination {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}
.pagination button {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.pagination button:disabled {
  background: #334155;
  color: #bfc7d5;
  cursor: not-allowed;
}
.pagination button:hover:not(:disabled) {
  background: #2563eb;
}
</style>
