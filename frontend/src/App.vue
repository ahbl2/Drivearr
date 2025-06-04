<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="logo">🎬</span>
        <span class="app-title">Drivearr</span>
      </div>
      <nav class="sidebar-nav">
        <button :class="{active: currentView === 'library'}" @click="navigate('library')">
          <i class="fa fa-film"></i>
          <span>Library</span>
        </button>
        <button :class="{active: currentView === 'sync'}" @click="navigate('sync')">
          <i class="fa fa-exchange-alt"></i>
          <span>Sync Queue</span>
        </button>
        <button :class="{active: currentView === 'settings'}" @click="navigate('settings')">
          <i class="fa fa-cog"></i>
          <span>Settings</span>
        </button>
      </nav>
    </aside>
    <div class="main-content">
      <header class="topbar">
        <h1>Drivearr</h1>
        <!-- Future: Quick actions, status, user menu -->
      </header>
      <main class="content-area">
        <component
          :is="currentComponent"
          v-bind="currentProps"
          v-on="currentListeners"
        />
      </main>
      <Notification :message="notification.message" :type="notification.type" v-if="notification.message" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import InitialSetup from './components/InitialSetup.vue'
import LibraryBrowser from './components/LibraryBrowser.vue'
import SyncQueue from './components/SyncQueue.vue'
import Notification from './components/Notification.vue'

const currentView = ref('library')
const queue = ref([])
const notification = ref({ message: '', type: 'error' })

function notify(message, type = 'error') {
  notification.value = { message, type }
  setTimeout(() => {
    notification.value = { message: '', type: 'error' }
  }, 5000)
}

function navigate(view) {
  if (['library', 'sync', 'settings'].includes(view)) currentView.value = view
}

// Event handlers
function handleAddToQueue(item) {
  if (!queue.value.find(q => q.key === item.key)) {
    queue.value.push(item)
  }
}
function handleRemoveFromQueue(item) {
  queue.value = queue.value.filter(q => q.key !== item.key)
}
function handleSetupComplete() {
  navigate('library')
}

const currentComponent = computed(() => {
  if (currentView.value === 'library') return LibraryBrowser
  if (currentView.value === 'sync') return SyncQueue
  if (currentView.value === 'settings') return InitialSetup
  return LibraryBrowser
})

const currentProps = computed(() => {
  if (currentView.value === 'sync') {
    return { queue: queue.value, onRemove: handleRemoveFromQueue, notify }
  }
  if (currentView.value === 'settings') {
    return { notify }
  }
  return { notify }
})

const currentListeners = computed(() => {
  if (currentView.value === 'library') {
    return { add: handleAddToQueue }
  }
  if (currentView.value === 'settings') {
    return { setupComplete: handleSetupComplete }
  }
  return {}
})
</script>

<style>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

body {
  margin: 0;
  font-family: 'Segoe UI', 'Roboto', 'Arial', sans-serif;
  background: #181c24;
}
.app-layout {
  display: flex;
  min-height: 100vh;
  background: #181c24;
}
.sidebar {
  width: 220px;
  background: #23293a;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 0;
  box-shadow: 2px 0 8px rgba(0,0,0,0.08);
}
.sidebar-header {
  display: flex;
  align-items: center;
  padding: 1.5rem 1rem 1rem 1rem;
  font-size: 1.3rem;
  font-weight: bold;
  border-bottom: 1px solid #23293a;
}
.logo {
  font-size: 2rem;
  margin-right: 0.5rem;
}
.app-title {
  font-size: 1.2rem;
  letter-spacing: 1px;
}
.sidebar-nav {
  display: flex;
  flex-direction: column;
  margin-top: 2rem;
}
.sidebar-nav button {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: #bfc7d5;
  font-size: 1rem;
  padding: 0.9rem 1.5rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  border-left: 4px solid transparent;
  margin-bottom: 0.5rem;
}
.sidebar-nav button i {
  margin-right: 1rem;
  font-size: 1.2rem;
}
.sidebar-nav button.active, .sidebar-nav button:hover {
  background: #1a2030;
  color: #fff;
  border-left: 4px solid #3b82f6;
}
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar {
  background: #23293a;
  color: #fff;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #23293a;
  min-height: 64px;
}
.topbar h1 {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
}
.content-area {
  flex: 1;
  padding: 2rem 2.5rem;
  background: #181c24;
  min-height: 0;
}
button {
  background: none;
  color: inherit;
  font-weight: bold;
  border: none;
  cursor: pointer;
}
button:focus {
  outline: 2px solid #3b82f6;
}
</style> 