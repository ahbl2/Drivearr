<template>
  <div>
    <h2>Drive History</h2>
    <div v-if="driveInfo">
      <h3>Drive Info</h3>
      <p>Label: {{ driveInfo.profile_label }}</p>
      <p>ID: {{ driveInfo.drive_id }}</p>
      <p>Last Sync: {{ driveInfo.last_sync || 'N/A' }}</p>
      <form @submit.prevent="handleAssignProfile" style="margin-top: 10px">
        <label>
          Profile Name:
          <input v-model="profileName" required />
        </label>
        <label style="margin-left: 10px">
          Label:
          <input v-model="profileLabel" required />
        </label>
        <button type="submit" :disabled="assigning" style="margin-left: 10px">
          {{ assigning ? 'Assigning...' : 'Update Profile' }}
        </button>
      </form>
      <p v-if="assignError" style="color: red">{{ assignError }}</p>
      <button @click="handleDeleteProfile" style="margin-top: 10px; color: red">
        Delete Drive Profile & History
      </button>
      <p v-if="deleteError" style="color: red">{{ deleteError }}</p>
    </div>
    <p v-else>No drive profile detected. You may need to connect a drive or assign a profile.</p>
    <input
      type="text"
      placeholder="Filter by title"
      v-model="filter"
      style="margin-top: 20px"
    />
    <p v-if="loading">Loading drive history...</p>
    <p v-if="error" style="color: red">{{ error }}</p>
    <p v-if="successMsg" style="color: green">{{ successMsg }}</p>
    <p v-if="!loading && !error && filteredHistory.length === 0">No history found.</p>
    <ul>
      <li v-for="(item, index) in filteredHistory" :key="index">
        {{ item.title }} - {{ item.type }} - {{ item.status }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const history = ref([])
const filter = ref('')
const driveInfo = ref(null)
const loading = ref(true)
const error = ref(null)
const assigning = ref(false)
const profileName = ref('')
const profileLabel = ref('')
const assignError = ref(null)
const deleteError = ref(null)
const successMsg = ref(null)

const fetchDriveData = async () => {
  loading.value = true
  error.value = null
  successMsg.value = null
  try {
    const profilesRes = await axios.get('/api/drives/profiles')
    if (profilesRes.data && profilesRes.data.length > 0) {
      driveInfo.value = profilesRes.data[0]
      profileName.value = profilesRes.data[0].profile_name
      profileLabel.value = profilesRes.data[0].profile_label
    } else {
      driveInfo.value = null
    }
    const historyRes = await axios.get('/api/drives/history/drive-123') // Replace with actual drive ID
    if (historyRes.data && historyRes.data.error) {
      error.value = historyRes.data.error
      history.value = []
    } else if (Array.isArray(historyRes.data)) {
      history.value = historyRes.data
    } else {
      console.log('Drive history API response:', historyRes.data)
      history.value = []
    }
  } catch (err) {
    error.value = 'Error fetching drive info or history.'
    history.value = []
  } finally {
    loading.value = false
  }
}

const handleAssignProfile = async () => {
  assigning.value = true
  assignError.value = null
  successMsg.value = null
  try {
    if (!driveInfo.value) {
      assignError.value = 'No drive detected.'
      return
    }
    await axios.post('/api/drives/assign-profile', {
      driveId: driveInfo.value.drive_id,
      profileName: profileName.value,
      profileLabel: profileLabel.value,
    })
    successMsg.value = 'Profile updated successfully.'
    fetchDriveData()
  } catch (err) {
    assignError.value = 'Failed to assign profile.'
  } finally {
    assigning.value = false
  }
}

const handleDeleteProfile = async () => {
  deleteError.value = null
  successMsg.value = null
  if (!driveInfo.value) {
    deleteError.value = 'No drive detected.'
    return
  }
  if (!window.confirm('Are you sure you want to delete this drive profile and all its history? This cannot be undone.')) return
  try {
    await axios.delete(`/api/drives/profile/${driveInfo.value.drive_id}`)
    successMsg.value = 'Drive profile and history deleted.'
    driveInfo.value = null
    history.value = []
  } catch (err) {
    deleteError.value = 'Failed to delete drive profile/history.'
  }
}

const filteredHistory = computed(() =>
  history.value.filter(item => item.title && item.title.toLowerCase().includes(filter.value.toLowerCase()))
)

onMounted(fetchDriveData)
</script> 