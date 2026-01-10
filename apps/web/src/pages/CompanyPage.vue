<!--
  @component CompanyPage
  @description Company overview page linking to all company-related pages.
  Acts as a hub for About, Team, Careers, News, etc.
-->
<template>
  <q-page class="company-page">
    <!-- Hero Section -->
    <section class="company-hero">
      <div class="container">
        <div class="hero-logo">
          <img
            src="/logo/printverse-mark.svg"
            alt="Printverse"
          >
        </div>
        <h1>Printverse</h1>
        <p class="tagline">
          AI-Powered 3D Printing Profile Generator
        </p>
        <p class="description">
          We're on a mission to make perfect 3D prints accessible to everyone. 
          From beginners to professionals, Printverse uses artificial intelligence 
          to generate optimized slicer settings for any printer and filament combination.
        </p>
      </div>
    </section>

    <!-- Company Links Grid -->
    <section class="links-section">
      <div class="container">
        <div class="links-grid">
          <router-link
            to="/about"
            class="link-card"
          >
            <q-icon
              name="sym_o_info"
              size="32px"
            />
            <h2>About Us</h2>
            <p>Learn about our mission, values, and the technology behind Printverse.</p>
            <span class="link-arrow">
              <q-icon name="sym_o_arrow_forward" />
            </span>
          </router-link>
          
          <router-link
            to="/careers"
            class="link-card"
          >
            <q-icon
              name="sym_o_work"
              size="32px"
            />
            <h2>Careers</h2>
            <p>Join our team and help shape the future of 3D printing.</p>
            <span class="link-arrow">
              <q-icon name="sym_o_arrow_forward" />
            </span>
          </router-link>
          
          <router-link
            to="/news"
            class="link-card"
          >
            <q-icon
              name="sym_o_newspaper"
              size="32px"
            />
            <h2>News</h2>
            <p>Latest announcements, features, and company updates.</p>
            <span class="link-arrow">
              <q-icon name="sym_o_arrow_forward" />
            </span>
          </router-link>
          
          <router-link
            to="/contact"
            class="link-card"
          >
            <q-icon
              name="sym_o_mail"
              size="32px"
            />
            <h2>Contact</h2>
            <p>Get in touch with our team for support or inquiries.</p>
            <span class="link-arrow">
              <q-icon name="sym_o_arrow_forward" />
            </span>
          </router-link>
          
          <router-link
            to="/blog"
            class="link-card"
          >
            <q-icon
              name="sym_o_article"
              size="32px"
            />
            <h2>Blog</h2>
            <p>Tutorials, guides, and tips for better 3D prints.</p>
            <span class="link-arrow">
              <q-icon name="sym_o_arrow_forward" />
            </span>
          </router-link>
          
          <a
            href="https://manic.agency"
            target="_blank"
            rel="noopener"
            class="link-card external"
          >
            <q-icon
              name="sym_o_business"
              size="32px"
            />
            <h2>Manic Agency</h2>
            <p>Printverse is created by Manic Agency.</p>
            <span class="link-arrow">
              <q-icon name="sym_o_open_in_new" />
            </span>
          </a>
        </div>
      </div>
    </section>

    <!-- Company Info -->
    <section class="info-section">
      <div class="container">
        <div class="info-grid">
          <div class="info-card">
            <h3>Headquarters</h3>
            <p>Fully Remote<br>Worldwide</p>
          </div>
          <div class="info-card">
            <h3>Founded</h3>
            <p>2024</p>
          </div>
          <div class="info-card">
            <h3>Team Size</h3>
            <p>10-20 people</p>
          </div>
          <div class="info-card">
            <h3>Contact</h3>
            <p><a href="mailto:team@manic.agency">team@manic.agency</a></p>
          </div>
        </div>
      </div>
    </section>

    <!-- Social Links -->
    <section class="social-section">
      <div class="container">
        <h2>Follow Us</h2>
        <div class="social-links">
          <a
            href="https://twitter.com/printverse"
            target="_blank"
            rel="noopener"
            class="social-link"
          >
            <q-icon
              name="sym_o_alternate_email"
              size="24px"
            />
            Twitter
          </a>
          <a
            href="https://github.com/manicinc/printverse"
            target="_blank"
            rel="noopener"
            class="social-link"
          >
            <q-icon
              name="sym_o_code"
              size="24px"
            />
            GitHub
          </a>
          <a
            href="https://discord.gg/printverse"
            target="_blank"
            rel="noopener"
            class="social-link"
          >
            <q-icon
              name="sym_o_forum"
              size="24px"
            />
            Discord
          </a>
          <a
            href="https://www.youtube.com/@printverse"
            target="_blank"
            rel="noopener"
            class="social-link"
          >
            <q-icon
              name="sym_o_play_circle"
              size="24px"
            />
            YouTube
          </a>
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSeo } from '@/composables/useSeo'

