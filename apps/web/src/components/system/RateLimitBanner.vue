<template>
  <q-banner
    v-if="rateLimitStore.isLimited"
    class="rate-limit-banner bg-negative text-white"
    dense
  >
    <template #avatar>
      <q-icon name="timer" color="white" />
    </template>
    <div class="text-body2">
      <strong>Rate limit reached.</strong> Try again in {{ rateLimitStore.secondsRemaining }}s.
    </div>
    <div
      v-if="countsText || endpointText"
      class="text-caption text-white q-mt-xs"
    >
      <span v-if="endpointText">{{ endpointText }}</span>
      <span v-if="endpointText && countsText"> • </span>
      <span v-if="countsText">{{ countsText }}</span>
    </div>
  </q-banner>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRateLimitStore } from '@/stores/rateLimit'

const $q = useQuasar()
const rateLimitStore = useRateLimitStore()

let lastToastAtMs = 0
watch(
  () => rateLimitStore.snapshot?.updatedAtMs,
  () => {
    const s = rateLimitStore.snapshot
    if (!s) return
    if (s.status !== 429) return
    const now = Date.now()
    if (now - lastToastAtMs < 1500) return
    lastToastAtMs = now
    $q.notify({
      type: 'warning',
      message: `Rate limit reached. Try again in ${rateLimitStore.secondsRemaining}s.`,
      timeout: 2500,
    })
  }
)

const countsText = computed(() => {
  const s = rateLimitStore.snapshot
  if (!s) return ''
  if (typeof s.remaining !== 'number' || typeof s.limit !== 'number') return ''
  return `Remaining ${s.remaining}/${s.limit}`
})

const endpointText = computed(() => {
  const endpoint = rateLimitStore.snapshot?.endpoint
  if (!endpoint) return ''
  return endpoint
})
</script>

<style scoped lang="scss">
.rate-limit-banner {
  border-radius: 0;
}
</style>
