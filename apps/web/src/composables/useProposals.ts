/**
 * @file composables/useProposals.ts
 * @description Composable for Proposals API operations
 */

import { ref, computed } from 'vue'
import { apiClient } from '@/services/api'

// Types
export interface ProposalBlock {
  id: string
  collection: string
  sort: number
  content: Record<string, unknown>
}

export interface ProposalApproval {
  email: string
  name: string
  signedAt?: string
}

export interface Proposal {
  id: string
  title: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired'
  validUntil?: string
  totalValue?: number
  termsAndConditions?: string
  organizationName?: string
  organizationLogo?: string
  organizationWebsite?: string
  contactEmail?: string
  firstName?: string
  lastName?: string
  blocks?: ProposalBlock[]
  approvals?: ProposalApproval[]
  createdAt: string
  updatedAt: string
}

export interface SignProposalData {
  email?: string
  name?: string
  signatureType?: 'text' | 'draw' | 'upload'
  signatureText?: string
  signatureImage?: string
  signature?: string
  signed_by_name?: string
  agreedToTerms?: boolean
}

export function useProposals() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Admin: List proposals
  async function fetchProposals(params?: { status?: string; organizationId?: string; page?: number; limit?: number }) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get<{ success: boolean; data: Proposal[] }>(
        '/api/v1/proposals',
        { params }
      )
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch proposals'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Admin: Create proposal
  async function createProposal(data: {
    title: string
    organizationId?: string
    contactId?: string
    dealId?: string
    validUntil?: string
    blocks?: Array<{ collection: string; data: Record<string, unknown>; sort?: number }>
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post<{ success: boolean; data: Proposal }>(
        '/api/v1/proposals',
        data
      )
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to create proposal'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Admin: Get proposal details
  async function fetchProposal(proposalId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get<{ success: boolean; data: Proposal }>(
        `/api/v1/proposals/${proposalId}`
      )
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch proposal'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Admin: Update proposal
  async function updateProposal(proposalId: string, data: { title?: string; status?: string; validUntil?: string }) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.patch<{ success: boolean; data: Proposal }>(
        `/api/v1/proposals/${proposalId}`,
        data
      )
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to update proposal'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Admin: Delete proposal
  async function deleteProposal(proposalId: string) {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/api/v1/proposals/${proposalId}`)
    } catch (e: any) {
      error.value = e.message || 'Failed to delete proposal'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Admin: Add block
  async function addBlock(proposalId: string, data: { collection: string; data: Record<string, unknown>; sort?: number }) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post<{ success: boolean; data: ProposalBlock }>(
        `/api/v1/proposals/${proposalId}/blocks`,
        data
      )
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to add block'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Admin: Update block
  async function updateBlock(proposalId: string, blockId: string, data: { data?: Record<string, unknown>; sort?: number }) {
    loading.value = true
    error.value = null
    try {
      await apiClient.patch(`/api/v1/proposals/${proposalId}/blocks/${blockId}`, data)
    } catch (e: any) {
      error.value = e.message || 'Failed to update block'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Admin: Delete block
  async function deleteBlock(proposalId: string, blockId: string) {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/api/v1/proposals/${proposalId}/blocks/${blockId}`)
    } catch (e: any) {
      error.value = e.message || 'Failed to delete block'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Admin: Send proposal
  async function sendProposal(proposalId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post<{ success: boolean; data: Proposal }>(
        `/api/v1/proposals/${proposalId}/send`
      )
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to send proposal'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Admin: Duplicate proposal
  async function duplicateProposal(proposalId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post<{ success: boolean; data: Proposal }>(
        `/api/v1/proposals/${proposalId}/duplicate`
      )
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to duplicate proposal'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Public: View proposal
  async function viewProposal(proposalId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get<{
        success: boolean
        data: Proposal & { requiresSignature: boolean }
      }>(`/api/v1/proposals/${proposalId}/view`)
      return response.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to load proposal'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Public: Sign proposal
  async function signProposal(proposalId: string, data: SignProposalData) {
    loading.value = true
    error.value = null
    try {
      await apiClient.post(`/api/v1/proposals/${proposalId}/sign`, data)
    } catch (e: any) {
      error.value = e.message || 'Failed to sign proposal'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),

    // Admin operations
    fetchProposals,
    createProposal,
    fetchProposal,
    getProposal: fetchProposal,
    updateProposal,
    deleteProposal,
    addBlock,
    updateBlock,
    deleteBlock,
    sendProposal,
    duplicateProposal,

    // Public operations
    viewProposal,
    signProposal
  }
}
