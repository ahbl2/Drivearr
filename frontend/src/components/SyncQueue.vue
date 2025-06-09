<template>
  <div class="sync-queue">
    <h3 class="queue-title">Sync Queue</h3>
    <div v-if="driveStatusMsg" :class="['drive-status-msg', driveAttached ? 'attached' : 'detached']">{{ driveStatusMsg }}</div>
    <div v-if="driveCheckError" class="empty-msg" style="color:#f87171; font-weight:600;">{{ driveCheckError }}</div>
    
    <!-- Overall Progress -->
    <div v-if="syncing" class="overall-progress">
      <div class="overall-progress-bar">
        <div class="progress-bar-inner" :style="{ width: overallProgress + '%' }"></div>
        <span class="progress-label">{{ overallProgress }}%</span>
      </div>
      <div class="progress-stats">
        <span>Total: {{ syncStatus.total }}</span>
        <span>Completed: {{ syncStatus.completed }}</span>
        <span>Remaining: {{ syncStatus.total - syncStatus.completed }}</span>
      </div>
    </div>

    <div v-if="loading" class="empty-msg">Loading sync queue...</div>
    <div v-else-if="error" class="empty-msg">{{ error }}</div>
    <div v-else-if="queue && queue.length === 0" class="empty-msg">No items in the sync queue.</div>
    <div v-else class="queue-list">
      <div
        v-for="item in queue"
        :key="item.key || item.path"
        class="queue-card"
        :class="{ 'has-error': getItemError(item) }"
      >
        <div class="queue-info">
          <div class="queue-title-row">
            <span class="media-title">{{ item.title }}</span>
            <span v-if="item.season" class="media-ep">S{{ item.season }}E{{ item.episode }}</span>
            <span v-if="item.type" class="media-type">{{ item.type }}</span>
          </div>
          <div class="status-tag" :class="statusMap[itemStatus(item).status] || 'pending'">
            {{ statusText(itemStatus(item).status) }}
          </div>
          <div v-if="itemStatus(item).status === 'syncing' || itemStatus(item).progress > 0" class="item-progress-bar">
            <div class="progress-bar-inner" :style="{ width: itemStatus(item).progress + '%' }"></div>
            <span class="progress-label">{{ itemStatus(item).progress }}%</span>
          </div>
          <div v-if="getItemError(item)" class="item-error-msg">
            <i class="fa fa-exclamation-triangle"></i>
            <span>{{ getItemError(item) }}</span>
            <button v-if="canRetry(item)" class="retry-btn" @click="retryItem(item)">
              <i class="fa fa-redo"></i> Retry
            </button>
          </div>
          <div v-if="itemStatus(item).status === 'done'" class="item-success-msg">
            <i class="fa fa-check-circle"></i>
            <span>Successfully synced</span>
          </div>
        </div>
        <div class="queue-actions">
          <button 
            v-if="canRetry(item)" 
            class="retry-btn" 
            @click="retryItem(item)"
            title="Retry sync"
          >
            <i class="fa fa-redo"></i>
          </button>
          <button 
            class="remove-btn" 
            @click="remove(item)" 
            title="Remove from queue"
            :disabled="itemStatus(item).status === 'syncing'"
          >
            <i class="fa fa-times"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="queue-controls">
      <button 
        class="sync-btn" 
        @click="startSync" 
        :disabled="queue.length === 0 || syncing || !driveAttached"
      >
        <i class="fa fa-play"></i> Start Sync
      </button>
      <button 
        class="pause-btn" 
        @click="togglePause" 
        :disabled="!syncing"
      >
        <i :class="paused ? 'fa fa-play' : 'fa fa-pause'"></i> 
        {{ paused ? 'Resume' : 'Pause' }}
      </button>
      <button 
        class="clear-completed-btn" 
        @click="clearCompleted" 
        :disabled="!hasCompletedItems"
      >
        <i class="fa fa-trash"></i> Clear Completed
      </button>
    </div>
    <div v-if="syncResult" class="sync-result">
      <div class="result-item success">
        <i class="fa fa-check-circle"></i>
        <span>Copied: {{ syncResult.copied.length }}</span>
      </div>
      <div class="result-item skipped">
        <i class="fa fa-forward"></i>
        <span>Skipped: {{ syncResult.skipped.length }}</span>
      </div>
      <div class="result-item error">
        <i class="fa fa-exclamation-circle"></i>
        <span>Errors: {{ syncResult.errors.length }}</span>
      </div>
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
import { useToast } from 'vue-toastification'

const toast = useToast()
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

const driveAttached = ref(true)
const driveCheckError = ref('')
let driveCheckInterval = null
const driveStatusMsg = ref('')
const currentDrive = ref('')

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

function canRetry(item) {
  const status = itemStatus(item)
  return status.status === 'error' || (status.status === 'skipped' && getItemError(item))
}

async function retryItem(item) {
  try {
    await axios.post('/api/sync/retry', { item })
    await fetchQueue()
    toast.success(`Retrying sync for ${item.title}`)
  } catch (err) {
    toast.error('Failed to retry sync')
    console.error('Error retrying sync:', err)
  }
}

const remove = async (item) => {
  try {
    await axios.post('/api/sync/remove', { item })
    await fetchQueue()
    toast.success(`Removed ${item.title} from queue`)
  } catch (err) {
    toast.error('Failed to remove item from queue')
    console.error('Error removing item:', err)
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
      if (res.data.items.some(i => i.status === 'error')) {
        toast.error('Some items failed to sync. Check the queue for details.')
      } else {
        toast.success('Sync completed successfully')
      }
    }
  } catch (err) {
    console.error('Error polling sync status:', err)
  }
}

