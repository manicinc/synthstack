<template>
  <q-page class="about-page">
    <!-- Hero -->
    <section class="page-hero">
      <div class="hero-content">
        <h1
          :data-directus="page ? editableAttr({
            collection: 'pages',
            item: page.id,
            fields: 'title',
            mode: 'popover'
          }) : undefined"
        >
          {{ page?.title || 'About SynthStack' }}
        </h1>
        <p
          :data-directus="page ? editableAttr({
            collection: 'pages',
            item: page.id,
            fields: 'description',
            mode: 'popover'
          }) : undefined"
        >
          {{ page?.description || 'Building the future of AI-powered development.' }}
        </p>
      </div>
    </section>

    <!-- Catalog -->
    <section class="content-section alt-bg">
      <div class="section-container catalog-blurb">
        <div class="catalog-copy">
          <h2>Public Catalog</h2>
          <p>
            We maintain a public catalog of community models, ready-to-use generation presets,
            and scraped printer/filament specs. It keeps our recommendations transparent and
            makes it easy to jump into the generator with trusted starting points.
          </p>
          <div class="catalog-actions">
            <q-btn
              color="primary"
              label="Open Catalog"
              to="/catalog"
            />
            <q-btn
              flat
              color="primary"
              label="View Community"
              to="/community"
            />
          </div>
        </div>
        <div class="catalog-card">
          <div class="badge">
            Open data
          </div>
          <h3>Models, presets, specs</h3>
          <p>CC-licensed where possible. Directus/Supabase ready for enterprise.</p>
        </div>
      </div>
    </section>

    <!-- Mission -->
    <section class="content-section">
      <div class="section-container">
        <div class="mission-grid">
          <div class="mission-text">
            <h2>Our Mission</h2>
            <p>
              We believe every maker deserves perfect prints without the frustration 
              of endless calibration and failed attempts. Printverse uses cutting-edge 
              AI to analyze your models and generate optimized slicer profiles that 
              work the first time.
            </p>
            <p>
              Founded in 2024 by a team of 3D printing enthusiasts and machine learning 
              engineers, we've helped generate over 50,000 successful print profiles 
              for makers around the world.
            </p>
          </div>
          <div class="mission-image">
            <div class="image-placeholder">
              <q-icon
                name="groups"
                size="80px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Values -->
    <section class="content-section alt-bg">
      <div class="section-container">
        <h2 class="section-title">
          Our Values
        </h2>
        <div class="values-grid">
          <div class="value-card">
            <div class="value-icon">
              <q-icon name="auto_awesome" />
            </div>
            <h3>Innovation First</h3>
            <p>We push the boundaries of what's possible with AI-powered print optimization.</p>
          </div>
          <div class="value-card">
            <div class="value-icon">
              <q-icon name="handshake" />
            </div>
            <h3>Community Driven</h3>
            <p>We build with and for the maker community, listening to real-world feedback.</p>
          </div>
          <div class="value-card">
            <div class="value-icon">
              <q-icon name="visibility" />
            </div>
            <h3>Transparency</h3>
            <p>Open about our methods, data practices, and committed to user privacy.</p>
          </div>
          <div class="value-card">
            <div class="value-icon">
              <q-icon name="all_inclusive" />
            </div>
            <h3>Accessibility</h3>
            <p>3D printing should be for everyone, not just experts. We lower the barrier.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Team -->
    <section class="content-section">
      <div class="section-container">
        <h2 class="section-title">
          The Team
        </h2>
        <p class="section-subtitle">
          Built by <a
            href="https://manic.agency"
            target="_blank"
          >manic.agency</a> — 
          a creative technology studio specializing in AI-powered tools and experiences.
        </p>
        <div class="team-grid">
          <div class="team-member">
            <div class="member-avatar">
              <q-icon
                name="person"
                size="48px"
              />
            </div>
            <h4>Engineering</h4>
            <p>Full-stack developers, ML engineers, and DevOps specialists</p>
          </div>
          <div class="team-member">
            <div class="member-avatar">
              <q-icon
                name="brush"
                size="48px"
              />
            </div>
            <h4>Design</h4>
            <p>UX/UI designers focused on intuitive, beautiful interfaces</p>
          </div>
          <div class="team-member">
            <div class="member-avatar">
              <q-icon
                name="print"
                size="48px"
              />
            </div>
            <h4>3D Printing Experts</h4>
            <p>Makers with years of hands-on experience and knowledge</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="stats-section">
      <div class="section-container">
        <div class="stats-grid">
          <div class="stat">
            <span class="stat-value">50K+</span>
            <span class="stat-label">Profiles Generated</span>
          </div>
          <div class="stat">
            <span class="stat-value">300+</span>
            <span class="stat-label">Supported Printers</span>
          </div>
          <div class="stat">
            <span class="stat-value">500+</span>
            <span class="stat-label">Filaments Database</span>
          </div>
          <div class="stat">
            <span class="stat-value">85%</span>
            <span class="stat-label">First-Print Success</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact CTA -->
    <section class="cta-section">
      <div class="section-container">
        <h2>Want to work with us?</h2>
        <p>We're always looking for talented people who share our passion.</p>
        <div class="cta-buttons">
          <q-btn
            color="primary"
            label="View Careers"
            to="/careers"
          />
          <q-btn
            outline
            color="white"
            label="Contact Us"
            to="/contact"
          />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePages, type Page } from '@/composables/usePages'
