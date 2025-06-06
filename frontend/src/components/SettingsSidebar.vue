<template>
  <aside class="settings-sidebar">
    <router-link to="/settings/plex" class="nav-link" active-class="active">
      <i class="fa fa-server"></i> Plex
    </router-link>
    <router-link to="/settings/media" class="nav-link" active-class="active">
      <i class="fa fa-folder"></i> Media Paths
    </router-link>
  </aside>
</template>

<script setup>
// No additional logic needed for now
</script>

<style scoped>
.settings-sidebar {
  width: 160px;
  background: transparent;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  padding: 2rem 0.5rem;
  gap: 1rem;
  box-shadow: none;
}
.nav-link {
  background: none;
  border: none;
  color: #bfc7d5;
  font-size: 1rem;
  font-family: inherit;
  padding: 0.8rem 1rem;
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  transition: background 0.18s, color 0.18s;
  text-decoration: none;
}
.nav-link.active, .nav-link:hover {
  background: #2563eb;
  color: #fff;
}
</style> 