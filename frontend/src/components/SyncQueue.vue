<template>
  <div class="sync-queue">
    <h3 class="queue-title">Sync Queue</h3>
    <div v-if="queue.length === 0" class="empty-msg">No items in the sync queue.</div>
    <div v-if="overallProgress > 0 && syncing" class="overall-progress-bar">
      <div class="progress-bar-inner" :style="{ width: overallProgress + '%' }"></div>
      <span class="progress-label">{{ overallProgress }}%</span>
    </div>
    <div class="queue-list">
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
    <button class="sync-btn" @click="startSync" :disabled="queue.length === 0 || syncing">
      <i class="fa fa-play"></i> Start Sync
    </button>

    <div v-if="syncResult" class="sync-result">
      <p>✅ Copied: {{ syncResult.copied.length }}</p>
      <p>⏩ Skipped: {{ syncResult.skipped.length }}</p>
      <p>❌ Errors: {{ syncResult.errors.length }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import axios from 'axios'

const props = defineProps({
  queue: Array,
  onRemove: Function,
  notify: Function
})

const syncing = ref(false)
const syncResult = ref(null)
const syncStatus = ref({ active: false, total: 0, completed: 0, items: [] })
let pollInterval = null

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
    case 'skipped': return 'Skipped'
    default: return 'Pending'
  }
}

const remove = (item) => {
  props.onRemove(item)
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
  syncStatus.value = { active: true, total: props.queue.length, completed: 0, items: [] }
  pollInterval = setInterval(pollSyncStatus, 1000)

  try {
    const res = await axios.post('/api/sync/start', { queue: props.queue })
    syncResult.value = res.data
    await pollSyncStatus()
  } catch (err) {
    if (props.notify) props.notify('Sync failed: ' + (err.response?.data?.error || err.message), 'error')
    else alert('Sync failed')
    console.error(err)
  } finally {
    syncing.value = false
    clearInterval(pollInterval)
    pollInterval = null
  }
}

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<style scoped>
.sync-queue {
  margin-top: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
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
.sync-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.8rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 1.5rem auto 0 auto;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  cursor: pointer;
  transition: background 0.2s;
  width: 100%;
  max-width: 340px;
}
.sync-btn:disabled {
  background: #334155;
  color: #bfc7d5;
  cursor: not-allowed;
}
.sync-btn:hover:not(:disabled) {
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
</style>
