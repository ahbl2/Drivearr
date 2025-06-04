<template>
  <div class="setup-card">
    <h2 class="settings-title">Settings</h2>
    <p class="settings-desc">Please enter your initial configuration to get started.</p>

    <form @submit.prevent="save" class="settings-form">
      <label>Plex Base URL:</label>
      <input v-model="form.PLEX_BASE_URL" required />

      <label>Plex Token:</label>
      <input v-model="form.PLEX_TOKEN" required />

      <label>TV Media Path:</label>
      <input v-model="form.MEDIA_TV_DIR" required />

      <label>Movies Media Path:</label>
      <input v-model="form.MEDIA_MOVIES_DIR" required />

      <label>USB Mount Path:</label>
      <input v-model="form.USB_MOUNT_ROOT" required />

      <button class="save-btn" type="submit">Save & Launch</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const form = ref({
  PLEX_BASE_URL: '',
  PLEX_TOKEN: '',
  MEDIA_TV_DIR: '',
  MEDIA_MOVIES_DIR: '',
  USB_MOUNT_ROOT: ''
})

const emit = defineEmits(['setupComplete'])

const props = defineProps({
  notify: Function
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
</script>

<style scoped>
.setup-card {
  background: #23293a;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  max-width: 480px;
  margin: 3rem auto 0 auto;
  padding: 2.5rem 2rem 2rem 2rem;
  color: #fff;
}
.settings-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #bfc7d5;
  margin-bottom: 0.5rem;
  letter-spacing: 1px;
}
.settings-desc {
  color: #7c8493;
  font-size: 1rem;
  margin-bottom: 2rem;
}
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
label {
  color: #bfc7d5;
  font-size: 1rem;
  margin-bottom: 0.2rem;
}
input {
  width: 100%;
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
}
.save-btn:hover {
  background: #2563eb;
}
</style>