const { setPageSeo, addSchema } = useSeo()

onMounted(() => {
  setPageSeo({
    title: 'Company - About Printverse | Printverse',
    description: 'Learn about Printverse, the AI-powered 3D printing profile generator. Explore our mission, team, careers, and company news.',
    keywords: [
      'printverse company',
      'about printverse',
      '3d printing startup',
      'ai slicer company'
    ],
    canonicalPath: '/company',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Company', url: '/company' }
    ]
  })
  
  // Add Organization schema
  addSchema({
    '@type': 'Organization',
    name: 'Printverse',
    url: 'https://synthstack.app',
    logo: 'https://synthstack.app/logo/printverse-logo.svg',
    description: 'AI-powered 3D printing profile generator',
    foundingDate: '2024',
    founders: [{
      '@type': 'Organization',
      name: 'Manic Agency',
      url: 'https://manic.agency'
    }],
    sameAs: [
      'https://twitter.com/printverse',
      'https://github.com/manicinc/printverse',
      'https://discord.gg/printverse'
    ]
  })
})
</script>

<style lang="scss" scoped>
.company-page {
  background: var(--bg-primary);
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 var(--space-md);
}

// Hero
.company-hero {
  padding: var(--space-4xl) 0;
  text-align: center;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  
  .hero-logo {
    margin-bottom: var(--space-lg);
    
    img {
      height: 80px;
    }
  }
  
  h1 {
    font-family: var(--font-display);
    font-size: clamp(2.5rem, 6vw, 4rem);
    margin-bottom: var(--space-xs);
  }
  
  .tagline {
    font-size: var(--text-lg);
    color: var(--color-accent);
    margin-bottom: var(--space-lg);
  }
  
  .description {
    color: var(--text-secondary);
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.8;
  }
}

// Links
.links-section {
  padding: var(--space-3xl) 0;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.link-card {
  display: block;
  padding: var(--space-xl);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: inherit;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    
    .link-arrow {
      transform: translateX(4px);
    }
  }
  
  .q-icon {
    color: var(--color-accent);
    margin-bottom: var(--space-md);
  }
  
  h2 {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    margin-bottom: var(--space-sm);
  }
  
  p {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    line-height: 1.6;
    margin-bottom: var(--space-md);
  }
  
  .link-arrow {
    position: absolute;
    bottom: var(--space-lg);
    right: var(--space-lg);
    color: var(--color-accent);
    transition: transform 0.2s;
  }
  
  &.external {
    border-style: dashed;
  }
}

// Info
.info-section {
  padding: var(--space-3xl) 0;
  background: var(--bg-secondary);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-lg);
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.info-card {
  text-align: center;
  
  h3 {
    font-size: var(--text-sm);
    color: var(--text-muted);
    margin-bottom: var(--space-xs);
  }
  
  p {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    
    a {
      color: var(--color-accent);
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
}

// Social
.social-section {
  padding: var(--space-3xl) 0;
  text-align: center;
  
  h2 {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    margin-bottom: var(--space-xl);
  }
}

.social-links {
  display: flex;
  justify-content: center;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.social-link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  text-decoration: none;
  transition: all 0.2s;
  
  &:hover {
    background: var(--bg-tertiary);
    color: var(--color-accent);
  }
}
</style>





