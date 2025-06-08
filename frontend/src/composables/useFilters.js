import { ref, watch } from 'vue'

export default function useFilters(type) {
  const STORAGE_KEY = `drivearr_${type}_filters`
  
  // Initialize filters from localStorage or default values
  const getInitialFilters = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : {
        yearStart: null,
        yearEnd: null,
        genres: [],
        minRating: null,
        maxRating: null,
        minDuration: null,
        maxDuration: null,
        status: '',
        minSeasons: null,
        maxSeasons: null
      }
    } catch (error) {
      console.error('Error loading saved filters:', error)
      return {
        yearStart: null,
        yearEnd: null,
        genres: [],
        minRating: null,
        maxRating: null,
        minDuration: null,
        maxDuration: null,
        status: '',
        minSeasons: null,
        maxSeasons: null
      }
    }
  }

  const filters = ref(getInitialFilters())
  const hasActiveFilters = ref(false)

  // Watch for changes and save to localStorage
  watch(filters, (newFilters) => {
    try {
      // Check if any filter is active
      hasActiveFilters.value = Object.entries(newFilters).some(([key, value]) => {
        if (key === 'genres') return value.length > 0
        if (key === 'status') return value !== ''
        return value !== null
      })

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFilters))
    } catch (error) {
      console.error('Error saving filters:', error)
    }
  }, { deep: true })

  // Clear all filters
  const clearFilters = () => {
    filters.value = {
      yearStart: null,
      yearEnd: null,
      genres: [],
      minRating: null,
      maxRating: null,
      minDuration: null,
      maxDuration: null,
      status: '',
      minSeasons: null,
      maxSeasons: null
    }
  }

  // Get active filters (excluding null/empty values)
  const getActiveFilters = () => {
    const f = filters.value;
    const result = {};

    // Year range: only include if both are set and valid
    if (f.yearStart !== null && f.yearEnd !== null && f.yearStart !== '' && f.yearEnd !== '') {
      result.yearStart = f.yearStart;
      result.yearEnd = f.yearEnd;
    }

    // Genres
    if (Array.isArray(f.genres) && f.genres.length > 0) {
      result.genres = f.genres;
    }

    // Rating range
    if (f.minRating !== null && f.minRating !== '') result.minRating = f.minRating;
    if (f.maxRating !== null && f.maxRating !== '') result.maxRating = f.maxRating;

    // Duration (movies)
    if (f.minDuration !== null && f.minDuration !== '') result.minDuration = f.minDuration;
    if (f.maxDuration !== null && f.maxDuration !== '') result.maxDuration = f.maxDuration;

    // Status (shows)
    if (f.status && f.status !== '') result.status = f.status;

    // Seasons (shows)
    if (f.minSeasons !== null && f.minSeasons !== '') result.minSeasons = f.minSeasons;
    if (f.maxSeasons !== null && f.maxSeasons !== '') result.maxSeasons = f.maxSeasons;

    return result;
  }

  return {
    filters,
    hasActiveFilters,
    clearFilters,
    getActiveFilters
  }
} 