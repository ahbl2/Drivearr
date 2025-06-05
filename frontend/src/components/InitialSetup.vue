<template>
  <div class="settings-layout">
    <SettingsSidebar />
    <div class="settings-content">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import SettingsSidebar from './SettingsSidebar.vue'
</script>

<style scoped>
.settings-layout {
  display: flex;
  max-width: 700px;
  margin: 3rem auto 0 auto;
  background: none;
}
.settings-content {
  flex: 1;
  background: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
</style>
