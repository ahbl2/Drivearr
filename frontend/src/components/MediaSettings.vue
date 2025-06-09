<template>
  <form @submit.prevent="save" class="settings-form">
    <label>Media Path:</label>
    <input v-model="form.MEDIA_PATH" required />
    <button type="button" class="detect-btn" @click="detectDrives">Detect Drives</button>
    <div v-if="drives.length" class="drives-list">
      <label>Select a drive:</label>
      <select v-model="form.MEDIA_PATH">
        <option v-for="d in drives" :key="d" :value="d">{{ d }}</option>
      </select>
    </div>
    <div v-if="driveStatusMsg" :class="['drive-status-msg', driveAttached ? 'attached' : 'detached']">{{ driveStatusMsg }}</div>
    <button class="save-btn" type="submit">Save Media Settings</button>
    <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>
  </form>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const form = ref({ MEDIA_PATH: '' })
const drives = ref([])
const successMsg = ref('')
const driveAttached = ref(true)
const driveStatusMsg = ref('')
let driveCheckInterval = null

const loadConfig = async () => {
  try {
    const res = await axios.get('/api/config')
    if (res.data && res.data.MEDIA_PATH) {
      form.value.MEDIA_PATH = res.data.MEDIA_PATH
    }
  } catch {}
}

const checkDriveStatus = async () => {
  try {
    const res = await axios.get('/api/usb/status')
    driveAttached.value = !!(res.data.present && res.data.mediaPath)
    if (driveAttached.value) {
      driveStatusMsg.value = `Drive attached: ${res.data.mediaPath}`
    } else {
      driveStatusMsg.value = 'No drive detected or drive is empty. Please attach a drive.'
      form.value.MEDIA_PATH = ''
    }
  } catch {
    driveAttached.value = false
    driveStatusMsg.value = 'No drive detected or drive is empty. Please attach a drive.'
    form.value.MEDIA_PATH = ''
  }
}

const detectDrives = async () => {
  try {
    const res = await axios.get('/api/usb/discover')
    drives.value = res.data.drives || []
    if (drives.value.length === 1) {
      form.value.MEDIA_PATH = drives.value[0]
    }
  } catch (err) {
    alert('Failed to detect drives')
  }
}

const save = async () => {
  try {
    await axios.post('/api/config', form.value)
    successMsg.value = 'Media path saved!'
    await loadConfig()
    setTimeout(() => { successMsg.value = '' }, 2500)
  } catch (err) {
    alert('Failed to save media settings')
  }
}

onMounted(() => {
  loadConfig()
  checkDriveStatus()
  driveCheckInterval = setInterval(checkDriveStatus, 5000)
})
onUnmounted(() => {
  if (driveCheckInterval) clearInterval(driveCheckInterval)
})
</script>

<style scoped>
.settings-form {
  background: #23293a;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  padding: 2.5rem 2rem 2rem 2rem;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  max-width: 900px;
  align-self: stretch;
  margin: 0;
}
@media (max-width: 900px) {
  .settings-form {
    max-width: none !important;
    width: 100% !important;
    margin: 0 !important;
    border-radius: 0;
    box-shadow: none;
    padding: 1rem 0.5rem;
  }
}
@media (max-width: 600px) {
  .settings-form {
    padding: 0.2rem 0.2rem;
  }
}
label {
  color: #bfc7d5;
  font-size: 1rem;
  margin-bottom: 0.2rem;
  align-self: flex-start;
}
input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.7rem 1rem;
  border-radius: 6px;
  border: 1px solid #334155;
  background: #181c24;
  color: #fff;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  transition: border 0.2s;
}
input:focus {
  border: 1.5px solid #3b82f6;
  outline: none;
}
.save-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.9rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1.5rem;
  cursor: pointer;
  transition: background 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  width: 100%;
  max-width: 340px;
}
.save-btn:hover {
  background: #2563eb;
}
.detect-btn {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.7rem 1.2rem;
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.7rem;
  cursor: pointer;
  transition: background 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
}
.detect-btn:hover {
  background: #3b82f6;
}
.drives-list {
  width: 100%;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
select {
  width: 100%;
  padding: 0.7rem 1rem;
  border-radius: 6px;
  border: 1px solid #334155;
  background: #181c24;
  color: #fff;
  font-size: 1rem;
}
.success-msg {
  color: #34d399;
  background: #23293a;
  border-radius: 6px;
  padding: 0.7rem 1.2rem;
  margin-top: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
}
.drive-status-msg {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  text-align: center;
}
.drive-status-msg.attached {
  color: #34d399;
}
.drive-status-msg.detached {
  color: #f87171;
}
</style> 