import { useVisualEditing } from '@/composables/useVisualEditing'

const { fetchPage } = usePages()
const { editableAttr } = useVisualEditing()

const page = ref<Page | null>(null)

onMounted(async () => {
  // Try to fetch from Directus
  page.value = await fetchPage('about')
})
</script>

<style lang="scss" scoped>
.about-page {
  --section-padding: 80px 24px;
}

.page-hero {
  padding: 120px 24px 80px;
  text-align: center;
  background: linear-gradient(135deg, var(--color-bg-secondary), var(--color-bg-primary));
  
  h1 {
    font-size: 3rem;
    margin: 0 0 16px;
  }
  
  p {
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    margin: 0;
    max-width: 600px;
    margin: 0 auto;
  }
}

.content-section {
  padding: var(--section-padding);
  
  &.alt-bg {
    background: var(--color-bg-secondary);
  }
}

.section-container {
  max-width: 1100px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  margin: 0 0 16px;
  font-size: 2rem;
}

.section-subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  margin: 0 0 48px;
  
  a {
    color: var(--q-primary);
  }
}

.mission-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
}

.catalog-blurb {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
  align-items: center;
}

.catalog-copy h2 {
  margin: 0 0 12px;
}

.catalog-copy p {
  color: var(--color-text-secondary);
  margin: 0 0 16px;
}

.catalog-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.catalog-card {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 16px;
  background: var(--color-bg);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}

.catalog-card .badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(211, 84, 0, 0.12);
  color: var(--q-primary);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  margin-bottom: 8px;
}

.catalog-card h3 {
  margin: 0 0 8px;
}

.catalog-card p {
  margin: 0;
  color: var(--color-text-secondary);
}

@media (max-width: 900px) {
  .catalog-blurb {
    grid-template-columns: 1fr;
  }
}

.mission-text {
  h2 {
    margin: 0 0 24px;
    font-size: 2rem;
  }
  
  p {
    color: var(--color-text-secondary);
    line-height: 1.8;
    margin: 0 0 16px;
  }
}

.image-placeholder {
  aspect-ratio: 1;
  background: var(--color-bg-tertiary);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.values-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.value-card {
  padding: 32px 24px;
  background: var(--color-bg-primary);
  border-radius: 16px;
  text-align: center;
  
  .value-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: rgba(var(--q-primary-rgb), 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    color: var(--q-primary);
    font-size: 28px;
  }
  
  h3 {
    margin: 0 0 12px;
    font-size: 1.125rem;
  }
  
  p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.team-member {
  text-align: center;
  padding: 32px;
  background: var(--color-bg-secondary);
  border-radius: 16px;
  
  .member-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--color-bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    color: var(--color-text-muted);
  }
  
  h4 {
    margin: 0 0 8px;
  }
  
  p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
}

.stats-section {
  padding: var(--section-padding);
  background: linear-gradient(135deg, var(--q-primary), var(--q-secondary));
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
  text-align: center;
  color: white;
  
  .stat-value {
    display: block;
    font-size: 2.5rem;
    font-weight: 700;
  }
  
  .stat-label {
    font-size: 0.875rem;
    opacity: 0.9;
  }
}

.cta-section {
  padding: var(--section-padding);
  text-align: center;
  background: var(--color-bg-secondary);
  
  h2 {
    margin: 0 0 12px;
    font-size: 2rem;
  }
  
  p {
    margin: 0 0 32px;
    color: var(--color-text-secondary);
  }
  
  .cta-buttons {
    display: flex;
    gap: 16px;
    justify-content: center;
  }
}

@media (max-width: 900px) {
  .mission-grid,
  .values-grid,
  .team-grid,
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .values-grid,
  .team-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .page-hero h1 {
    font-size: 2rem;
  }
}
</style>
