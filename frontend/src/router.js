import { createRouter, createWebHistory } from 'vue-router'
import LibraryDashboard from './components/LibraryDashboard.vue'
import SyncQueue from './components/SyncQueue.vue'
import Settings from './components/Settings.vue'
import BrowseContent from './components/BrowseContent.vue'
import Drive from './components/Drive.vue'
import DriveHistory from './components/DriveHistory.vue'

const routes = [
  { path: '/', redirect: '/library' },
  { path: '/library', component: LibraryDashboard },
  {
    path: '/library/movies',
    name: 'Movies',
    component: BrowseContent,
    props: { type: 'movie' }
  },
  {
    path: '/library/tv',
    name: 'TVShows',
    component: BrowseContent,
    props: { type: 'show' }
  },
  { path: '/drive', component: Drive },
  { path: '/drive/history', component: DriveHistory },
  { path: '/sync-queue', component: SyncQueue },
  { path: '/settings/:tab?', component: Settings }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router 