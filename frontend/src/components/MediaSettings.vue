<template>
  <div class="settings-card">
    <h2 class="settings-title">Media Paths</h2>
    <div class="note">Media source paths are fetched from Plex automatically. Export folders (TV Shows, Movies) will be created on your USB drive if needed.</div>
    <form @submit.prevent="save" class="settings-form">
      <label>USB Mount Path:</label>
      <input v-model="form.USB_MOUNT_ROOT" required placeholder="/mnt/usb or D:/Drivearr" />
      <button class="save-btn" type="submit">Save USB Path</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const form = ref({
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
.note {
  color: #f9a825;
  font-size: 0.95rem;
  margin-bottom: 0.7rem;
  margin-top: -0.7rem;
  text-align: left;
  width: 100%;
}
</style> 