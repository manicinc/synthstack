<template>
  <footer
    class="footer-section"
    role="contentinfo"
    aria-label="Site footer"
  >
    <div class="footer-container">
      <!-- Main Footer Content -->
      <div class="footer-grid">
        <!-- Brand Column -->
        <div class="footer-col brand-col">
          <div class="footer-logo">
            <h3>SynthStack</h3>
            <p class="tagline">Your Agency in a Box</p>
          </div>
          <p class="footer-desc">
            Production-ready SaaS boilerplate with AI agents, visual workflows, and 50+ premium features.
            Built by <a
              href="https://manic.agency"
              target="_blank"
              rel="noopener noreferrer"
              class="company-link"
            >Manic Agency LLC</a>.
          </p>

          <!-- Contact Info -->
          <div class="contact-info">
            <a
              href="tel:+17025894847"
              class="contact-item"
              aria-label="Call Manic Agency"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>(702) 589-4847</span>
            </a>
            <a
              :href="`mailto:${branding.contactEmail}`"
              class="contact-item"
              aria-label="Email Manic Agency"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>{{ branding.contactEmail }}</span>
            </a>
            <span class="contact-item">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle
                  cx="12"
                  cy="10"
                  r="3"
                />
              </svg>
              <span>Henderson, NV 89052</span>
            </span>
          </div>

          <div class="social-links">
            <a
              href="https://github.com/manicinc/synthstack"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
            >
              <q-icon
                name="fab fa-github"
                size="24px"
              />
            </a>
            <a
              href="https://twitter.com/manicinc"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
            >
              <q-icon
                name="fab fa-twitter"
                size="24px"
              />
            </a>
            <a
              href="https://linkedin.com/company/manic-agency"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <q-icon
                name="fab fa-linkedin"
                size="24px"
              />
            </a>
          </div>
        </div>

        <!-- Product Links -->
        <div class="footer-col">
          <h4>Product</h4>
          <nav aria-label="Product navigation">
            <ul>
              <li>
                <router-link to="/#features">
                  Features
                </router-link>
              </li>
              <li>
                <router-link to="/pricing">
                  Pricing
                </router-link>
              </li>
              <li>
                <router-link to="/#ai-agents">
                  AI Co-Founders
                </router-link>
              </li>
              <li>
                <a
                  href="https://github.com/manicinc/synthstack"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
              <li>
                <router-link to="/demo">
                  Live Demo
                </router-link>
              </li>
            </ul>
          </nav>
        </div>

        <!-- Resources Links -->
        <div class="footer-col">
          <h4>Resources</h4>
          <nav aria-label="Resources navigation">
            <ul>
              <li>
                <router-link to="/docs">
                  Documentation
                </router-link>
              </li>
              <li>
                <router-link to="/blog">
                  Blog
                </router-link>
              </li>
              <li>
                <router-link to="/guides">
                  Guides
                </router-link>
              </li>
              <li>
                <router-link to="/changelog">
                  Changelog
                </router-link>
              </li>
              <li>
                <a
                  href="https://github.com/manicinc/synthstack/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Support
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <!-- Company Links -->
        <div class="footer-col">
          <h4>Company</h4>
          <nav aria-label="Company navigation">
            <ul>
              <li>
                <router-link to="/about">
                  About
                </router-link>
              </li>
              <li>
                <a
                  href="https://manic.agency"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Manic Agency
                </a>
              </li>
              <li>
                <router-link to="/contact">
                  Contact
                </router-link>
              </li>
              <li>
                <router-link to="/privacy">
                  Privacy Policy
                </router-link>
              </li>
              <li>
                <router-link to="/terms">
                  Terms of Service
                </router-link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <!-- Footer Bottom -->
      <div class="footer-bottom">
        <div class="footer-legal">
          <p>
            &copy; {{ currentYear }} <a
              href="https://manic.agency"
              target="_blank"
              rel="noopener noreferrer"
            >Manic Agency LLC</a>. All rights reserved.
          </p>
          <p class="footer-address">
            2831 St Rose Parkway, Suite 200, Henderson, NV 89052 &middot;
            <a href="tel:+17025894847">(702) 589-4847</a> &middot;
            <a href="mailto:team@manic.agency">team@manic.agency</a>
          </p>
        </div>
        <div class="footer-badges">
          <span class="badge">Built with Vue 3</span>
          <span class="badge">Powered by Quasar</span>
          <span class="badge">AI-Native</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSeo } from '@/composables/useSeo'
