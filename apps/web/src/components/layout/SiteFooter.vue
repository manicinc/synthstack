<template>
  <footer class="global-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="logo-icon-wrap">
          <img
            :src="mark"
            :alt="name"
            class="logo-icon"
          >
        </div>
        <div>
          <strong>{{ name }}</strong>
          <p>{{ tagline }}. AI-native, cross-platform, production-ready.</p>
        </div>
      </div>

      <div class="footer-grid">
        <div class="footer-col">
          <h3>Product</h3>
          <router-link to="/pricing">
            Pricing
          </router-link>
          <router-link to="/examples">
            Examples
          </router-link>
          <a
            v-if="social.github"
            :href="social.github"
            target="_blank"
            rel="noopener"
          >GitHub</a>
          <a
            :href="links.docs"
            target="_blank"
            rel="noopener"
          >Documentation</a>
        </div>

        <div class="footer-col">
          <h3>Company</h3>
          <router-link to="/about">
            About
          </router-link>
          <router-link to="/blog">
            Blog
          </router-link>
          <router-link to="/contact">
            Contact
          </router-link>
          <router-link to="/community">
            Community
          </router-link>
        </div>

        <div class="footer-col">
          <h3>Resources</h3>
          <router-link to="/blog">
            Blog & Guides
          </router-link>
          <router-link to="/faq">
            FAQ
          </router-link>
          <router-link :to="legal.privacyUrl">
            Privacy
          </router-link>
          <router-link :to="legal.termsUrl">
            Terms
          </router-link>
          <router-link :to="legal.cookiesUrl">
            Cookies
          </router-link>
          <router-link :to="legal.securityUrl">
            Security
          </router-link>
          <router-link :to="legal.gdprUrl">
            GDPR
          </router-link>
        </div>

        <div class="footer-col">
          <h3>Social</h3>
          <a
            v-if="social.discord"
            :href="social.discord"
            target="_blank"
            rel="noopener"
            class="with-icon"
          >
            <span class="icon">◎</span>Discord
          </a>
          <a
            v-if="social.github"
            :href="social.github"
            target="_blank"
            rel="noopener"
            class="with-icon"
            aria-label="Follow us on GitHub"
          >
            <span class="icon" aria-hidden="true">◆</span>GitHub
          </a>
          <a
            v-if="social.twitter"
            :href="social.twitter"
            target="_blank"
            rel="noopener"
            class="with-icon"
          >
            <span class="icon">✦</span>Twitter
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useBranding } from '@/composables/useBranding'

const { name, tagline, mark, social, links, legal } = useBranding()
</script>

<style scoped lang="scss">
.global-footer {
  border-top: 1px solid var(--lp-border, #e0e0e0);
  background: var(--lp-bg-alt, var(--color-bg-secondary, #f8f9fa));
  padding: 20px;
  color: var(--lp-text, var(--color-text-primary));
}

.footer-inner {
  max-width: 1180px;
  margin: 0 auto;
  display: flex;
  gap: 20px;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 12px;

  p {
    margin: 0;
    color: var(--lp-text-secondary, #555);
    font-size: 0.9rem;
  }
}

.logo-icon-wrap {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  box-shadow: 0 6px 14px rgba(0,0,0,0.08);
}

.footer-links,
.footer-socials,
.footer-grid {
  width: 100%;
}

.footer-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 6px;

  h3 {
    margin: 0 0 4px;
    font-size: 0.95rem;
    color: var(--lp-text, var(--color-text-primary));
  }

  a,
  :deep(a) {
    color: var(--lp-text-secondary, #444);
    text-decoration: none;
    font-weight: 600;
    line-height: 1.5;
    &:hover { color: var(--primary, #0d9488); }
  }
}

.with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.icon {
  font-size: 0.8rem;
  opacity: 0.8;
}
</style>
