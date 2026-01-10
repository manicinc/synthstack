<!--
  @component CareersPage
  @description Careers/Jobs page for SEO and recruitment.
-->
<template>
  <q-page class="careers-page">
    <!-- Hero Section -->
    <section class="careers-hero">
      <div class="container">
        <div class="hero-badge">
          We're Hiring!
        </div>
        <h1>Join the Printverse Team</h1>
        <p class="subtitle">
          Help us revolutionize 3D printing with AI. We're looking for passionate 
          makers, engineers, and creators to join our mission.
        </p>
      </div>
    </section>

    <!-- Why Join Us -->
    <section class="perks-section">
      <div class="container">
        <h2 class="section-title">
          Why Printverse?
        </h2>
        <div class="perks-grid">
          <div class="perk-card">
            <q-icon
              name="sym_o_home"
              size="32px"
            />
            <h3>Remote-First</h3>
            <p>Work from anywhere in the world. We're a fully distributed team.</p>
          </div>
          <div class="perk-card">
            <q-icon
              name="sym_o_rocket_launch"
              size="32px"
            />
            <h3>Startup Energy</h3>
            <p>Move fast, ship often, and make a real impact on the product.</p>
          </div>
          <div class="perk-card">
            <q-icon
              name="sym_o_precision_manufacturing"
              size="32px"
            />
            <h3>Maker Culture</h3>
            <p>We're makers ourselves. Free filament and equipment budgets included.</p>
          </div>
          <div class="perk-card">
            <q-icon
              name="sym_o_school"
              size="32px"
            />
            <h3>Learning Budget</h3>
            <p>Annual budget for courses, conferences, and professional development.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Open Positions -->
    <section class="positions-section">
      <div class="container">
        <h2 class="section-title">
          Open Positions
        </h2>
        <div class="positions-list">
          <div
            v-for="job in openPositions"
            :key="job.id"
            class="position-card"
          >
            <div class="position-info">
              <h3>{{ job.title }}</h3>
              <div class="position-meta">
                <span class="meta-item">
                  <q-icon
                    name="sym_o_location_on"
                    size="16px"
                  />
                  {{ job.location }}
                </span>
                <span class="meta-item">
                  <q-icon
                    name="sym_o_work"
                    size="16px"
                  />
                  {{ job.type }}
                </span>
                <span class="meta-item">
                  <q-icon
                    name="sym_o_category"
                    size="16px"
                  />
                  {{ job.department }}
                </span>
              </div>
            </div>
            <q-btn
              label="Apply"
              color="accent"
              unelevated
              :href="`mailto:team@manic.agency?subject=Application: ${job.title}`"
            />
          </div>
        </div>
        
        <div
          v-if="openPositions.length === 0"
          class="no-positions"
        >
          <p>No open positions at the moment. Check back soon!</p>
        </div>
      </div>
    </section>

    <!-- Don't See Your Role -->
    <section class="general-section">
      <div class="container">
        <div class="general-card">
          <h2>Don't see your role?</h2>
          <p>
            We're always looking for talented people. Send us your resume and tell us 
            how you can contribute to Printverse.
          </p>
          <q-btn
            label="Send General Application"
            color="accent"
            outline
            href="mailto:team@manic.agency?subject=General Application"
          />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSeo } from '@/composables/useSeo'

const { setPageSeo, addSchema } = useSeo()

// Open positions
const openPositions = [
  {
    id: 1,
    title: 'Senior Full-Stack Engineer',
    location: 'Remote',
    type: 'Full-time',
    department: 'Engineering'
  },
  {
    id: 2,
    title: 'ML Engineer - 3D Geometry',
    location: 'Remote',
    type: 'Full-time',
    department: 'AI/ML'
  },
  {
    id: 3,
    title: 'Technical Content Writer',
    location: 'Remote',
    type: 'Part-time',
    department: 'Marketing'
  }
]

// SEO
onMounted(() => {
  setPageSeo({
    title: 'Careers - Join the Printverse Team | Printverse',
    description: 'Join Printverse and help revolutionize 3D printing with AI. View open positions in engineering, ML, design, and marketing. Remote-first culture.',
    keywords: [
      'printverse careers',
      'printverse jobs',
      '3d printing jobs',
      'ai ml jobs',
      'remote engineering jobs',
      'startup jobs'
    ],
    canonicalPath: '/careers',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Careers', url: '/careers' }
    ]
  })
  
  // Add JobPosting schema
  openPositions.forEach(job => {
    addSchema({
      '@type': 'JobPosting',
      title: job.title,
      description: `${job.title} position at Printverse`,
      employmentType: job.type === 'Full-time' ? 'FULL_TIME' : 'PART_TIME',
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'US'
        }
      },
      jobLocationType: 'TELECOMMUTE',
      hiringOrganization: {
        '@type': 'Organization',
        name: 'Printverse',
        sameAs: 'https://synthstack.app'
      }
    })
  })
})
</script>

<style lang="scss" scoped>
.careers-page {
  background: var(--bg-primary);
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 var(--space-md);
}

// Hero
.careers-hero {
  padding: var(--space-4xl) 0;
  text-align: center;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  
  .hero-badge {
    display: inline-block;
    padding: var(--space-xs) var(--space-md);
    background: var(--color-accent);
    color: white;
    font-size: var(--text-sm);
    font-weight: 600;
    border-radius: var(--radius-full);
    margin-bottom: var(--space-lg);
  }
  
  h1 {
    font-family: var(--font-display);
    font-size: clamp(2rem, 5vw, 3rem);
    margin-bottom: var(--space-md);
  }
  
  .subtitle {
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.7;
  }
}

// Section title
.section-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  text-align: center;
  margin-bottom: var(--space-2xl);
}

// Perks
.perks-section {
  padding: var(--space-3xl) 0;
}

.perks-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-lg);
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.perk-card {
  padding: var(--space-xl);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  text-align: center;
  
  .q-icon {
    color: var(--color-accent);
    margin-bottom: var(--space-md);
  }
  
  h3 {
    font-family: var(--font-display);
    font-size: var(--text-base);
    margin-bottom: var(--space-sm);
  }
  
  p {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    line-height: 1.6;
  }
}

// Positions
.positions-section {
  padding: var(--space-3xl) 0;
  background: var(--bg-secondary);
}

.positions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.position-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg) var(--space-xl);
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  
  @media (max-width: 640px) {
    flex-direction: column;
    gap: var(--space-md);
    text-align: center;
  }
  
  h3 {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    margin-bottom: var(--space-xs);
  }
  
  .position-meta {
    display: flex;
    gap: var(--space-lg);
    
    @media (max-width: 640px) {
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-sm);
    }
    
    .meta-item {
      display: flex;
      align-items: center;
      gap: var(--space-2xs);
      color: var(--text-muted);
      font-size: var(--text-sm);
    }
  }
}

.no-positions {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--text-muted);
}

// General
.general-section {
  padding: var(--space-3xl) 0;
}

.general-card {
  text-align: center;
  padding: var(--space-2xl);
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  border-radius: var(--radius-xl);
  
  h2 {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    margin-bottom: var(--space-sm);
  }
  
  p {
    color: var(--text-secondary);
    margin-bottom: var(--space-lg);
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }
}
</style>





