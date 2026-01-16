<template>
  <q-page class="faq-page">
    <!-- Hero -->
    <section class="page-hero">
      <div class="hero-content">
        <h1>Frequently Asked Questions</h1>
        <p>Everything you need to know about SynthStack.</p>
      </div>
    </section>

    <!-- Search -->
    <section class="search-section">
      <div class="section-container">
        <q-input
          v-model="searchQuery"
          outlined
          dense
          placeholder="Search questions..."
          class="search-input"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </section>

    <!-- FAQ Categories -->
    <section class="faq-section">
      <div class="section-container">
        <div class="faq-layout">
          <!-- Sidebar -->
          <aside class="faq-sidebar">
            <nav class="faq-nav">
              <a
                v-for="cat in categories"
                :key="cat.id"
                :class="{ active: activeCategory === cat.id }"
                @click="activeCategory = cat.id"
              >
                <q-icon :name="cat.icon" />
                {{ cat.label }}
              </a>
            </nav>
          </aside>

          <!-- Questions -->
          <div class="faq-content">
            <q-expansion-item
              v-for="(faq, index) in filteredFaqs"
              :key="index"
              :label="faq.question"
              header-class="faq-header"
              expand-icon-class="faq-icon"
            >
              <q-card>
                <q-card-section>
                  <div v-html="faq.answer" />
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <div
              v-if="filteredFaqs.length === 0"
              class="no-results"
            >
              <q-icon
                name="search_off"
                size="48px"
              />
              <p>No questions found matching "{{ searchQuery }}"</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact CTA -->
    <section class="contact-section">
      <div class="section-container">
        <div class="contact-content">
          <q-icon
            name="help_outline"
            size="48px"
          />
          <h2>Still have questions?</h2>
          <p>Can't find what you're looking for? Reach out to our team.</p>
          <q-btn
            color="primary"
            label="Contact Support"
            to="/contact"
          />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { branding } from '@/config/branding'

const searchQuery = ref('')
const activeCategory = ref('general')

const supportEmail = branding.supportEmail || 'team@manic.agency'
const discordUrl = branding.social.discord || 'https://discord.gg/synthstack'
const communityRepoUrl = branding.github.communityRepoUrl
const proRepoUrl = branding.github.proRepoUrl || 'https://github.com/your-org/your-pro-repo'
const proRepoCloneUrl = `${proRepoUrl}.git`
const proRepoFullName = `${branding.github.orgName}/${branding.github.proRepoName}`
const proRepoDirName = branding.github.proRepoName

const categories = [
  { id: 'general', label: 'General', icon: 'info' },
  { id: 'editions', label: 'Editions', icon: 'layers' },
  { id: 'setup', label: 'Setup', icon: 'settings' },
  { id: 'billing', label: 'Billing', icon: 'payments' },
  { id: 'lifetime', label: 'Lifetime License', icon: 'vpn_key' },
  { id: 'integrations', label: 'Integrations', icon: 'extension' },
  { id: 'security', label: 'Security', icon: 'security' }
]

type FaqItem = { category: string; question: string; answer: string }

