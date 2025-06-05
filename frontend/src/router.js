import { createRouter, createWebHistory } from 'vue-router'
import PlexSettings from './components/PlexSettings.vue'
import MediaSettings from './components/MediaSettings.vue'

const routes = [
  { path: '/', redirect: '/settings' },
  { path: '/settings', redirect: '/settings/plex' },
  { path: '/settings/plex', component: PlexSettings },
  { path: '/settings/media', component: MediaSettings },
  // Add other routes as needed
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router 