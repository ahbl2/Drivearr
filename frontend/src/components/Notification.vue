<template>
  <div v-if="visible" class="notification" :class="type">
    <span>{{ message }}</span>
    <button @click="close">✖</button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  message: String,
  type: { type: String, default: 'error' },
  duration: { type: Number, default: 5000 }
})

const visible = ref(!!props.message)

watch(() => props.message, (val) => {
  visible.value = !!val
  if (val && props.duration > 0) {
    setTimeout(() => visible.value = false, props.duration)
  }
})

function close() {
  visible.value = false
}
</script>

<style scoped>
.notification {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: #f87171;
  color: white;
  padding: 1rem 2rem;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  z-index: 1000;
}
.notification button {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  margin-left: 1rem;
  cursor: pointer;
}
.notification.error {
  background: #f87171;
}
.notification.success {
  background: #34d399;
}
</style> 