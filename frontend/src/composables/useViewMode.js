import { ref, watch } from 'vue'

const VIEW_OPTIONS = [
  { value: 'posters', label: 'Posters', icon: 'fa fa-th-large' },
  { value: 'overview', label: 'Overview', icon: 'fa fa-list-alt' },
  { value: 'table', label: 'Table', icon: 'fa fa-table' }
]

export default function useViewMode(storageKey, defaultMode = 'posters') {
  const viewMode = ref(localStorage.getItem(storageKey) || defaultMode)

  function setViewMode(mode) {
    viewMode.value = mode
    localStorage.setItem(storageKey, mode)
  }

  watch(viewMode, (newMode) => {
    localStorage.setItem(storageKey, newMode)
  })

  return {
    viewMode,
    setViewMode,
    viewOptions: VIEW_OPTIONS
  }
} 