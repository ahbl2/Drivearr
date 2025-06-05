<template>
  <div class="settings-card">
    <h2 class="settings-title">Plex Settings</h2>
    <form @submit.prevent="save" class="settings-form">
      <button type="button" class="plex-auth-btn" @click="authenticateWithPlex" :disabled="authenticating || !!form.PLEX_TOKEN">
        <i class="fa fa-key"></i>
        {{ authenticating ? 'Waiting for Plex...' : (form.PLEX_TOKEN ? 'Authenticated with Plex.tv' : 'Authenticate with Plex.tv') }}
      </button>
      <div v-if="authenticating" class="plex-auth-status">Waiting for authentication in Plex.tv...</div>
      <div v-if="!form.PLEX_TOKEN && !authenticating">
        <label>Plex Token (manual):</label>
        <input v-model="form.PLEX_TOKEN" placeholder="Paste token if not using OAuth" />
      </div>

      <label v-if="servers.length">Server:</label>
      <select v-if="servers.length" v-model="selectedServer" @change="onServerChange">
        <option v-for="server in servers" :key="server.clientIdentifier" :value="server">{{ server.name }}</option>
      </select>

      <label>Host:</label>
      <input v-model="form.PLEX_HOST" required />

      <label>Port:</label>
      <input v-model="form.PLEX_PORT" required type="number" min="1" max="65535" />

      <label><input type="checkbox" v-model="form.PLEX_SSL" /> Use SSL (HTTPS)</label>

      <div class="note">Media source paths are fetched from Plex automatically.</div>

      <button class="save-btn" type="submit">Save Plex Settings</button>
    </form>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from 'axios'

const form = ref({
  PLEX_TOKEN: '',
  PLEX_HOST: '',
  PLEX_PORT: 32400,
  PLEX_SSL: false
})

const servers = ref([])
const selectedServer = ref(null)
const authenticating = ref(false)
let pollInterval = null
let initialLoad = true

const emit = defineEmits(['setupComplete'])
const props = defineProps({
  notify: Function
})

const PLEX_CLIENT_ID = 'Drivearr-Client-001'

const authenticateWithPlex = async () => {
  authenticating.value = true
  try {
    // Get PIN from backend
    const { data } = await axios.post('/api/plex-auth/pin')
    const pinId = data.id
    
    // Open Plex auth page in new window
    const authWindow = window.open(data.oauthUrl, '_blank', 'width=800,height=600')
    
    let stopPolling = false
    // Poll for token every 2 seconds
    pollInterval = setInterval(async () => {
      if (stopPolling) return
      try {
        const { data: pollData } = await axios.get(`/api/plex-auth/token/${pinId}`)
        // Accept both auth_token and authToken for compatibility
        const token = pollData.auth_token || pollData.authToken
        if (token) {
          form.value.PLEX_TOKEN = token
          authenticating.value = false
          stopPolling = true
          clearInterval(pollInterval)
          if (authWindow) authWindow.close()
          if (props.notify) props.notify('Successfully authenticated with Plex.tv!', 'success')
          await fetchServers()
        }
      } catch (err) {
        // Only show error if it's not a 404 (which means auth is still pending)
        if (err.response?.status !== 404) {
          authenticating.value = false
          stopPolling = true
          clearInterval(pollInterval)
          if (authWindow) authWindow.close()
          if (props.notify) props.notify('Failed to authenticate with Plex.tv: ' + (err.response?.data?.error || err.message), 'error')
        }
      }
    }, 2000)

    // Clear interval after 5 minutes (timeout)
    setTimeout(() => {
      if (!stopPolling && pollInterval) {
        clearInterval(pollInterval)
        authenticating.value = false
        if (authWindow) authWindow.close()
        if (props.notify) props.notify('Authentication timed out. Please try again.', 'error')
      }
    }, 5 * 60 * 1000)
  } catch (err) {
    authenticating.value = false
    if (props.notify) props.notify('Failed to start Plex authentication: ' + (err.response?.data?.error || err.message), 'error')
  }
}

const fetchServers = async (autoFill = true) => {
  if (!form.value.PLEX_TOKEN) return
  try {
    const { data } = await axios.get(`/api/plex-auth/servers/${form.value.PLEX_TOKEN}`)
    servers.value = data.filter(s => s.provides && s.provides.includes('server'))
    if (servers.value.length && autoFill) {
      selectedServer.value = servers.value[0]
      fillServerFields(selectedServer.value, true)
    }
  } catch (err) {
    if (props.notify) props.notify('Failed to fetch Plex servers: ' + (err.response?.data?.error || err.message), 'error')
  }
}

const fillServerFields = (server, overwriteSSL = true) => {
  // Prefer local connection, fallback to first
  const conn = server.connections.find(c => c.local) || server.connections[0]
  form.value.PLEX_HOST = conn.address
  form.value.PLEX_PORT = conn.port
  if (overwriteSSL) {
    form.value.PLEX_SSL = conn.protocol === 'https'
  }
}

const onServerChange = () => {
  if (selectedServer.value) fillServerFields(selectedServer.value, true)
}

watch(() => form.value.PLEX_TOKEN, (newToken, oldToken) => {
  if (!initialLoad && newToken && newToken !== oldToken) {
    fetchServers(true)
  }
})

const save = async () => {
  try {
    await axios.post('/api/config', form.value)
    emit('setupComplete')
  } catch (err) {
    if (props.notify) props.notify('Failed to save config: ' + (err.response?.data?.error || err.message), 'error')
    else alert('Failed to save config')
    console.error(err)
  }
}

const loadConfig = async () => {
  try {
    const { data } = await axios.get('/api/config')
    form.value.PLEX_TOKEN = data.PLEX_TOKEN || ''
    form.value.PLEX_HOST = data.PLEX_HOST || ''
    form.value.PLEX_PORT = data.PLEX_PORT || 32400
    form.value.PLEX_SSL = !!data.PLEX_SSL
    if (form.value.PLEX_TOKEN) {
      await fetchServers(false)
    }
    initialLoad = false
  } catch (err) {
    if (props.notify) props.notify('Failed to load config: ' + (err.response?.data?.error || err.message), 'error')
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.settings-card {
  background: #23293a;
  border-radius: 0 12px 12px 0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  min-width: 340px;
  padding: 2.5rem 2rem 2rem 2rem;
  color: #fff;
  margin-left: -1px;
}
.settings-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #bfc7d5;
  margin-bottom: 1.2rem;
  letter-spacing: 1px;
}
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  width: 100%;
  align-items: center;
}
label {
  color: #bfc7d5;
  font-size: 1rem;
  margin-bottom: 0.2rem;
  align-self: flex-start;
}
input, select {
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
input:focus, select:focus {
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
.plex-auth-btn {
  background: #282c37;
  color: #f9a825;
  border: 1px solid #f9a825;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.7rem;
  margin-top: 0.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s, color 0.2s;
}
.plex-auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.plex-auth-status {
  color: #f9a825;
  font-size: 0.95rem;
  margin-bottom: 0.7rem;
}
.note {
  color: #f9a825;
  font-size: 0.95rem;
  margin-bottom: 0.7rem;
  margin-top: -0.7rem;
  text-align: left;
  width: 100%;
}
</style> 