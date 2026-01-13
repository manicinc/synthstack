<template>
  <div class="license-access-page">
    <div class="container">
      <div class="card">
        <div class="header">
          <h1>Get Your Source Code Access</h1>
          <p v-if="license">Welcome, {{ license.email }}!</p>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="loading">
          <q-spinner size="40px" color="primary" />
          <p>Loading your license...</p>
        </div>

        <!-- Status: Pending (need GitHub username) -->
        <div v-else-if="license && license.github_access_status === 'pending'" class="step">
          <div class="step-number">Step 1 of 2</div>
          <h2>Submit Your GitHub Username</h2>
          <p>Enter your GitHub username to receive repository access.</p>

          <q-form @submit="submitUsername">
            <q-input
              v-model="githubUsername"
              label="GitHub Username"
              hint="Example: octocat"
              :rules="[
                val => !!val || 'GitHub username is required',
                val => /^[a-zA-Z0-9-]+$/.test(val) || 'Invalid GitHub username format'
              ]"
              outlined
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="code" />
              </template>
            </q-input>

            <q-btn
              type="submit"
              label="Submit & Get Invitation"
              color="primary"
              size="lg"
              :loading="submitting"
              class="full-width"
            />
          </q-form>

          <div class="help-text q-mt-md">
            <p>Don't have a GitHub account? <a href="https://github.com/signup" target="_blank">Create one free →</a></p>
          </div>
        </div>

        <!-- Status: Invited (waiting for acceptance) -->
        <div v-else-if="license && license.github_access_status === 'invited'" class="step">
          <div class="step-number">Step 2 of 2</div>
          <h2>Check Your Email</h2>
          <p>We've sent a GitHub invitation to <strong>@{{ license.github_username }}</strong></p>

          <div class="instructions">
            <h3>Next Steps:</h3>
            <ol>
              <li>Check your email from GitHub (noreply@github.com)</li>
              <li>Click "Join @{{ githubOrgName }}" to accept the invitation</li>
              <li>You'll immediately get access to the repository</li>
            </ol>
          </div>

          <q-btn
            label="I've Accepted the Invitation"
            color="primary"
            size="lg"
            :loading="checking"
            class="full-width q-mt-md"
            @click="checkStatus"
          />

          <div class="help-text q-mt-md">
            <p>Haven't received the email? Check your spam folder or contact <a :href="`mailto:${supportEmail}`">{{ supportEmail }}</a></p>
          </div>
        </div>

        <!-- Status: Active (access granted) -->
        <div v-else-if="license && license.github_access_status === 'active'" class="success">
          <q-icon name="check_circle" color="positive" size="64px" />
          <h2>You're All Set!</h2>
          <p>Your GitHub access is now active. You can clone the repository and start building!</p>

          <div class="code-block">
            <code>{{ cloneCommand }}</code>
            <q-btn
              flat
              dense
              icon="content_copy"
              @click="copyToClipboard(cloneCommand)"
            />
          </div>

          <div class="next-steps q-mt-lg">
            <h3>Essential Resources:</h3>
            <ul>
              <li><a :href="proRepoUrl" target="_blank">View Repository →</a></li>
              <li><a href="/docs" target="_blank">API Documentation →</a></li>
              <li><a :href="discordUrl" target="_blank">Join Discord →</a></li>
            </ul>
          </div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="error">
          <q-icon name="error" color="negative" size="48px" />
          <h2>{{ error }}</h2>
          <p>Please contact <a :href="`mailto:${supportEmail}`">{{ supportEmail }}</a> for assistance.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { branding } from '@/config/branding'

const route = useRoute()
const $q = useQuasar()

function firstQueryValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] || '')
  return typeof value === 'string' ? value : ''
}

const sessionId = ref(firstQueryValue(route.query.session) || firstQueryValue(route.query.session_id))
const license = ref<any>(null)
const loading = ref(true)
const error = ref('')
const githubUsername = ref('')
const submitting = ref(false)
const checking = ref(false)

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3003'
const supportEmail = branding.supportEmail || 'team@manic.agency'
const discordUrl = branding.social.discord || 'https://discord.gg/synthstack'
const githubOrgName = branding.github.orgName
const proRepoUrl = branding.github.proRepoUrl
const cloneCommand = `git clone ${proRepoUrl}.git`

onMounted(async () => {
  if (!sessionId.value) {
    error.value = 'Invalid license access link'
    loading.value = false
    return
  }

  await fetchLicenseStatus()
})

