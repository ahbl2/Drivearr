<template>
  <div class="settings-layout">
    <SettingsSidebar />
    <div class="settings-content">
      <component :is="currentTabComponent" @setupComplete="onSetupComplete" :notify="notify" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SettingsSidebar from './SettingsSidebar.vue'
import PlexSettings from './PlexSettings.vue'
import MediaSettings from './MediaSettings.vue'

const route = useRoute()
const router = useRouter()

const tabMap = {
  plex: PlexSettings,
  media: MediaSettings
}

const currentTab = computed(() => route.params.tab || 'plex')
const currentTabComponent = computed(() => tabMap[currentTab.value] || PlexSettings)

function onSetupComplete() {
  // Optionally handle after saving settings
}
function notify(msg, type) {
  // Optionally handle notifications
  // You can connect this to a global notification system if you have one
  alert(msg)
}
</script>

<style scoped>
.settings-layout {
  display: flex;
  min-height: 100vh;
  align-items: flex-start;
}
.settings-content {
  flex: 1;
  padding: 2.5rem 0 0 2.5rem;
}
</style> 