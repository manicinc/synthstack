<template>
  <q-page class="contact-page">
    <!-- Hero -->
    <section class="page-hero">
      <div class="hero-content">
        <h1>Contact Us</h1>
        <p>Have questions? We'd love to hear from you.</p>
      </div>
    </section>

    <!-- Contact Options -->
    <section class="contact-section">
      <div class="section-container">
        <div class="contact-grid">
          <!-- Contact Form -->
          <div class="contact-form-wrapper">
            <h2>Send a Message</h2>
            <form
              class="contact-form"
              @submit.prevent="submitForm"
            >
              <div class="form-row">
                <q-input
                  v-model="form.name"
                  outlined
                  dense
                  label="Name"
                  :rules="[val => !!val || 'Required']"
                />
                <q-input
                  v-model="form.email"
                  outlined
                  dense
                  label="Email"
                  type="email"
                  :rules="[val => !!val || 'Required']"
                />
              </div>
              <q-select
                v-model="form.subject"
                outlined
                dense
                label="Subject"
                :options="subjects"
              />
              <q-input
                v-model="form.message"
                outlined
                dense
                label="Message"
                type="textarea"
                rows="5"
                :rules="[val => !!val || 'Required']"
              />
              <q-btn
                type="submit"
                color="primary"
                label="Send Message"
                :loading="sending"
              />
            </form>
          </div>

          <!-- Contact Info -->
          <div class="contact-info">
            <h2>Other Ways to Reach Us</h2>
            
            <div class="info-cards">
              <div class="info-card">
                <q-icon
                  name="email"
                  size="32px"
                />
                <h3>Email</h3>
                <p>For general inquiries</p>
                <a href="mailto:team@manic.agency">team@manic.agency</a>
              </div>
              
              <div class="info-card">
                <q-icon
                  name="support_agent"
                  size="32px"
                />
                <h3>Support</h3>
                <p>Technical support tickets</p>
                <a href="mailto:support@synthstack.app">support@synthstack.app</a>
              </div>
              
              <div class="info-card">
                <q-icon
                  name="mdi-discord"
                  size="32px"
                />
                <h3>Discord</h3>
                <p>Join our community</p>
                <a
                  href="https://discord.gg/synthstack"
                  target="_blank"
                >discord.gg/synthstack</a>
              </div>
              
              <div class="info-card">
                <q-icon
                  name="mdi-twitter"
                  size="32px"
                />
                <h3>Twitter</h3>
                <p>Follow for updates</p>
                <a
                  href="https://twitter.com/synthstack"
                  target="_blank"
                >@synthstack</a>
              </div>
            </div>

            <div class="response-time">
              <q-icon name="schedule" />
              <p>We typically respond within 24 hours during business days.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Link -->
    <section class="faq-link-section">
      <div class="section-container">
        <div class="faq-link-content">
          <q-icon
            name="help"
            size="48px"
          />
          <h2>Looking for quick answers?</h2>
          <p>Check out our frequently asked questions for common topics.</p>
          <q-btn
            color="primary"
            label="View FAQ"
            to="/faq"
          />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const sending = ref(false)

const form = reactive({
  name: '',
  email: '',
  subject: 'General Inquiry',
  message: ''
})

const subjects = [
  'General Inquiry',
  'Technical Support',
  'Feature Request',
  'Bug Report',
  'Partnership',
  'Press/Media',
  'Other'
]

async function submitForm() {
  sending.value = true
  
  // Simulate API call
  await new Promise(r => setTimeout(r, 1500))
  
  $q.notify({
    type: 'positive',
    message: 'Message sent successfully! We\'ll get back to you soon.',
    position: 'bottom-right'
  })
  
  // Reset form
  form.name = ''
  form.email = ''
  form.subject = 'General Inquiry'
  form.message = ''
  
  sending.value = false
}
</script>

<style lang="scss" scoped>
.contact-page {
  --section-padding: 80px 24px;
}

.page-hero {
  padding: 120px 24px 60px;
  text-align: center;
  
  h1 {
    font-size: 3rem;
    margin: 0 0 16px;
  }
  
  p {
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    margin: 0;
  }
}

.section-container {
  max-width: 1100px;
  margin: 0 auto;
}

.contact-section {
  padding: var(--section-padding);
}

.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
}

.contact-form-wrapper {
  h2 {
    margin: 0 0 24px;
    font-size: 1.5rem;
  }
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.contact-info {
  h2 {
    margin: 0 0 24px;
    font-size: 1.5rem;
  }
}

.info-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-card {
  padding: 24px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
  
  h3 {
    margin: 12px 0 4px;
    font-size: 1rem;
  }
  
  p {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin: 0 0 8px;
  }
  
  a {
    color: var(--q-primary);
    font-size: 0.875rem;
  }
}

.response-time {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 24px;
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  
  p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
}

.faq-link-section {
  padding: var(--section-padding);
  background: var(--color-bg-secondary);
}

.faq-link-content {
  text-align: center;
  
  h2 {
    margin: 16px 0 12px;
    font-size: 1.75rem;
  }
  
  p {
    color: var(--color-text-secondary);
    margin: 0 0 24px;
  }
}

@media (max-width: 900px) {
  .contact-grid {
    grid-template-columns: 1fr;
    gap: 48px;
  }
}

@media (max-width: 600px) {
  .form-row,
  .info-cards {
    grid-template-columns: 1fr;
  }
}
</style>
