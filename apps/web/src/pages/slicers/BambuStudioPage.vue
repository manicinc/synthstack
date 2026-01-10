<!--
  @component BambuStudioPage
  @description Dedicated SEO landing page for Bambu Studio users.
-->
<template>
  <q-page class="slicer-page">
    <section class="slicer-hero">
      <div class="container">
        <div class="hero-badge bambu">
          <q-icon
            name="sym_o_apps"
            size="16px"
          />
          Bambu Studio
        </div>
        <h1 class="hero-title">
          AI-Generated <span class="text-bambu">Bambu Studio Settings</span>
        </h1>
        <p class="hero-subtitle">
          Generate optimized profiles for Bambu Lab X1 Carbon, P1P, P1S, and A1 printers.
          Perfect AMS settings and print profiles.
        </p>
        <div class="hero-cta">
          <q-btn
            label="Generate Bambu Profile"
            unelevated
            size="lg"
            to="/app/generate"
            class="cta-btn bambu"
          />
          <q-btn
            label="Browse Profiles"
            outline
            size="lg"
            to="/profiles?slicer=bambu-studio"
          />
        </div>
      </div>
    </section>

    <section class="features-section">
      <div class="container">
        <h2 class="section-title">
          Optimized for Bambu Lab Ecosystem
        </h2>
        <div class="features-grid">
          <div class="feature-card">
            <q-icon
              name="sym_o_palette"
              size="32px"
              color="green"
            />
            <h3>AMS Support</h3>
            <p>Optimized filament change settings and purge tower configurations.</p>
          </div>
          <div class="feature-card">
            <q-icon
              name="sym_o_speed"
              size="32px"
              color="green"
            />
            <h3>High-Speed Profiles</h3>
            <p>Leverage Bambu Lab's high-speed capabilities with tuned acceleration.</p>
          </div>
          <div class="feature-card">
            <q-icon
              name="sym_o_sensors"
              size="32px"
              color="green"
            />
            <h3>Lidar Calibration</h3>
            <p>Settings that work perfectly with Bambu's automatic calibration.</p>
          </div>
          <div class="feature-card">
            <q-icon
              name="sym_o_cloud"
              size="32px"
              color="green"
            />
            <h3>Cloud Print Ready</h3>
            <p>Export profiles compatible with Bambu Handy and cloud printing.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="printers-section">
      <div class="container">
        <h2 class="section-title">
          Supported Bambu Lab Printers
        </h2>
        <div class="printers-grid">
          <div class="printer-card">
            <h3>X1 Carbon</h3>
            <p>CoreXY | 256x256x256mm</p>
            <span class="badge">Flagship</span>
          </div>
          <div class="printer-card">
            <h3>P1S</h3>
            <p>CoreXY | 256x256x256mm</p>
            <span class="badge">Enclosed</span>
          </div>
          <div class="printer-card">
            <h3>P1P</h3>
            <p>CoreXY | 256x256x256mm</p>
            <span class="badge">Open Frame</span>
          </div>
          <div class="printer-card">
            <h3>A1 / A1 mini</h3>
            <p>Bed Slinger | 256x256x256mm</p>
            <span class="badge">Entry Level</span>
          </div>
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <div class="cta-card bambu">
          <h2>Perfect Prints on Your Bambu Lab</h2>
          <p>Upload your model and get optimized settings instantly.</p>
          <q-btn
            label="Generate Free Profile"
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
    title: 'Bambu Studio Settings Generator - AI Profile Creator | Printverse',
    description: 'Generate optimized Bambu Studio settings for X1 Carbon, P1P, P1S, and A1 printers. Perfect AMS multi-color profiles with AI.',
    keywords: [
      'bambu studio settings',
      'bambu lab settings',
      'x1 carbon settings',
      'p1p settings',
      'p1s settings',
      'bambu lab profile',
      'ams settings',
      'bambu studio profile'
    ],
    canonicalPath: '/slicers/bambu-studio',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Slicers', url: '/guides' },
      { name: 'Bambu Studio', url: '/slicers/bambu-studio' }
    ]
  })
})
</script>

<style lang="scss" scoped>
.slicer-page { background: var(--bg-primary); }
.container { max-width: 1200px; margin: 0 auto; padding: 0 var(--space-md); }
.text-bambu { color: #00A651; }
.section-title { font-family: var(--font-display); font-size: var(--text-2xl); text-align: center; margin-bottom: var(--space-2xl); }

.slicer-hero {
  padding: var(--space-4xl) 0; text-align: center;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  .hero-badge { display: inline-flex; align-items: center; gap: var(--space-xs); padding: var(--space-xs) var(--space-md); border-radius: var(--radius-full); font-size: var(--text-sm); font-weight: 500; margin-bottom: var(--space-lg); &.bambu { background: rgba(0, 166, 81, 0.15); color: #00A651; } }
  .hero-title { font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3.5rem); margin-bottom: var(--space-md); }
  .hero-subtitle { color: var(--text-secondary); max-width: 600px; margin: 0 auto var(--space-xl); line-height: 1.7; }
  .hero-cta { display: flex; gap: var(--space-md); justify-content: center; .cta-btn.bambu { background: #00A651; } }
}

.features-section { padding: var(--space-4xl) 0; }
.features-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-lg); @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); } @media (max-width: 640px) { grid-template-columns: 1fr; } }
.feature-card { padding: var(--space-xl); background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); text-align: center; h3 { font-family: var(--font-display); margin: var(--space-md) 0 var(--space-sm); } p { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.6; } }

.printers-section { padding: var(--space-4xl) 0; background: var(--bg-secondary); }
.printers-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-lg); @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); } }
.printer-card { padding: var(--space-xl); background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); text-align: center; h3 { font-family: var(--font-display); margin-bottom: var(--space-xs); } p { color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-sm); } .badge { padding: 2px 8px; background: rgba(0, 166, 81, 0.15); color: #00A651; border-radius: var(--radius-sm); font-size: var(--text-xs); } }

.cta-section { padding: var(--space-4xl) 0; .cta-card { max-width: 600px; margin: 0 auto; padding: var(--space-2xl); border-radius: var(--radius-xl); text-align: center; &.bambu { background: linear-gradient(135deg, rgba(0, 166, 81, 0.1) 0%, var(--bg-tertiary) 100%); border: 1px solid rgba(0, 166, 81, 0.2); } h2 { font-family: var(--font-display); font-size: var(--text-2xl); margin-bottom: var(--space-sm); } p { color: var(--text-secondary); margin-bottom: var(--space-lg); } } }
</style>





