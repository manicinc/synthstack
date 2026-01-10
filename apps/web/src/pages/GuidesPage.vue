<!--
  @component GuidesPage
  @description Hub page for all 3D printing guides and tutorials.
  SEO optimized with links to detailed guide pages.
-->
<template>
  <q-page class="guides-page">
    <!-- Hero Section -->
    <section class="guides-hero">
      <div class="container">
        <h1>3D Printing Guides & Tutorials</h1>
        <p class="subtitle">
          Master 3D printing with our comprehensive guides. From beginner basics to 
          advanced techniques, we've got you covered.
        </p>
      </div>
    </section>

    <!-- Featured Guides -->
    <section class="featured-section">
      <div class="container">
        <h2>Popular Guides</h2>
        <div class="guides-grid">
          <router-link
            to="/guides/layer-height-explained"
            class="guide-card featured"
          >
            <div class="guide-badge">
              Beginner
            </div>
            <div class="guide-icon">
              📐
            </div>
            <h3>Layer Height Explained</h3>
            <p>
              Complete guide to choosing the right layer height for quality, speed, 
              and strength in your 3D prints.
            </p>
            <div class="guide-meta">
              <span>12 min read</span>
              <span class="arrow">→</span>
            </div>
          </router-link>

          <router-link
            to="/guides/retraction-settings-guide"
            class="guide-card featured"
          >
            <div class="guide-badge intermediate">
              Intermediate
            </div>
            <div class="guide-icon">
              🧵
            </div>
            <h3>Fix Stringing Forever</h3>
            <p>
              Master retraction settings to eliminate stringing, oozing, and blobs 
              from your prints.
            </p>
            <div class="guide-meta">
              <span>15 min read</span>
              <span class="arrow">→</span>
            </div>
          </router-link>

          <router-link
            to="/guides/pla-vs-petg-vs-abs"
            class="guide-card featured"
          >
            <div class="guide-badge">
              Beginner
            </div>
            <div class="guide-icon">
              🎨
            </div>
            <h3>PLA vs PETG vs ABS</h3>
            <p>
              Compare the three most popular filaments. Learn which is best for 
              your specific project.
            </p>
            <div class="guide-meta">
              <span>18 min read</span>
              <span class="arrow">→</span>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Guides by Category -->
    <section class="categories-section">
      <div class="container">
        <!-- Slicer Settings -->
        <div class="category">
          <h2>Slicer Settings</h2>
          <div class="guides-list">
            <router-link
              to="/guides/layer-height-explained"
              class="guide-item"
            >
              <span class="guide-title">Layer Height Explained</span>
              <span class="guide-tags">
                <span class="tag">Quality</span>
                <span class="tag">Speed</span>
              </span>
            </router-link>
            <router-link
              to="/guides/retraction-settings-guide"
              class="guide-item"
            >
              <span class="guide-title">Retraction Settings Guide</span>
              <span class="guide-tags">
                <span class="tag">Stringing</span>
                <span class="tag">Troubleshooting</span>
              </span>
            </router-link>
            <router-link
              to="/guides/print-speed-optimization"
              class="guide-item"
            >
              <span class="guide-title">Print Speed Optimization</span>
              <span class="guide-tags">
                <span class="tag">Speed</span>
                <span class="tag">Quality</span>
              </span>
            </router-link>
            <router-link
              to="/guides/infill-patterns-guide"
              class="guide-item"
            >
              <span class="guide-title">Infill Patterns Explained</span>
              <span class="guide-tags">
                <span class="tag">Strength</span>
                <span class="tag">Settings</span>
              </span>
            </router-link>
            <router-link
              to="/guides/support-settings"
              class="guide-item"
            >
              <span class="guide-title">Support Settings Guide</span>
              <span class="guide-tags">
                <span class="tag">Supports</span>
                <span class="tag">Overhangs</span>
              </span>
            </router-link>
          </div>
        </div>

        <!-- Filament Guides -->
        <div class="category">
          <h2>Filament Guides</h2>
          <div class="guides-list">
            <router-link
              to="/guides/pla-vs-petg-vs-abs"
              class="guide-item"
            >
              <span class="guide-title">PLA vs PETG vs ABS Comparison</span>
              <span class="guide-tags">
                <span class="tag">Filament</span>
                <span class="tag">Comparison</span>
              </span>
            </router-link>
            <router-link
              to="/guides/printing-petg"
              class="guide-item"
            >
              <span class="guide-title">Complete PETG Printing Guide</span>
              <span class="guide-tags">
                <span class="tag">PETG</span>
                <span class="tag">Settings</span>
              </span>
            </router-link>
            <router-link
              to="/guides/printing-tpu"
              class="guide-item"
            >
              <span class="guide-title">TPU Flexible Filament Guide</span>
              <span class="guide-tags">
                <span class="tag">TPU</span>
                <span class="tag">Flexible</span>
              </span>
            </router-link>
            <router-link
              to="/guides/filament-storage"
              class="guide-item"
            >
              <span class="guide-title">Filament Storage & Drying</span>
              <span class="guide-tags">
                <span class="tag">Storage</span>
                <span class="tag">Maintenance</span>
              </span>
            </router-link>
          </div>
        </div>

        <!-- Troubleshooting -->
        <div class="category">
          <h2>Troubleshooting</h2>
          <div class="guides-list">
            <router-link
              to="/guides/fix-stringing"
              class="guide-item"
            >
              <span class="guide-title">How to Fix Stringing</span>
              <span class="guide-tags">
                <span class="tag">Stringing</span>
                <span class="tag">Fix</span>
              </span>
            </router-link>
            <router-link
              to="/guides/fix-warping"
              class="guide-item"
            >
              <span class="guide-title">How to Fix Warping</span>
              <span class="guide-tags">
                <span class="tag">Warping</span>
                <span class="tag">Adhesion</span>
              </span>
            </router-link>
            <router-link
              to="/guides/fix-layer-shifting"
              class="guide-item"
            >
              <span class="guide-title">How to Fix Layer Shifting</span>
              <span class="guide-tags">
                <span class="tag">Layer Shift</span>
                <span class="tag">Hardware</span>
              </span>
            </router-link>
            <router-link
              to="/guides/fix-under-extrusion"
              class="guide-item"
            >
              <span class="guide-title">How to Fix Under-Extrusion</span>
              <span class="guide-tags">
                <span class="tag">Extrusion</span>
                <span class="tag">Flow</span>
              </span>
            </router-link>
          </div>
        </div>

        <!-- Calibration -->
        <div class="category">
          <h2>Printer Calibration</h2>
          <div class="guides-list">
            <router-link
              to="/guides/bed-leveling"
              class="guide-item"
            >
              <span class="guide-title">Bed Leveling Guide</span>
              <span class="guide-tags">
                <span class="tag">Calibration</span>
                <span class="tag">First Layer</span>
              </span>
            </router-link>
            <router-link
              to="/guides/e-step-calibration"
              class="guide-item"
            >
              <span class="guide-title">E-Step Calibration</span>
              <span class="guide-tags">
                <span class="tag">Extruder</span>
                <span class="tag">Flow</span>
              </span>
            </router-link>
            <router-link
              to="/guides/flow-calibration"
              class="guide-item"
            >
              <span class="guide-title">Flow Rate Calibration</span>
              <span class="guide-tags">
                <span class="tag">Flow</span>
                <span class="tag">Dimensional</span>
              </span>
            </router-link>
            <router-link
              to="/guides/pressure-advance"
              class="guide-item"
            >
              <span class="guide-title">Pressure Advance / Linear Advance</span>
              <span class="guide-tags">
                <span class="tag">Klipper</span>
                <span class="tag">Marlin</span>
              </span>
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-card">
          <h2>Skip the Learning Curve</h2>
          <p>
            Let our AI analyze your model and generate perfect settings automatically. 
            No manual tuning required.
          </p>
          <q-btn
            label="Generate Profile"
            color="accent"
            unelevated
            size="lg"
            to="/app/generate"
          />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSeo } from '@/composables/useSeo'

