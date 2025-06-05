<template>
  <div class="app-layout">
    <header class="main-header">
      <div class="header-left">
        <span class="logo">🎞️</span>
        <span class="app-title">Drivearr</span>
      </div>
      <div class="header-right">
        <div class="search-bar-wrapper">
          <input class="search-bar" type="text" v-model="searchQuery" placeholder="Search..." :disabled="currentView !== 'library'" />
          <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''" title="Clear search"><i class="fa fa-times"></i></button>
        </div>
        <i class="fa fa-bell header-icon"></i>
        <div class="user-menu-wrapper">
          <i class="fa fa-user-circle header-icon user-icon" @click="toggleUserMenu" />
          <div v-if="showUserMenu" class="user-menu-dropdown">
            <div class="user-menu-item" @click="goToProfile">Profile</div>
            <div class="user-menu-item" @click="navigate('settings')">Settings</div>
            <div class="user-menu-item" @click="logout">Logout</div>
          </div>
        </div>
      </div>
    </header>
    <aside class="sidebar">
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import InitialSetup from './components/InitialSetup.vue'
import LibraryBrowser from './components/LibraryBrowser.vue'
import SyncQueue from './components/SyncQueue.vue'
import Notification from './components/Notification.vue'

const currentView = ref('library')
const queue = ref([])
const notification = ref({ message: '', type: 'error' })
const searchQuery = ref('')
const showUserMenu = ref(false)

function notify(message, type = 'error') {
  notification.value = { message, type }
  setTimeout(() => {
    notification.value = { message: '', type: 'error' }
  }, 5000)
}

function navigate(view) {
  if (['library', 'sync', 'settings'].includes(view)) currentView.value = view
  showUserMenu.value = false
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
}

function goToProfile() {
  notify('Profile feature coming soon!', 'info')
  showUserMenu.value = false
}

function logout() {
  notify('Logout feature coming soon!', 'info')
  showUserMenu.value = false
}

function handleClickOutside(event) {
  if (!event.target.closest('.user-menu-wrapper')) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

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
  if (currentView.value === 'library') {
    return { notify, searchQuery: searchQuery.value }
  }
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

html, body, .main-header, .sidebar, .main-content, .content-area, button, input, select, textarea {
  font-family: Roboto, "open sans", "Helvetica Neue", Helvetica, Arial, sans-serif !important;
  font-size: 14px !important;
  font-weight: 400 !important;
}
.app-title, .section-title, .queue-title {
  font-weight: 600 !important;
}

body {
  margin: 0;
  background: #181c24;
}
.app-layout {
  display: flex;
  min-height: 100vh;
  background: #181c24;
}
.main-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #2563eb;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  padding: 0 2rem;
  border-bottom: 1.5px solid #1a2030;
  font-family: Roboto, "open sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
}
.header-left, .header-right {
  font-family: inherit;
  font-size: inherit;
}
.logo {
  font-size: 2rem;
  margin-right: 0.7rem;
}
.app-title {
  font-size: 1.3rem;
  font-weight: 600;
  letter-spacing: 1px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 1.2rem;
}
.search-bar-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.search-bar {
  background: #1a2030;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  color: #fff;
  font-size: 14px;
  min-width: 180px;
  outline: none;
  opacity: 0.9;
  font-family: inherit;
}
.clear-search {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  color: #bfc7d5;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0;
  z-index: 2;
  transition: color 0.2s;
}
.clear-search:hover {
  color: #fff;
}
.header-icon {
  font-size: 1.4rem;
  color: #bfc7d5;
  cursor: pointer;
  margin-left: 0.5rem;
  transition: color 0.2s;
}
.header-icon:hover {
  color: #fff;
}
.user-menu-wrapper {
  position: relative;
  display: inline-block;
}
.user-icon {
  cursor: pointer;
}
.user-menu-dropdown {
  position: absolute;
  right: 0;
  top: 2.2rem;
  background: #23293a;
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  min-width: 140px;
  z-index: 200;
  padding: 0.5rem 0;
  border: 1px solid #1a2030;
  animation: fadeIn 0.18s;
  font-family: inherit;
  font-size: 14px;
}
.user-menu-item {
  padding: 0.7rem 1.2rem;
  cursor: pointer;
  font-size: 1rem;
  color: #bfc7d5;
  transition: background 0.18s, color 0.18s;
}
.user-menu-item:hover {
  background: #2563eb;
  color: #fff;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.sidebar {
  width: 220px;
  background: #23293a;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 0;
  box-shadow: 2px 0 8px rgba(0,0,0,0.08);
  margin-top: 56px;
  height: calc(100vh - 56px);
  position: fixed;
  left: 0;
  top: 56px;
  bottom: 0;
  font-family: Roboto, "open sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
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
  font-family: inherit;
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
  margin-left: 220px;
  margin-top: 56px;
  font-family: Roboto, "open sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
}
.content-area {
  flex: 1;
  padding: 2rem 2.5rem;
  background: #181c24;
  min-height: 0;
  max-width: 1320px;
  margin: 0 auto;
  font-family: inherit;
  font-size: 14px;
}
button {
  background: none;
  color: inherit;
  font-weight: bold;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
}
button:focus {
  outline: 2px solid #3b82f6;
}
</style> 