const faqs = ref<FaqItem[]>([
  // General
  {
    category: 'general',
    question: 'What is SynthStack?',
    answer: `<p>SynthStack is an <strong>AI-native, cross-platform SaaS boilerplate</strong> for building and shipping modern products.</p>
    <ul>
      <li>Vue 3 + Quasar frontend (web, iOS, Android, desktop, PWA)</li>
      <li>API gateway + Postgres + Directus CMS</li>
      <li>Stripe billing (subscriptions + lifetime licenses)</li>
      <li>AI copilot + agents (feature-flagged; BYOK supported)</li>
    </ul>`
  },
  {
    category: 'general',
    question: 'Where should I start?',
    answer: `<p>Start at <a href="/docs">/docs</a> for setup and deployment guides.</p>
    <p>If you’re self-hosting, the <a href="/setup/env">Environment Setup Wizard</a> will generate your <code>.env</code> files from templates.</p>`
  },
  {
    category: 'general',
    question: 'Is SynthStack open source?',
    answer: `<p>SynthStack uses a dual-license model:</p>
    <ul>
      <li><strong>Community Edition</strong> (source-available): <a href="${communityRepoUrl}" target="_blank" rel="noopener">${communityRepoUrl}</a></li>
      <li><strong>Pro</strong> (commercial): private repo access via lifetime license or commercial terms</li>
    </ul>`
  },

  // Editions
  {
    category: 'editions',
    question: 'What’s the difference between Community (Lite) and Pro?',
    answer: `<p><strong>Community (Lite)</strong> is designed for learning and evaluation.</p>
    <p><strong>Pro</strong> unlocks commercial usage and advanced features (agents, automations, and premium integrations).</p>
    <p class="citation">📚 Feature access is controlled by flags, so you can start Lite and upgrade when you’re ready.</p>`
  },
  {
    category: 'editions',
    question: 'Can I bring my own AI keys (BYOK)?',
    answer: `<p><strong>Yes.</strong> Self-hosted deployments can use your own OpenAI/Anthropic keys via <code>.env</code>.</p>
    <p>Use <a href="/setup/env">/setup/env</a> to generate env files for both Lite and Pro templates.</p>`
  },

  // Setup
  {
    category: 'setup',
    question: 'How do I rebrand SynthStack quickly?',
    answer: `<p>Use the <a href="/setup/branding">Branding Wizard</a> to generate a repo-root <code>config.json</code>.</p>
    <ul>
      <li>Set your product name, domain, logos, colors, and social links</li>
      <li>Set GitHub org/repo defaults used across onboarding</li>
      <li>Export and replace the repo’s <code>config.json</code>, then restart dev/build</li>
    </ul>`
  },
  {
    category: 'setup',
    question: 'How do I generate my .env files for self-hosting?',
    answer: `<p>Use the <a href="/setup/env">Environment Setup Wizard</a>.</p>
    <p>It renders ready-to-copy <code>.env</code> files from the repo’s templates (<code>.env.*.example</code>) for both Lite and Pro setups.</p>`
  },

  // Billing
  {
    category: 'billing',
    question: 'How do subscriptions work?',
    answer: `<p>Hosted plans are billed through Stripe and include a daily credit allowance.</p>
    <p>Paid plans include a free trial and you can cancel anytime from the customer portal.</p>`
  },
  {
    category: 'billing',
    question: 'Do you have a referral program?',
    answer: `<p>Yes — SynthStack supports referral links and rewards when the referrals feature is enabled.</p>
    <p>You can view the public overview at <a href="/referral">/referral</a>.</p>`
  },

  // Lifetime License
  {
    category: 'lifetime',
    question: 'How do I get repository access after checkout?',
    answer: `<p>After checkout, open <a href="/license-access">/license-access</a> and submit your GitHub username.</p>
    <p>We’ll send an invitation to join <strong>${branding.github.orgName}</strong> and grant access to <strong>${proRepoFullName}</strong>.</p>
    <p class="citation">📚 Tip: GitHub invitations sometimes take a few minutes — check your email and GitHub notifications.</p>`
  },
  {
    category: 'lifetime',
    question: 'Do I need a GitHub account?',
    answer: `<p><strong>Yes</strong>, you need a GitHub account to receive repository access.</p>
    <p>Don’t have one? Create an account at <a href="https://github.com/signup" target="_blank" rel="noopener">github.com/signup</a>.</p>`
  },
  {
    category: 'lifetime',
    question: 'Can I build multiple SaaS products with one license?',
    answer: `<p><strong>Yes.</strong> Your lifetime license allows you to build and deploy unlimited products and client projects.</p>
    <p class="warning">⚠️ You can’t resell SynthStack as a competing boilerplate product or redistribute the source.</p>`
  },
  {
    category: 'lifetime',
    question: 'How is this different from a subscription?',
    answer: `<table class="pricing-table">
      <tr><th>Feature</th><th>Hosted Subscription</th><th>Lifetime License</th></tr>
      <tr><td>Cost</td><td>Monthly/Yearly</td><td>$149 Early Bird / $249 regular</td></tr>
      <tr><td>Source Code</td><td>❌ No access</td><td>✅ Full access</td></tr>
      <tr><td>Updates</td><td>While subscribed</td><td>Lifetime</td></tr>
      <tr><td>AI Usage</td><td>Hosted credits</td><td>BYOK or self-hosted credits</td></tr>
      <tr><td>Commercial Use</td><td>Hosted account</td><td>Unlimited products</td></tr>
      <tr><td>Self-Hosting</td><td>Hosted platform</td><td>✅ Full control</td></tr>
      <tr><td>White-Label</td><td>Limited</td><td>✅ Full rebrand</td></tr>
    </table>
    <p><strong>Key difference:</strong></p>
    <p>Subscriptions give you access to use a hosted platform. The lifetime license gives you the <em>entire codebase</em> to build and ship your own product.</p>`
  },
  {
    category: 'lifetime',
    question: 'What’s the fastest way to clone and start?',
    answer: `<p>Clone the repo and follow onboarding:</p>
    <pre><code>git clone ${proRepoCloneUrl}
cd ${proRepoDirName}
pnpm install</code></pre>
    <p>Then run the setup wizards:</p>
    <ul>
      <li><a href="/setup/branding">Branding Wizard</a> → generate <code>config.json</code></li>
      <li><a href="/setup/env">Env Wizard</a> → generate <code>.env</code> files</li>
    </ul>`
  },
  {
    category: 'lifetime',
    question: 'What is your refund policy for the lifetime license?',
    answer: `<p><strong>No refunds once repository access is granted.</strong></p>
    <p>If you’re unsure, review the public docs, explore the Community Edition, and ask questions in <a href="${discordUrl}" target="_blank" rel="noopener">Discord</a> before purchasing.</p>
    <p class="citation">📚 Need help? Email <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>`
  },

  // Integrations
  {
    category: 'integrations',
    question: 'What integrations are supported?',
    answer: `<p>SynthStack ships with integrations and hooks for common SaaS needs:</p>
    <ul>
      <li>Stripe (subscriptions, webhooks, customer portal)</li>
      <li>GitHub (repo access onboarding and project integrations)</li>
      <li>Supabase (OAuth auth provider)</li>
      <li>Email providers (e.g., Resend)</li>
    </ul>`
  },

  // Security
  {
    category: 'security',
    question: 'How does authentication work?',
    answer: `<p>You can choose between:</p>
    <ul>
      <li><strong>Supabase Auth</strong> (managed OAuth providers)</li>
      <li><strong>Local auth</strong> (self-hosted email/password)</li>
    </ul>
    <p>See <a href="/docs">/docs</a> for the full authentication guide.</p>`
  },
  {
    category: 'security',
    question: 'Where do my keys and secrets live?',
    answer: `<p>For self-hosting, secrets are provided via <code>.env</code> and server configuration.</p>
    <p>For hosted plans (if enabled), BYOK keys can be stored encrypted at rest depending on your configuration.</p>`
  },
])

