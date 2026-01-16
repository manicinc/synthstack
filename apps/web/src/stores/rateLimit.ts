import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type RateLimitDetails = {
  limit?: number
  remaining?: number
  reset?: number
  retryAfter?: number
}

type RateLimitSnapshot = {
  limit?: number
  remaining?: number
  resetMs?: number | null
  retryAfter?: number | null
  cooldownUntilMs?: number | null
  status?: number
  endpoint?: string
  updatedAtMs: number
}

function normalizeResetMs(reset: number, nowMs: number): number | null {
  if (!Number.isFinite(reset)) return null
  if (reset < 1_000_000_000) return nowMs + reset * 1000
  if (reset < 10_000_000_000) return reset * 1000
  return reset
}

export const useRateLimitStore = defineStore('rateLimit', () => {
  const nowMs = ref(Date.now())
  const snapshot = ref<RateLimitSnapshot | null>(null)

  let ticker: number | null = null
  function startTicker(): void {
    if (typeof window === 'undefined') return
    if (ticker !== null) return
    ticker = window.setInterval(() => {
      nowMs.value = Date.now()
      if (!isLimited.value) stopTicker()
    }, 250)
  }

  function stopTicker(): void {
    if (typeof window === 'undefined') return
    if (ticker === null) return
    window.clearInterval(ticker)
    ticker = null
  }

  const isLimited = computed(() => {
    const until = snapshot.value?.cooldownUntilMs
    if (!until) return false
    return nowMs.value < until
  })

  const secondsRemaining = computed(() => {
    if (!snapshot.value?.cooldownUntilMs) return 0
    if (!isLimited.value) return 0
    return Math.max(0, Math.ceil((snapshot.value.cooldownUntilMs - nowMs.value) / 1000))
  })

  function record(details: RateLimitDetails, context?: { status?: number; endpoint?: string }): void {
    const now = Date.now()
    nowMs.value = now

    const resetMs = details.reset !== undefined ? normalizeResetMs(details.reset, now) : null
    const retryAfter = details.retryAfter !== undefined ? details.retryAfter : null
    const shouldLock = context?.status === 429 || (retryAfter !== null && retryAfter > 0)
    const cooldownUntilMs =
      shouldLock
        ? (retryAfter && retryAfter > 0
          ? now + retryAfter * 1000
          : resetMs)
        : null

    snapshot.value = {
      limit: details.limit,
      remaining: details.remaining,
      resetMs,
      retryAfter,
      cooldownUntilMs,
      status: context?.status,
      endpoint: context?.endpoint,
      updatedAtMs: now,
    }

    if (cooldownUntilMs && cooldownUntilMs > now) {
      startTicker()
    } else {
      stopTicker()
    }
  }

  function clear(): void {
    snapshot.value = null
    stopTicker()
  }

  return {
    snapshot,
    isLimited,
    secondsRemaining,
    record,
    clear,
  }
})
