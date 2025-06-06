<template>
  <form @submit.prevent="save" class="settings-form">
    <label>Media Path:</label>
    <input v-model="form.MEDIA_PATH" required />
    <button class="save-btn" type="submit">Save Media Settings</button>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const form = ref({ MEDIA_PATH: '' })

const save = async () => {
  try {
    await axios.post('/api/config', form.value)
    // Optionally emit setupComplete or notify
  } catch (err) {
    alert('Failed to save media settings')
  }
}
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
</style> 