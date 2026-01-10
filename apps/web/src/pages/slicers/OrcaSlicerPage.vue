<!--
  @component OrcaSlicerPage
  @description Dedicated SEO landing page for OrcaSlicer users.
  Similar structure to CuraPage and PrusaSlicerPage.
-->
<template>
  <q-page class="slicer-page">
    <section class="slicer-hero">
      <div class="container">
        <div class="hero-badge orca">
          <q-icon
            name="sym_o_apps"
            size="16px"
          />
          OrcaSlicer
        </div>
        <h1 class="hero-title">
          AI-Generated <span class="text-orca">OrcaSlicer Settings</span>
        </h1>
        <p class="hero-subtitle">
          Generate optimized OrcaSlicer profiles for Bambu Lab, Voron, and any Klipper printer.
          Advanced features and calibration settings included.
        </p>
        <div class="hero-cta">
          <q-btn
            label="Generate OrcaSlicer Profile"
            unelevated
            size="lg"
            to="/app/generate"
            class="cta-btn orca"
          />
          <q-btn
            label="Browse Profiles"
            outline
            size="lg"
            to="/profiles?slicer=orcaslicer"
          />
        </div>
      </div>
    </section>

    <section class="features-section">
      <div class="container">
        <h2 class="section-title">
          Why OrcaSlicer with Printverse?
        </h2>
        <div class="features-grid">
          <div class="feature-card">
            <q-icon
              name="sym_o_auto_awesome"
              size="32px"
              color="cyan"
            />
            <h3>Calibration Presets</h3>
            <p>Includes calibration patterns for flow, pressure advance, retraction, and more.</p>
          </div>
          <div class="feature-card">
            <q-icon
              name="sym_o_speed"
              size="32px"
              color="cyan"
            />
            <h3>Klipper Optimized</h3>
            <p>Full support for Input Shaper, Pressure Advance, and acceleration limits.</p>
          </div>
          <div class="feature-card">
            <q-icon
              name="sym_o_palette"
              size="32px"
              color="cyan"
            />
            <h3>Multi-Color Support</h3>
            <p>AMS settings for Bambu Lab printers with optimized filament changes.</p>
          </div>
          <div class="feature-card">
            <q-icon
              name="sym_o_download"
              size="32px"
              color="cyan"
            />
            <h3>3MF Export</h3>
            <p>Download project files with all settings embedded for easy import.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="seo-content">
      <div class="container">
        <h2>OrcaSlicer: The Advanced Slicer for Modern Printers</h2>
        <p>
          <strong>OrcaSlicer</strong> is a powerful fork of Bambu Studio and PrusaSlicer 
          that adds advanced features like built-in calibration tools, improved multi-color 
          support, and Klipper optimizations. It's become the go-to slicer for users of 
          <strong>Bambu Lab</strong>, <strong>Voron</strong>, and other high-speed printers.
        </p>
        <p>
          Key features include <strong>flow calibration</strong>, <strong>pressure advance 
            tuning</strong>, <strong>max volumetric speed</strong> calculations, and support 
          for <strong>Input Shaper</strong>. Printverse generates profiles that leverage 
          all these features automatically.
        </p>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <div class="cta-card orca">
          <h2>Ready for Perfect OrcaSlicer Profiles?</h2>
          <p>Upload your STL and get optimized settings in seconds.</p>
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
    title: 'OrcaSlicer Settings Generator - AI Profile Creator | Printverse',
    description: 'Generate optimized OrcaSlicer settings with AI. Perfect profiles for Bambu Lab, Voron, and Klipper printers with calibration presets included.',
    keywords: [
      'orcaslicer settings',
      'orcaslicer profile',
      'orcaslicer calibration',
      'bambu lab slicer',
      'voron slicer settings',
      'klipper slicer settings',
      'orcaslicer pressure advance',
      'orcaslicer flow calibration'
    ],
    canonicalPath: '/slicers/orcaslicer',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Slicers', url: '/guides' },
      { name: 'OrcaSlicer', url: '/slicers/orcaslicer' }
    ]
  })
})
</script>

<style lang="scss" scoped>
.slicer-page { background: var(--bg-primary); }
.container { max-width: 1200px; margin: 0 auto; padding: 0 var(--space-md); }
.text-orca { color: #00B4D8; }
.section-title { font-family: var(--font-display); font-size: var(--text-2xl); text-align: center; margin-bottom: var(--space-2xl); }

.slicer-hero {
  padding: var(--space-4xl) 0; text-align: center;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  .hero-badge { display: inline-flex; align-items: center; gap: var(--space-xs); padding: var(--space-xs) var(--space-md); border-radius: var(--radius-full); font-size: var(--text-sm); font-weight: 500; margin-bottom: var(--space-lg); &.orca { background: rgba(0, 180, 216, 0.15); color: #00B4D8; } }
  .hero-title { font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3.5rem); margin-bottom: var(--space-md); }
  .hero-subtitle { color: var(--text-secondary); max-width: 600px; margin: 0 auto var(--space-xl); line-height: 1.7; }
  .hero-cta { display: flex; gap: var(--space-md); justify-content: center; .cta-btn.orca { background: #00B4D8; } }
}

.features-section { padding: var(--space-4xl) 0; }
.features-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-lg); @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); } @media (max-width: 640px) { grid-template-columns: 1fr; } }
.feature-card { padding: var(--space-xl); background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); text-align: center; h3 { font-family: var(--font-display); margin: var(--space-md) 0 var(--space-sm); } p { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.6; } }

.seo-content { padding: var(--space-4xl) 0; background: var(--bg-secondary); .container { max-width: 800px; } h2 { font-family: var(--font-display); font-size: var(--text-2xl); margin-bottom: var(--space-lg); } p { color: var(--text-secondary); line-height: 1.8; margin-bottom: var(--space-md); strong { color: var(--text-primary); } } }

.cta-section { padding: var(--space-4xl) 0; .cta-card { max-width: 600px; margin: 0 auto; padding: var(--space-2xl); border-radius: var(--radius-xl); text-align: center; &.orca { background: linear-gradient(135deg, rgba(0, 180, 216, 0.1) 0%, var(--bg-tertiary) 100%); border: 1px solid rgba(0, 180, 216, 0.2); } h2 { font-family: var(--font-display); font-size: var(--text-2xl); margin-bottom: var(--space-sm); } p { color: var(--text-secondary); margin-bottom: var(--space-lg); } } }
</style>





