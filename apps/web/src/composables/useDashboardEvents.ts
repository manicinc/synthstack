/**
 * useDashboardEvents Composable
 * Real-time SSE connection for dashboard updates
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

export type DashboardEventType = 
  | 'workflow_execution_started'
  | 'workflow_execution_completed'
  | 'workflow_execution_failed'
  | 'copilot_message'
  | 'credits_updated'
  | 'sync_completed'
  | 'memory_created'
  | 'stats_updated'

export interface DashboardEventData {
  type: DashboardEventType
  data: Record<string, unknown>
  timestamp: string
}

const API_BASE = import.meta.env.VITE_API_URL || ''

export function useDashboardEvents() {
  const dashboardStore = useDashboardStore()
  const authStore = useAuthStore()
  
  const eventSource = ref<EventSource | null>(null)
  const isConnected = ref(false)
  const connectionError = ref<string | null>(null)
  const lastEventTime = ref<Date | null>(null)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = ref(1000)
  
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  // Event handlers
  const eventHandlers = new Map<DashboardEventType, Set<(data: any) => void>>()

  function on(eventType: DashboardEventType, handler: (data: any) => void) {
    if (!eventHandlers.has(eventType)) {
      eventHandlers.set(eventType, new Set())
    }
    eventHandlers.get(eventType)!.add(handler)
    
    return () => {
      eventHandlers.get(eventType)?.delete(handler)
    }
  }

  function emit(eventType: DashboardEventType, data: any) {
    eventHandlers.get(eventType)?.forEach(handler => handler(data))
  }

  function handleEvent(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data)
      lastEventTime.value = new Date()
      
      // Emit to registered handlers
      emit(event.type as DashboardEventType, data)

      // Handle different event types
      switch (event.type) {
        case 'workflow_execution_started':
          dashboardStore.addActivity({
            id: data.executionId || `exec_${Date.now()}`,
            type: 'workflow',
            title: `Started: ${data.flowName}`,
            timestamp: new Date().toISOString(),
            status: 'pending',
          })
          break

        case 'workflow_execution_completed':
          dashboardStore.updateActivityStatus(data.executionId, 'success')
          dashboardStore.refreshOverview()
          break

        case 'workflow_execution_failed':
          dashboardStore.updateActivityStatus(data.executionId, 'error')
          dashboardStore.refreshOverview()
          break

        case 'copilot_message':
          dashboardStore.addActivity({
            id: `ai_${Date.now()}`,
            type: 'copilot',
            title: `${data.agentSlug} conversation`,
            timestamp: new Date().toISOString(),
            status: 'success',
          })
          break

        case 'credits_updated':
          dashboardStore.updateCredits(data.newBalance)
          break

        case 'sync_completed':
          dashboardStore.addActivity({
            id: `sync_${Date.now()}`,
            type: 'sync',
            title: `Sync completed: ${data.collection}`,
            timestamp: new Date().toISOString(),
            status: 'success',
          })
          break

        case 'memory_created':
          dashboardStore.addActivity({
            id: `memory_${Date.now()}`,
            type: 'memory',
            title: `Memory created: ${data.type}`,
            timestamp: new Date().toISOString(),
            status: 'info',
          })
          break

        case 'stats_updated':
          dashboardStore.handleStatsUpdate(data)
          break
      }
    } catch (error) {
      logError('Failed to parse SSE event:', error)
    }
  }

  function connect() {
    if (!authStore.isAuthenticated) {
      connectionError.value = 'Not authenticated'
      return
    }

    const token = authStore.accessToken
    if (!token) {
      connectionError.value = 'No access token'
      return
    }

    // Close existing connection
    disconnect()

    try {
      // Create EventSource with auth token in query (since EventSource doesn't support headers)
      const url = `${API_BASE}/api/v1/dashboard/events/stream?token=${encodeURIComponent(token)}`
      eventSource.value = new EventSource(url)

      eventSource.value.onopen = () => {
        isConnected.value = true
        connectionError.value = null
        reconnectAttempts.value = 0
        reconnectDelay.value = 1000
        devLog('[Dashboard Events] SSE connected')
      }

      eventSource.value.onerror = (error) => {
        devError('[Dashboard Events] SSE error:', error)
        isConnected.value = false
        connectionError.value = 'Connection error'
        
        // Attempt reconnect
        if (reconnectAttempts.value < maxReconnectAttempts) {
          scheduleReconnect()
        } else {
          connectionError.value = 'Max reconnect attempts reached'
        }
      }

      // Listen for connection event
      eventSource.value.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data)
          devLog('[Dashboard Events] Connected with client ID:', data.clientId)
        } catch (e) {
          // Ignore parse errors for connection event
        }
      })

      // Register listeners for all event types
      const eventTypes: DashboardEventType[] = [
        'workflow_execution_started',
        'workflow_execution_completed',
        'workflow_execution_failed',
        'copilot_message',
        'credits_updated',
        'sync_completed',
        'memory_created',
        'stats_updated',
      ]

      eventTypes.forEach(type => {
        eventSource.value?.addEventListener(type, handleEvent)
      })

    } catch (error) {
      logError('[Dashboard Events] Failed to create EventSource:', error)
      connectionError.value = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
    }
    
    isConnected.value = false
  }

  function scheduleReconnect() {
    reconnectAttempts.value++
    
    // Exponential backoff
    reconnectDelay.value = Math.min(reconnectDelay.value * 2, 30000)
    
    devLog(`[Dashboard Events] Reconnecting in ${reconnectDelay.value}ms (attempt ${reconnectAttempts.value})`)
    
    reconnectTimeout = setTimeout(() => {
      connect()
    }, reconnectDelay.value)
  }

  // Connection status
  const connectionStatus = computed(() => {
    if (isConnected.value) return 'connected'
    if (connectionError.value) return 'error'
    return 'disconnected'
  })

  // Auto-connect on mount if authenticated
  onMounted(() => {
    if (authStore.isAuthenticated) {
      connect()
    }
  })

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    // State
    isConnected,
    connectionError,
    connectionStatus,
    lastEventTime,
    reconnectAttempts,
    
    // Methods
    connect,
    disconnect,
    on,
  }
}

// Singleton instance for global access
let globalInstance: ReturnType<typeof useDashboardEvents> | null = null

export function useDashboardEventsGlobal() {
  if (!globalInstance) {
    globalInstance = useDashboardEvents()
  }
  return globalInstance
}