import { branding } from '@/config/branding'

const { addSchema } = useSeo()

const currentYear = computed(() => new Date().getFullYear())

onMounted(() => {
  // Add Organization schema for Manic Agency
  addSchema({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Manic Agency LLC',
    url: 'https://manic.agency',
    logo: 'https://manic.agency/logo.png',
    description: 'Digital agency specializing in AI-powered SaaS products and business automation',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '2831 St Rose Parkway, Suite 200',
      addressLocality: 'Henderson',
      addressRegion: 'NV',
      postalCode: '89052',
      addressCountry: 'US'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-702-589-4847',
      email: branding.contactEmail,
      contactType: 'customer service'
    },
    sameAs: [
      'https://github.com/manicinc',
      'https://twitter.com/manicinc',
      'https://linkedin.com/company/manic-agency'
    ]
  })
})
</script>

<style lang="scss" scoped>
.footer-section {
  background: linear-gradient(180deg, var(--bg-base) 0%, rgba(0, 0, 0, 0.3) 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 80px 24px 40px;
  color: rgba(255, 255, 255, 0.8);
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 60px;
  margin-bottom: 60px;

  @media (max-width: 992px) {
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}

.footer-col {
  h4 {
    font-size: 0.875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0 0 20px;
    color: #fff;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    margin-bottom: 12px;
  }

  a {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    font-size: 0.9375rem;
    transition: color 0.2s ease;

    &:hover {
      color: #00d4aa;
    }
  }
}

.brand-col {
  .footer-logo {
    margin-bottom: 16px;

    h3 {
      font-size: 1.5rem;
      font-weight: 800;
      margin: 0 0 4px;
      color: #fff;
      background: linear-gradient(135deg, #00d4aa 0%, #6366f1 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .tagline {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }
  }

  .footer-desc {
    font-size: 0.9375rem;
    line-height: 1.6;
    margin: 0 0 24px;
    color: rgba(255, 255, 255, 0.7);

    .company-link {
      color: #00d4aa;
      font-weight: 600;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: color 0.2s ease;

  svg {
    flex-shrink: 0;
    opacity: 0.6;
  }

  &:hover {
    color: rgba(255, 255, 255, 0.8);

    svg {
      opacity: 1;
    }
  }

  span {
    line-height: 1.4;
  }
}

a.contact-item:hover {
  color: #00d4aa;
}

.social-links {
  display: flex;
  gap: 16px;

  a {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.7);
    transition: all 0.3s ease;

    &:hover {
      background: rgba(0, 212, 170, 0.1);
      border-color: #00d4aa;
      color: #00d4aa;
      transform: translateY(-2px);
    }
  }
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  gap: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
}

.footer-legal {
  p {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 8px;

    a {
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;

      &:hover {
        color: #00d4aa;
        text-decoration: underline;
      }
    }
  }

  .footer-address {
    font-size: 0.8125rem;
  }
}

.footer-badges {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
  }
}

.badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 6px;
  color: #a5b4fc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

// Light mode
:global(.body--light) .footer-section {
  background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
  border-top-color: rgba(0, 0, 0, 0.08);
  color: #334155;
}

:global(.body--light) .footer-col h4 {
  color: #1e293b;
}

:global(.body--light) .footer-col a {
  color: #475569;

  &:hover {
    color: #00d4aa;
  }
}

:global(.body--light) .brand-col .footer-logo h3 {
  color: #1e293b;
  -webkit-text-fill-color: unset;
  background: none;
}

:global(.body--light) .brand-col .footer-logo .tagline {
  color: #64748b;
}

:global(.body--light) .brand-col .footer-desc {
  color: #475569;
}

:global(.body--light) .contact-item {
  color: #64748b;

  &:hover {
    color: #334155;
  }

  svg {
    color: #94a3b8;
  }
}

:global(.body--light) a.contact-item:hover {
  color: #00d4aa;
}

:global(.body--light) .social-links a {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.08);
  color: #475569;

  &:hover {
    background: rgba(0, 212, 170, 0.1);
    border-color: #00d4aa;
    color: #00d4aa;
  }
}

:global(.body--light) .footer-bottom {
  border-top-color: rgba(0, 0, 0, 0.08);
}

:global(.body--light) .footer-legal p {
  color: #64748b;

  a {
    color: #475569;

    &:hover {
      color: #00d4aa;
    }
  }
}

:global(.body--light) .badge {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.2);
  color: #4f46e5;
}
</style>