async function fetchLicenseStatus() {
  try {
    loading.value = true
    const response = await fetch(`${apiUrl}/api/v1/license-access/status?session=${sessionId.value}`)
    const data = await response.json()

    if (data.success) {
      license.value = data.data
    } else {
      error.value = 'License not found'
    }
  } catch (err) {
    error.value = 'Failed to load license information'
  } finally {
    loading.value = false
  }
}

async function submitUsername() {
  try {
    submitting.value = true
    const response = await fetch(`${apiUrl}/api/v1/license-access/submit-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId.value,
        githubUsername: githubUsername.value,
      }),
    })

    const data = await response.json()

    if (data.success) {
      $q.notify({
        type: 'positive',
        message: 'GitHub invitation sent! Check your email.',
        position: 'top',
      })
      await fetchLicenseStatus()
    } else {
      $q.notify({
        type: 'negative',
        message: data.error || 'Failed to submit username',
        position: 'top',
      })
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'An error occurred. Please try again.',
      position: 'top',
    })
  } finally {
    submitting.value = false
  }
}

async function checkStatus() {
  try {
    checking.value = true
    const response = await fetch(`${apiUrl}/api/v1/license-access/check-acceptance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId.value,
      }),
    })

    const data = await response.json()

    if (data.status === 'active') {
      $q.notify({
        type: 'positive',
        message: 'Access confirmed! Welcome to SynthStack!',
        position: 'top',
      })
      await fetchLicenseStatus()
    } else {
      $q.notify({
        type: 'info',
        message: 'Invitation not yet accepted. Please check your email.',
        position: 'top',
      })
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to check status. Please try again.',
      position: 'top',
    })
  } finally {
    checking.value = false
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  $q.notify({
    type: 'positive',
    message: 'Copied to clipboard!',
    position: 'top',
  })
}
</script>

<style lang="scss" scoped>
.license-access-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.container {
  max-width: 600px;
  width: 100%;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 3rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

  :global(.body--dark) & {
    background: #1a1a1a;
    color: #fafafa;
  }
}

.header {
  text-align: center;
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: #1a1a1a;

    :global(.body--dark) & {
      color: #fafafa;
    }
  }

  p {
    color: #666;

    :global(.body--dark) & {
      color: #a0a0a0;
    }
  }
}

.loading {
  text-align: center;
  padding: 2rem 0;

  p {
    margin-top: 1rem;
    color: #666;

    :global(.body--dark) & {
      color: #a0a0a0;
    }
  }
}

.step {
  h2 {
    color: #1a1a1a;

    :global(.body--dark) & {
      color: #fafafa;
    }
  }

  p {
    color: #666;

    :global(.body--dark) & {
      color: #a0a0a0;
    }
  }
}

.step-number {
  color: #667eea;
  font-weight: 600;
  margin-bottom: 1rem;
}

.instructions {
  background: #f7f7f7;
  padding: 1.5rem;
  border-radius: 8px;
  margin-top: 1.5rem;

  :global(.body--dark) & {
    background: #2a2a2a;
  }

  h3 {
    margin-top: 0;
    color: #1a1a1a;

    :global(.body--dark) & {
      color: #fafafa;
    }
  }

  ol {
    margin: 0.5rem 0 0 1.5rem;
    padding-left: 0;

    li {
      margin-bottom: 0.5rem;
      color: #333;

      :global(.body--dark) & {
        color: #d0d0d0;
      }
    }
  }
}

.code-block {
  background: #1a1a1a;
  color: #0d9488;
  padding: 1rem;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
  font-size: 0.9rem;

  code {
    flex: 1;
    overflow-x: auto;
  }
}

.success {
  text-align: center;

  h2 {
    margin-top: 1rem;
    color: #1a1a1a;

    :global(.body--dark) & {
      color: #fafafa;
    }
  }

  p {
    color: #666;

    :global(.body--dark) & {
      color: #a0a0a0;
    }
  }
}

.next-steps {
  text-align: left;
  background: #f7f7f7;
  padding: 1.5rem;
  border-radius: 8px;

  :global(.body--dark) & {
    background: #2a2a2a;
  }

  h3 {
    margin-top: 0;
    color: #1a1a1a;

    :global(.body--dark) & {
      color: #fafafa;
    }
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0 0;

    li {
      margin-bottom: 0.5rem;

      a {
        color: #667eea;
        text-decoration: none;
        font-weight: 500;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}

.error {
  text-align: center;
  padding: 2rem 0;

  h2 {
    color: #ef4444;
    margin-top: 1rem;
  }

  p {
    color: #666;

    :global(.body--dark) & {
      color: #a0a0a0;
    }
  }
}

.help-text {
  text-align: center;
  color: #666;
  font-size: 0.9rem;

  :global(.body--dark) & {
    color: #a0a0a0;
  }

  a {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
