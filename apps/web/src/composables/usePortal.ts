/**
 * @file composables/usePortal.ts
 * @description Composable for Client Portal API operations
 */

import { ref, computed } from 'vue'
import { apiClient } from '@/services/api'

// Types
export interface PortalStats {
  projects: number
  openTasks: number
  pendingInvoices: number
  pendingAmount: number
  unreadMessages: number
}

export interface PortalProject {
  id: string
  name: string
  description?: string
  status: string
  billing?: string
  role: string
  canViewTasks: boolean
  canViewFiles: boolean
  canViewInvoices: boolean
  taskCount: number
  completedTaskCount: number
  createdAt: string
  updatedAt: string
}

export interface PortalTask {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  responsibility?: string
  dateCompleted?: string
  createdAt: string
  updatedAt: string
}

export interface PortalFile {
  id: string
  filenameDownload: string
  title?: string
  type: string
  filesize: number
  uploadedOn: string
  description?: string
}

export interface PortalInvoice {
  id: string
  invoiceNumber: string
  status: string
  issueDate: string
  dueDate?: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  currency: string
  createdAt: string
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
  itemName?: string
}

export interface Conversation {
  id: string
  title: string
  status: string
  collection?: string
  item?: string
  unreadCount: number
  lastMessage?: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  text: string
  isRead: boolean
  createdAt: string
  contactId?: string
  firstName?: string
  lastName?: string
  userCreated?: string
  userName?: string
}

export interface Milestone {
  id: string
  title: string
  description?: string
  targetDate?: string
  status: string
}

export interface TeamMember {
  userId: string
  displayName: string
  avatarUrl?: string
  role: string
}

export function usePortal() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Dashboard
  async function fetchDashboard() {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get<{
        success: boolean
        data: {
          stats: PortalStats
          recentActivity: Array<{ type: string; title: string; timestamp: string }>
        }
      }>('/api/portal/dashboard')
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch dashboard'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Projects
  async function fetchProjects(): Promise<PortalProject[]> {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get<{ success: boolean; data: PortalProject[] }>('/api/portal/projects')
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch projects'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchProject(projectId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get<{
        success: boolean
        data: PortalProject & {
          permissions: { role: string; canViewTasks: boolean; canViewFiles: boolean; canViewInvoices: boolean }
          milestones: Milestone[]
          team: TeamMember[]
        }
      }>(`/api/portal/projects/${projectId}`)
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch project'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Tasks
  async function fetchTasks(projectId: string, status?: string): Promise<PortalTask[]> {
    loading.value = true
    error.value = null
    try {
      const params = status ? { status } : {}
      const response = await apiClient.get<{ success: boolean; data: PortalTask[] }>(
        `/api/portal/projects/${projectId}/tasks`,
        { params }
      )
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch tasks'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Files
  async function fetchFiles(projectId: string): Promise<PortalFile[]> {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get<{ success: boolean; data: PortalFile[] }>(
        `/api/portal/projects/${projectId}/files`
      )
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch files'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Invoices
  async function fetchInvoices(params?: { status?: string; page?: number; limit?: number }) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get<{
        success: boolean
        data: PortalInvoice[]
        meta: { page: number; limit: number; total: number; totalPages: number }
      }>('/api/portal/invoices', { params })
      return response.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch invoices'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchInvoice(invoiceId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get<{
        success: boolean
        data: PortalInvoice & { items: InvoiceItem[]; organizationName: string }
      }>(`/api/portal/invoices/${invoiceId}`)
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch invoice'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createPaymentSession(invoiceId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post<{
        success: boolean
        data: { paymentUrl: string; sessionId: string }
      }>(`/api/portal/invoices/${invoiceId}/pay`)
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to create payment session'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function downloadInvoicePDF(invoiceId: string): Promise<Blob> {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get(`/api/portal/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      })
      return response.data
    } catch (e: any) {
      error.value = e.message || 'Failed to download invoice PDF'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Conversations
  async function fetchConversations(params?: { collection?: string; item?: string; status?: string }) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get<{ success: boolean; data: Conversation[] }>(
        '/api/portal/conversations',
        { params }
      )
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch conversations'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createConversation(data: { title: string; collection?: string; item?: string; message: string }) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post<{ success: boolean; data: Conversation }>(
        '/api/portal/conversations',
        data
      )
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to create conversation'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchMessages(conversationId: string, params?: { page?: number; limit?: number }) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get<{ success: boolean; data: Message[] }>(
        `/api/portal/conversations/${conversationId}/messages`,
        { params }
      )
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch messages'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function sendMessage(conversationId: string, text: string, attachments?: string[]) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post<{ success: boolean; data: Message }>(
        `/api/portal/conversations/${conversationId}/messages`,
        { text, attachments }
      )
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to send message'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Account
  async function fetchAccount() {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get<{
        success: boolean
        data: {
          contact: {
            id: string
            firstName: string
            lastName: string
            email: string
            phone?: string
            organizationName?: string
          }
          organizationId: string
        }
      }>('/api/portal/account')
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch account'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),

    // Dashboard
    fetchDashboard,

    // Projects
    fetchProjects,
    fetchProject,

    // Tasks
    fetchTasks,

    // Files
    fetchFiles,

    // Invoices
    fetchInvoices,
    fetchInvoice,
    getInvoices: fetchInvoices,
    createPaymentSession,
    downloadInvoicePDF,

    // Conversations
    fetchConversations,
    createConversation,
    fetchMessages,
    sendMessage,
    getConversations: fetchConversations,
    getConversationMessages: fetchMessages,
    sendConversationMessage: sendMessage,

    // Account
    fetchAccount
  }
}