const startSync = async () => {
  if (!driveAttached.value) {
    toast.error('No drive detected. Please attach a drive to enable syncing.')
    return
  }

  syncing.value = true
  syncResult.value = null
  syncStatus.value = { active: true, total: queue.value.length, completed: 0, items: [] }
  pollInterval = setInterval(pollSyncStatus, 1000)

  try {
    const res = await axios.post('/api/sync/start', { queue: queue.value })
    syncResult.value = res.data
    await pollSyncStatus()
  } catch (err) {
    toast.error('Sync failed: ' + (err.response?.data?.error || err.message))
    console.error('Sync error:', err)
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
    toast.info(paused.value ? 'Sync paused' : 'Sync resumed')
  } catch (err) {
    toast.error('Failed to toggle pause state')
    console.error('Error toggling pause:', err)
  }
}

const clearCompleted = async () => {
  try {
    await axios.post('/api/sync/clear-completed')
    await fetchQueue()
    toast.success('Cleared completed items')
  } catch (err) {
    toast.error('Failed to clear completed items')
    console.error('Error clearing completed items:', err)
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
    toast.error('Failed to load sync queue')
    console.error('Error fetching queue:', err)
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

async function checkDriveStatus() {
  try {
    const res = await axios.get('/api/usb/status')
    currentDrive.value = res.data.syncDrivePath || ''
    driveAttached.value = !!(res.data.present && res.data.syncDrivePath)
    if (driveAttached.value) {
      driveStatusMsg.value = `Drive attached: ${currentDrive.value}`
      driveCheckError.value = ''
    } else {
      driveStatusMsg.value = ''
      driveCheckError.value = 'No drive detected or drive is empty. Please attach a drive to enable syncing.'
    }
  } catch (err) {
    driveAttached.value = false
    currentDrive.value = ''
    driveStatusMsg.value = ''
    driveCheckError.value = 'Failed to check drive status. Please try again.'
    console.error('Error checking drive status:', err)
  }
}

onMounted(async () => {
  await fetchQueue()
  await checkDriveStatus()
  driveCheckInterval = setInterval(checkDriveStatus, 5000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (driveCheckInterval) clearInterval(driveCheckInterval)
})

function getItemError(item) {
  const status = itemStatus(item)
  if (status.status === 'error' && status.error) return status.error
  if (syncResult.value && Array.isArray(syncResult.value.errors)) {
    const found = syncResult.value.errors.find(e => (e.item.key || e.item.path) === (item.key || item.path))
    if (found) return found.error
  }
  return null
}
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

.overall-progress {
  margin-bottom: 2rem;
}

.overall-progress-bar {
  width: 100%;
  height: 18px;
  background: #23293a;
  border-radius: 8px;
  margin-bottom: 0.5rem;
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

.progress-stats {
  display: flex;
  justify-content: space-between;
  color: #7c8493;
  font-size: 0.9rem;
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

.queue-card.has-error {
  border-left: 4px solid #f87171;
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

.media-type {
  color: #7c8493;
  font-size: 0.9rem;
  font-weight: 400;
  text-transform: uppercase;
  padding: 0.2rem 0.5rem;
  background: #334155;
  border-radius: 4px;
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

.queue-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;
}

.remove-btn, .retry-btn {
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}

.retry-btn {
  background: #3b82f6;
}

.remove-btn:hover {
  background: #dc2626;
}

.retry-btn:hover {
  background: #2563eb;
}

.remove-btn:disabled {
  background: #64748b;
  cursor: not-allowed;
}

.queue-controls {
  display: flex;
  gap: 1rem;
  margin: 1.5rem 0;
}

.sync-btn, .pause-btn, .clear-completed-btn {
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sync-btn {
  background: #3b82f6;
  color: #fff;
}

.sync-btn:hover {
  background: #2563eb;
}

.sync-btn:disabled {
  background: #64748b;
  cursor: not-allowed;
}

.pause-btn {
  background: #fbbf24;
  color: #23293a;
}

.pause-btn:hover {
  background: #f59e0b;
}

.pause-btn:disabled {
  background: #64748b;
  cursor: not-allowed;
}

.clear-completed-btn {
  background: #64748b;
  color: #fff;
}

.clear-completed-btn:hover {
  background: #475569;
}

.clear-completed-btn:disabled {
  background: #334155;
  cursor: not-allowed;
}

.sync-result {
  display: flex;
  gap: 1.5rem;
  margin: 1.5rem 0;
  padding: 1rem;
  background: #23293a;
  border-radius: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.result-item.success {
  color: #34d399;
}

.result-item.skipped {
  color: #fbbf24;
}

.result-item.error {
  color: #f87171;
}

.item-error-msg {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f87171;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.item-success-msg {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #34d399;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.pagination button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.pagination button:hover {
  background: #2563eb;
}

.pagination button:disabled {
  background: #64748b;
  cursor: not-allowed;
}

.drive-status-msg {
  padding: 0.8rem 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  font-weight: 500;
}

.drive-status-msg.attached {
  background: #34d399;
  color: #fff;
}

.drive-status-msg.detached {
  background: #f87171;
  color: #fff;
}
</style>
