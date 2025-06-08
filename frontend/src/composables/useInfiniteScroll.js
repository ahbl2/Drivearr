import { ref, onMounted, onUnmounted } from 'vue'

export default function useInfiniteScroll(callback, options = {}) {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0.1,
    distance = 0
  } = options

  const observer = ref(null)
  const target = ref(null)
  const isLoading = ref(false)
  const hasMore = ref(true)

  const handleIntersect = async (entries) => {
    const [entry] = entries
    if (entry.isIntersecting && hasMore.value && !isLoading.value) {
      console.log('Intersection observer triggered!');
      isLoading.value = true
      try {
        await callback()
      } finally {
        isLoading.value = false
      }
    }
  }

  const setupObserver = () => {
    if (observer.value) {
      observer.value.disconnect()
    }

    observer.value = new IntersectionObserver(handleIntersect, {
      root,
      rootMargin,
      threshold
    })

    if (target.value) {
      observer.value.observe(target.value)
    }
  }

  const setHasMore = (value) => {
    hasMore.value = value
  }

  onMounted(() => {
    setupObserver()
  })

  onUnmounted(() => {
    if (observer.value) {
      observer.value.disconnect()
    }
  })

  return {
    target,
    isLoading,
    hasMore,
    setHasMore
  }
} 