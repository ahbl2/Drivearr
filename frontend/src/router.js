import { createRouter, createWebHistory } from 'vue-router'
import LibraryDashboard from './components/LibraryDashboard.vue'
import LibraryTV from './components/LibraryTV.vue'
import LibraryMovies from './components/LibraryMovies.vue'
import SyncQueue from './components/SyncQueue.vue'
import Settings from './components/Settings.vue'

const routes = [
  { path: '/', redirect: '/library' },
  { path: '/library', component: LibraryDashboard },
  { path: '/library/tv', component: LibraryTV },
  { path: '/library/movies', component: LibraryMovies },
  { path: '/sync-queue', component: SyncQueue },
  { path: '/settings/:tab?', component: Settings }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router 