const filteredFaqs = computed(() => {
  let filtered = faqs.value.filter(f => f.category === activeCategory.value)

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = faqs.value.filter(f =>
      f.question.toLowerCase().includes(query) ||
      f.answer.toLowerCase().includes(query)
    )
  }

  return filtered
})
</script>

<style lang="scss" scoped>
.faq-page {
  --section-padding: 60px 24px;
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
  max-width: 1000px;
  margin: 0 auto;
}

.search-section {
  padding: 0 24px 40px;
  
  .search-input {
    max-width: 500px;
    margin: 0 auto;
  }
}

.faq-section {
  padding: var(--section-padding);
}

.faq-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 48px;
}

.faq-sidebar {
  position: sticky;
  top: 24px;
  height: fit-content;
}

.faq-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: var(--color-bg-secondary);
    }
    
    &.active {
      background: rgba(var(--q-primary-rgb), 0.1);
      color: var(--q-primary);
    }
  }
}

.faq-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:deep(.faq-header) {
  font-weight: 600;
  padding: 16px 20px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
}

:deep(.q-card) {
  background: var(--color-bg-secondary);
  border-radius: 0 0 12px 12px;
  margin-top: -12px;
  padding-top: 12px;
  
  p {
    margin: 0 0 12px;
    line-height: 1.6;
    
    &:last-child { margin-bottom: 0; }
  }
  
  ul, ol {
    margin: 12px 0;
    padding-left: 24px;
    
    li {
      margin-bottom: 8px;
      line-height: 1.6;
      
      &:last-child { margin-bottom: 0; }
    }
  }
}

.citation {
  padding: 12px;
  background: rgba(var(--q-primary-rgb), 0.05);
  border-left: 3px solid var(--q-primary);
  border-radius: 0 8px 8px 0;
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

.warning {
  padding: 12px;
  background: rgba(255, 160, 0, 0.08);
  border-left: 3px solid rgba(255, 160, 0, 0.9);
  border-radius: 0 8px 8px 0;
  color: var(--color-text-secondary);
}

.pricing-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 0.95rem;

  th, td {
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 10px 12px;
    text-align: left;
  }

  th {
    background: rgba(var(--q-primary-rgb), 0.08);
    font-weight: 700;
  }
}

.no-results {
  text-align: center;
  padding: 48px 0;
  color: var(--color-text-secondary);
  
  p {
    margin: 16px 0 0;
  }
}

.contact-section {
  padding: var(--section-padding);
  text-align: center;
  
  .contact-content {
    max-width: 600px;
    margin: 0 auto;
    
    h2 {
      margin: 24px 0 12px;
    }
    
    p {
      color: var(--color-text-secondary);
      margin: 0 0 24px;
    }
  }
}

@media (max-width: 768px) {
  .faq-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .faq-sidebar {
    position: static;
    
    .faq-nav {
      flex-direction: row;
      overflow-x: auto;
      padding-bottom: 8px;
      
      a {
        white-space: nowrap;
      }
    }
  }
}
</style>