const { setPageSeo } = useSeo()

onMounted(() => {
  setPageSeo({
    title: '3D Printing Guides & Tutorials | Printverse',
    description: 'Master 3D printing with comprehensive guides on layer height, retraction, filaments, troubleshooting, and printer calibration. Free tutorials for beginners to advanced.',
    keywords: [
      '3d printing guides',
      '3d printing tutorials',
      'slicer settings guide',
      'fdm printing guide',
      'layer height guide',
      'retraction settings',
      'pla vs petg',
      'fix stringing',
      'printer calibration'
    ],
    canonicalPath: '/guides',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Guides', url: '/guides' }
    ]
  })
})
</script>

<style lang="scss" scoped>
.guides-page {
  background: var(--bg-primary);
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 var(--space-md);
}

// Hero
.guides-hero {
  padding: var(--space-4xl) 0 var(--space-2xl);
  text-align: center;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  
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

// Featured Section
.featured-section {
  padding: var(--space-3xl) 0;
  
  h2 {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    margin-bottom: var(--space-xl);
  }
}

.guides-grid {
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

.guide-card {
  display: block;
  padding: var(--space-xl);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    
    .arrow {
      transform: translateX(4px);
    }
  }
  
  .guide-badge {
    display: inline-block;
    padding: 2px 8px;
    background: #10b981;
    color: white;
    font-size: var(--text-xs);
    font-weight: 500;
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-md);
    
    &.intermediate { background: #f59e0b; }
    &.advanced { background: #ef4444; }
  }
  
  .guide-icon {
    font-size: 2.5rem;
    margin-bottom: var(--space-md);
  }
  
  h3 {
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
  
  .guide-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--text-sm);
    color: var(--text-muted);
    
    .arrow {
      color: var(--color-accent);
      transition: transform 0.2s;
    }
  }
}

// Categories Section
.categories-section {
  padding: var(--space-2xl) 0 var(--space-4xl);
}

.category {
  margin-bottom: var(--space-3xl);
  
  h2 {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    margin-bottom: var(--space-lg);
    padding-bottom: var(--space-sm);
    border-bottom: 2px solid var(--color-accent);
  }
}

.guides-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.guide-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: inherit;
  transition: background 0.2s;
  
  &:hover {
    background: var(--bg-tertiary);
    
    .guide-title {
      color: var(--color-accent);
    }
  }
  
  .guide-title {
    font-weight: 500;
    transition: color 0.2s;
  }
  
  .guide-tags {
    display: flex;
    gap: var(--space-xs);
    
    @media (max-width: 640px) {
      display: none;
    }
    
    .tag {
      padding: 2px 8px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
  }
}

// CTA Section
.cta-section {
  padding: var(--space-4xl) 0;
  background: var(--bg-secondary);
}

.cta-card {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  
  h2 {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    margin-bottom: var(--space-md);
  }
  
  p {
    color: var(--text-secondary);
    margin-bottom: var(--space-xl);
    line-height: 1.7;
  }
}
</style>
