<template>
  <nav class="sidebar-nav">
    <!-- Library Parent (always a link) -->
    <router-link
      to="/library"
      class="nav-btn parent"
      :class="{ active: isLibraryActive }"
    >
      <i class="fa fa-film"></i>
      <span>Library</span>
    </router-link>
    <!-- Sub-links: always visible when on any /library page -->
    <div v-if="isLibraryActive" class="sidebar-subnav">
      <router-link to="/library/movies" class="nav-btn sub" active-class="active">Movies</router-link>
      <router-link to="/library/tv" class="nav-btn sub" active-class="active">TV Shows</router-link>
    </div>

    <!-- Drive Parent -->
    <router-link to="/drive" class="nav-btn parent" :class="{ active: isDriveActive }"><i class="fa fa-hdd"></i><span>Drive</span></router-link>
    <!-- Sub-links: visible when on any /drive or /drive-history page -->
    <div v-if="isDriveActive" class="sidebar-subnav">
      <router-link to="/drive/history" class="nav-btn sub" active-class="active">Drive History</router-link>
    </div>

    <!-- Other main nav items -->
    <router-link to="/sync-queue" class="nav-btn" active-class="active"><i class="fa fa-exchange-alt"></i><span>Sync Queue</span></router-link>
    <router-link to="/settings/plex" class="nav-btn" active-class="active"><i class="fa fa-cog"></i><span>Settings</span></router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isLibraryActive = computed(() => route.path.startsWith('/library'))
const isDriveActive = computed(() => route.path.startsWith('/drive'))
</script>

<style scoped>
.sidebar-nav {
  display: flex;
  flex-direction: column;
  margin-top: 2rem;
}
.nav-btn {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: #bfc7d5;
  font-size: 1rem;
  padding: 0.9rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 0.3rem;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  text-decoration: none;
  gap: 1rem;
}
.nav-btn.active, .nav-btn.router-link-exact-active {
  background: #2563eb;
  color: #fff;
}
.nav-btn.parent {
  font-weight: 600;
  font-size: 1.08rem;
  position: relative;
}
.sidebar-subnav {
  display: flex;
  flex-direction: column;
  margin-left: 1.5rem;
  margin-bottom: 0.5rem;
}
.nav-btn.sub {
  font-size: 0.98rem;
  padding-left: 2.2rem;
  background: none;
  color: #bfc7d5;
  border-radius: 6px;
  margin-bottom: 0.2rem;
}
.nav-btn.sub.active, .nav-btn.sub.router-link-exact-active {
  background: #334155;
  color: #fff;
}
</style> 