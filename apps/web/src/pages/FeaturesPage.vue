<template>
  <q-page class="features-page">
    <section class="features-hero section">
      <div class="container">
        <h1>Features</h1>
        <p class="subtitle">
          Everything you need to ship AI-native SaaS — web, mobile, desktop, and PWA — from one codebase.
        </p>
      </div>
    </section>

    <section class="features-list section">
      <div class="container">
        <div class="feature-row">
          <div class="feature-content">
            <div class="feature-badge">
              Platform
            </div>
            <h2>Cross-Platform from One Codebase</h2>
            <p>Build once and ship everywhere with Vue 3 + Quasar:</p>
            <ul>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Web + PWA + iOS (Capacitor) + Android + Desktop (Electron)
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Design system, theming, and dark mode out of the box
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Multi-language (i18n) ready with locale routing
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Strong defaults for accessibility + performance
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Testing + CI patterns included
              </li>
            </ul>
          </div>
          <div class="feature-visual">
            <div class="visual-box">
              <q-icon
                name="devices"
                size="64px"
              />
            </div>
          </div>
        </div>

        <div class="feature-row reverse">
          <div class="feature-content">
            <div class="feature-badge">
              AI
            </div>
            <h2>AI Copilot + Agents</h2>
            <p>Ship production-grade AI features with sensible defaults:</p>
            <ul>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Streaming Copilot UI with tool calling
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Optional RAG with vector search (Qdrant)
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Multi-provider LLM support (OpenAI, Anthropic, OpenRouter)
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Agent orchestration + workflow automation
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> BYOK-friendly secrets and encryption patterns
              </li>
            </ul>
          </div>
          <div class="feature-visual">
            <div class="visual-box">
              <q-icon
                name="psychology"
                size="64px"
              />
            </div>
          </div>
        </div>

        <div class="feature-row">
          <div class="feature-content">
            <div class="feature-badge">
              Billing
            </div>
            <h2>Stripe Subscriptions + Lifetime Licensing</h2>
            <p>Monetize on day one with production-ready billing flows:</p>
            <ul>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Subscriptions, one-time payments, and promo codes
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Webhooks + customer portal + invoice history
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Credits / usage metering patterns
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Optional referrals program (toggleable)
              </li>
            </ul>
          </div>
          <div class="feature-visual">
            <div class="visual-box">
              <q-icon
                name="payments"
                size="64px"
              />
            </div>
          </div>
        </div>

        <div class="feature-row reverse">
          <div class="feature-content">
            <div class="feature-badge">
              Content
            </div>
            <h2>Directus CMS + Visual Editing</h2>
            <p>Manage content and product data without reinventing an admin UI:</p>
            <ul>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Directus models your Postgres schema
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> On-site visual editor for landing pages and docs
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Blog + docs + changelog patterns included
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Self-hostable with Docker (or swap providers)
              </li>
            </ul>
          </div>
          <div class="feature-visual">
            <div class="visual-box">
              <q-icon
                name="article"
                size="64px"
              />
            </div>
          </div>
        </div>

        <div class="feature-row">
          <div class="feature-content">
            <div class="feature-badge">
              Strategy
            </div>
            <h2>Multi-Agent Strategy Debates</h2>
            <p>Make better decisions with AI-powered strategic analysis:</p>
            <ul>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> 6 specialized agents debate from different perspectives
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Decision briefs with executive summaries
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Risk matrix and implementation timelines
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Developer Bot for GitHub PR generation
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Tiered pricing: Light, Standard, and Full debates
              </li>
            </ul>
          </div>
          <div class="feature-visual">
            <div class="visual-box">
              <q-icon
                name="forum"
                size="64px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="cta-section section">
      <div class="container">
        <div class="cta-card">
          <h2>Ready to ship?</h2>
          <p>Rebrand in minutes, run the setup wizard, and deploy anywhere.</p>
          <q-btn
            unelevated
            color="primary"
            size="lg"
            label="Get Started"
            @click="$router.push('/auth/register')"
          />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.features-hero {
  text-align: center;
  padding-top: var(--space-16);
  background: var(--color-bg-secondary);

  h1 {
    font-size: var(--text-4xl);
    margin-bottom: var(--space-4);
  }

  .subtitle {
    font-size: var(--text-xl);
    color: var(--color-text-secondary);
  }
}

.features-list {
  background: var(--color-bg-primary);
}

.feature-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-10);
  align-items: center;
  padding: var(--space-12) 0;
  border-bottom: 1px solid var(--color-bg-elevated);

  &:last-child {
    border-bottom: none;
  }

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }

  &.reverse {
    @media (min-width: 768px) {
      .feature-visual {
        order: -1;
      }
    }
  }
}

.feature-content {
  h2 {
    font-size: var(--text-3xl);
    margin-bottom: var(--space-4);
  }

  p {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-6);
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) 0;

      .q-icon {
        flex-shrink: 0;
      }
    }
  }
}

.feature-badge {
  display: inline-block;
  background: var(--color-primary-muted);
  color: var(--color-primary);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
  margin-bottom: var(--space-4);
}

.feature-visual {
  display: flex;
  justify-content: center;
}

.visual-box {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-bg-elevated);
  border-radius: var(--radius-xl);
  color: var(--color-primary);
}

.cta-section {
  background: var(--color-bg-secondary);
}

.cta-card {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;

  h2 {
    margin-bottom: var(--space-4);
  }

  p {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-8);
  }
}
</style>
