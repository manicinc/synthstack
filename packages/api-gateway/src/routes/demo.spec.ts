/**
 * @file demo.spec.ts
 * @description API integration tests for demo copilot credit endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3003/api/v1/demo'

// Test data storage
let testSessionId: string

// SKIPPED: Integration tests requiring running server at localhost:3003.
// These tests need the full application stack (server + database) to be running.
// Run manually with: pnpm dev && pnpm test:integration
describe.skip('Demo Copilot Credit API Integration Tests', () => {
  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  describe('POST /demo/session', () => {
    it('should create new demo session with 5 copilot credits', async () => {
      const response = await fetch(`${API_URL}/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.sessionId).toBeDefined()
      expect(data.session_id).toBeDefined()
      expect(data.copilot_credits_remaining).toBe(5)
      expect(data.copilot_credits_used).toBe(0)
      expect(data.expires_at).toBeDefined()
      expect(data.expiresIn).toBe('7 days')

      // Save session ID for subsequent tests
      testSessionId = data.sessionId
    })

    it('should restore existing session when X-Demo-Session header provided', async () => {
      // Create initial session
      const createResponse = await fetch(`${API_URL}/session`, {
        method: 'POST'
      })
      const createData = await createResponse.json()
      const sessionId = createData.sessionId

      // Attempt to restore with header
      const restoreResponse = await fetch(`${API_URL}/session`, {
        method: 'POST',
        headers: {
          'X-Demo-Session': sessionId
        }
      })

      expect(restoreResponse.status).toBe(200)

      const restoreData = await restoreResponse.json()
      expect(restoreData.sessionId).toBe(sessionId)
      expect(restoreData.copilot_credits_remaining).toBe(5)
    })

    it('should create new session if provided session ID is invalid', async () => {
      const response = await fetch(`${API_URL}/session`, {
        method: 'POST',
        headers: {
          'X-Demo-Session': 'invalid-session-id-12345'
        }
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.sessionId).not.toBe('invalid-session-id-12345')
      expect(data.copilot_credits_remaining).toBe(5)
    })
  })

  // =====================================================
  // SESSION RETRIEVAL
  // =====================================================

  describe('GET /demo/session/:sessionId', () => {
    let sessionId: string

    beforeEach(async () => {
      // Create a session for testing
      const response = await fetch(`${API_URL}/session`, {
        method: 'POST'
      })
      const data = await response.json()
      sessionId = data.sessionId
    })

    it('should retrieve session status successfully', async () => {
      const response = await fetch(`${API_URL}/session/${sessionId}`)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.sessionId).toBe(sessionId)
      expect(data.copilot_credits_remaining).toBe(5)
      expect(data.copilot_credits_used).toBe(0)
      expect(data.expires_at).toBeDefined()
    })

    it('should return 404 for non-existent session', async () => {
      const response = await fetch(`${API_URL}/session/non-existent-session-id`)

      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Session not found or expired')
    })

    it('should include blocked status if session is blocked', async () => {
      // Create session and deplete credits to trigger block
      const createResponse = await fetch(`${API_URL}/session`, {
        method: 'POST'
      })
      const createData = await createResponse.json()
      const blockedSessionId = createData.sessionId

      // Deduct all credits
      for (let i = 0; i < 5; i++) {
        await fetch(`${API_URL}/deduct-credit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: blockedSessionId,
            feature: 'copilot_messages'
          })
        })
      }

      // Try to deduct one more to trigger block
      await fetch(`${API_URL}/deduct-credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: blockedSessionId,
          feature: 'copilot_messages'
        })
      })

      // Check session status
      const response = await fetch(`${API_URL}/session/${blockedSessionId}`)
      const data = await response.json()

      expect(data.copilot_credits_remaining).toBe(0)
      expect(data.copilot_blocked_until).toBeDefined()
    })
  })

  // =====================================================
  // CREDIT DEDUCTION
  // =====================================================

  describe('POST /demo/deduct-credit', () => {
    let sessionId: string

    beforeEach(async () => {
      // Create fresh session for each test
      const response = await fetch(`${API_URL}/session`, {
        method: 'POST'
      })
      const data = await response.json()
      sessionId = data.sessionId
    })

    it('should successfully deduct a credit', async () => {
      const response = await fetch(`${API_URL}/deduct-credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionId,
          feature: 'copilot_messages'
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.creditsRemaining).toBe(4)
      expect(data.creditsUsed).toBe(1)
    })

    it('should track multiple credit deductions', async () => {
      // Deduct 3 credits
      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${API_URL}/deduct-credit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: sessionId,
            feature: 'copilot_messages'
          })
        })

        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.creditsRemaining).toBe(5 - (i + 1))
        expect(data.creditsUsed).toBe(i + 1)
      }
    })

    it('should return 400 when sessionId is missing', async () => {
      const response = await fetch(`${API_URL}/deduct-credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feature: 'copilot_messages'
        })
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing sessionId')
    })

    it('should return 404 for non-existent session', async () => {
      const response = await fetch(`${API_URL}/deduct-credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: 'non-existent-session',
          feature: 'copilot_messages'
        })
      })

      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Session not found or expired')
    })

    it('should return 429 when all credits are depleted', async () => {
      // Deduct all 5 credits
      for (let i = 0; i < 5; i++) {
        await fetch(`${API_URL}/deduct-credit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: sessionId,
            feature: 'copilot_messages'
          })
        })
      }

      // Try to deduct 6th credit (should fail)
      const response = await fetch(`${API_URL}/deduct-credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionId,
          feature: 'copilot_messages'
        })
      })

      expect(response.status).toBe(429)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('No credits remaining')
      expect(data.blockedUntil).toBeDefined()
      expect(data.message).toBe('All 5 demo messages used. Upgrade to continue.')
    })

    it('should return 429 when session is blocked', async () => {
      // First deplete all credits to trigger block
      for (let i = 0; i < 5; i++) {
        await fetch(`${API_URL}/deduct-credit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: sessionId,
            feature: 'copilot_messages'
          })
        })
      }

      // Trigger the block
      await fetch(`${API_URL}/deduct-credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionId,
          feature: 'copilot_messages'
        })
      })

      // Try again while blocked
      const response = await fetch(`${API_URL}/deduct-credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionId,
          feature: 'copilot_messages'
        })
      })

      expect(response.status).toBe(429)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Rate limited')
      expect(data.blockedUntil).toBeDefined()
      expect(data.message).toBe('Demo credits depleted. Please upgrade for unlimited access.')
    })

    it('should log usage to copilot_usage_log', async () => {
      // This test would require database access to verify the log entry
      // For now, we just verify the endpoint succeeds
      const response = await fetch(`${API_URL}/deduct-credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionId,
          feature: 'copilot_messages'
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)

      // In a real integration test environment, we would query the database here
      // to verify the copilot_usage_log entry was created
    })
  })

  // =====================================================
  // CREDIT FLOW E2E
  // =====================================================

  describe('Complete credit depletion flow', () => {
    it('should handle full credit lifecycle from creation to depletion', async () => {
      // 1. Create session
      const createResponse = await fetch(`${API_URL}/session`, {
        method: 'POST'
      })
      const createData = await createResponse.json()
      const sessionId = createData.sessionId

      expect(createData.copilot_credits_remaining).toBe(5)

      // 2. Verify session status
      const statusResponse = await fetch(`${API_URL}/session/${sessionId}`)
      const statusData = await statusResponse.json()
      expect(statusData.copilot_credits_remaining).toBe(5)

      // 3. Deduct credits one by one
      for (let i = 1; i <= 5; i++) {
        const deductResponse = await fetch(`${API_URL}/deduct-credit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: sessionId,
            feature: 'copilot_messages'
          })
        })

        const deductData = await deductResponse.json()
        expect(deductResponse.status).toBe(200)
        expect(deductData.creditsRemaining).toBe(5 - i)
        expect(deductData.creditsUsed).toBe(i)
      }

      // 4. Verify credits are depleted
      const finalStatusResponse = await fetch(`${API_URL}/session/${sessionId}`)
      const finalStatusData = await finalStatusResponse.json()
      expect(finalStatusData.copilot_credits_remaining).toBe(0)
      expect(finalStatusData.copilot_credits_used).toBe(5)

      // 5. Try to deduct when depleted (should block)
      const blockedResponse = await fetch(`${API_URL}/deduct-credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionId,
          feature: 'copilot_messages'
        })
      })

      expect(blockedResponse.status).toBe(429)

      const blockedData = await blockedResponse.json()
      expect(blockedData.error).toBe('No credits remaining')
      expect(blockedData.blockedUntil).toBeDefined()

      // 6. Verify session shows as blocked
      const blockedStatusResponse = await fetch(`${API_URL}/session/${sessionId}`)
      const blockedStatusData = await blockedStatusResponse.json()
      expect(blockedStatusData.copilot_blocked_until).toBeDefined()
    })
  })
})
