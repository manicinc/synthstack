<!--
  @component PrusaSlicerPage
  @description Dedicated SEO landing page for PrusaSlicer users.
  Targets high-value keywords like "prusaslicer settings", "prusa profile", etc.
  
  SEO Focus: PrusaSlicer settings, Prusa profile generator, best PrusaSlicer settings
-->
<template>
  <q-page class="slicer-page">
    <!-- Hero Section -->
    <section class="slicer-hero">
      <div class="container">
        <div class="hero-badge prusa">
          <q-icon
            name="sym_o_apps"
            size="16px"
          />
          PrusaSlicer
        </div>
        <h1 class="hero-title">
          AI-Generated <span class="text-prusa">PrusaSlicer Settings</span>
        </h1>
        <p class="hero-subtitle">
          Generate optimized PrusaSlicer profiles for Prusa, Voron, and compatible printers.
          Perfect settings for your models in seconds.
        </p>
        <div class="hero-cta">
          <q-btn
            label="Generate PrusaSlicer Profile"
            unelevated
            size="lg"
            to="/app/generate"
            class="cta-btn prusa"
          />
          <q-btn
            label="Browse Community Profiles"
            outline
            size="lg"
            to="/profiles?slicer=prusaslicer"
          />
        </div>
        <div class="hero-stats">
          <div class="stat">
            <span class="value">18K+</span>
            <span class="label">Profiles Generated</span>
          </div>
          <div class="stat">
            <span class="value">2.8.x</span>
            <span class="label">Latest Version Support</span>
          </div>
          <div class="stat">
            <span class="value">97%</span>
            <span class="label">Success Rate</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <div class="container">
        <h2 class="section-title">
          Why Use SynthStack for PrusaSlicer?
        </h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon prusa">
              <q-icon
                name="sym_o_auto_awesome"
                size="32px"
              />
            </div>
            <h3>Advanced Feature Support</h3>
            <p>
              Full support for PrusaSlicer's advanced features including variable layer 
              height, Arachne perimeters, and organic supports.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon prusa">
              <q-icon
                name="sym_o_download"
                size="32px"
              />
            </div>
            <h3>Native 3MF Export</h3>
            <p>
              Download <code>.3mf</code> project files with embedded settings that 
              open directly in PrusaSlicer.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon prusa">
              <q-icon
                name="sym_o_tune"
                size="32px"
              />
            </div>
            <h3>Prusa & Voron Optimized</h3>
            <p>
              Pre-tuned profiles for Prusa MK4, MK3S+, Mini+, XL, and Voron 0.2, 
              Trident, and 2.4 machines.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon prusa">
              <q-icon
                name="sym_o_precision_manufacturing"
                size="32px"
              />
            </div>
            <h3>MMU Support</h3>
            <p>
              Generate profiles for multi-material printing with Prusa MMU2S/3 
              with optimized purge and wipe settings.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Settings Overview -->
    <section class="settings-section">
      <div class="container">
        <h2 class="section-title">
          PrusaSlicer Settings We Optimize
        </h2>
        <div class="settings-grid">
          <div class="setting-category">
            <h3>Print Settings</h3>
            <ul>
              <li><strong>Layer Height:</strong> Including variable layer height</li>
              <li><strong>Perimeters:</strong> Classic or Arachne engine</li>
              <li><strong>Infill:</strong> Pattern, density, and anchor length</li>
              <li><strong>Seam Position:</strong> Optimized for appearance</li>
            </ul>
          </div>
          <div class="setting-category">
            <h3>Filament Settings</h3>
            <ul>
              <li><strong>Temperatures:</strong> Nozzle, bed, and chamber</li>
              <li><strong>Cooling:</strong> Fan speed, bridge fan, min layer time</li>
              <li><strong>Retraction:</strong> Length, speed, wipe</li>
              <li><strong>Pressure Advance:</strong> Automatic tuning values</li>
            </ul>
          </div>
          <div class="setting-category">
            <h3>Speed Settings</h3>
            <ul>
              <li><strong>Perimeter Speed:</strong> External vs internal</li>
              <li><strong>Infill Speed:</strong> Solid vs sparse</li>
              <li><strong>Support Speed:</strong> Interface vs support</li>
              <li><strong>Auto Speed:</strong> Volumetric flow limits</li>
            </ul>
          </div>
          <div class="setting-category">
            <h3>Support & Adhesion</h3>
            <ul>
              <li><strong>Support Style:</strong> Normal, snug, or organic</li>
              <li><strong>Support Interface:</strong> Layers and pattern</li>
              <li><strong>Brim:</strong> Width and ear options</li>
              <li><strong>Raft:</strong> Layers and contact distance</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Printer Support -->
    <section class="printers-section">
      <div class="container">
        <h2 class="section-title">
          Supported Printers
        </h2>
        <div class="printers-grid">
          <div class="printer-group">
            <h3>Prusa Research</h3>
            <ul>
              <li>Prusa MK4 / MK4S</li>
              <li>Prusa MK3S+ / MK3.5</li>
              <li>Prusa MINI+</li>
              <li>Prusa XL (all toolheads)</li>
              <li>Prusa CORE One</li>
            </ul>
          </div>
          <div class="printer-group">
            <h3>Voron</h3>
            <ul>
              <li>Voron 0.2</li>
              <li>Voron Trident</li>
              <li>Voron 2.4</li>
              <li>Voron Switchwire</li>
              <li>Voron Legacy</li>
            </ul>
          </div>
          <div class="printer-group">
            <h3>Other Compatible</h3>
            <ul>
              <li>RatRig V-Core 3</li>
              <li>Annex K3</li>
              <li>VzBot</li>
              <li>Any Klipper printer</li>
              <li>Custom CoreXY/bed slingers</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- SEO Content -->
    <section class="seo-content">
      <div class="container">
        <article class="seo-article">
          <h2>Best PrusaSlicer Settings for 2024</h2>
          <p>
            <strong>PrusaSlicer</strong> is the official slicer from Prusa Research and 
            one of the most feature-rich slicers available. It's the foundation for 
            OrcaSlicer and SuperSlicer, making it familiar to many users.
          </p>
          <p>
            Getting optimal <strong>PrusaSlicer settings</strong> requires understanding 
            the relationship between print quality, speed, and material properties. 
            SynthStack analyzes your specific model to determine the best balance.
          </p>
          <h3>PrusaSlicer vs Cura</h3>
          <p>
            While <strong>Cura</strong> excels in ease of use, <strong>PrusaSlicer</strong> 
            offers more advanced features like Arachne perimeter generator, organic 
            supports, paint-on supports, and variable layer height with automatic 
            detection.
          </p>
          <h3>Key Settings Explained</h3>
          <p>
            <strong>Arachne perimeters</strong> automatically adjust wall widths for 
            thin features, eliminating gaps. <strong>Organic supports</strong> use 
            tree-like structures that are easier to remove and use less material.
          </p>
          <p>
            For <strong>Prusa MK4</strong> users, Input Shaper settings can be 
            automatically configured based on your model's requirements, allowing 
            for higher speeds without ringing artifacts.
          </p>
        </article>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-card prusa">
          <h2>Ready to Optimize Your PrusaSlicer Settings?</h2>
          <p>
            Upload your STL and get a perfect PrusaSlicer profile tailored to your 
            printer and filament combination.
          </p>
          <q-btn
            label="Generate Free PrusaSlicer Profile"
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
/**
 * PrusaSlicer Page
 * 
 * SEO landing page targeting PrusaSlicer users.
 */
import { onMounted } from 'vue'
import { useSeo, PRINTING_KEYWORDS } from '@/composables/useSeo'

const { setPageSeo, addSchema } = useSeo()

onMounted(() => {
  setPageSeo({
    title: 'PrusaSlicer Settings Generator - AI Profile Creator | SynthStack',
    description: 'Generate optimized PrusaSlicer settings with AI. Perfect profiles for Prusa MK4, MK3S+, Mini+, XL, Voron, and compatible printers. Export as 3MF with all settings.',
    keywords: [
      'prusaslicer settings',
      'prusaslicer profile',
      'prusa slicer settings',
      'best prusaslicer settings',
      'prusa mk4 settings',
      'prusa mk3s settings',
      'voron prusaslicer',
      'prusaslicer pla settings',
      'prusaslicer petg settings',
      'prusaslicer support settings',
      'arachne perimeters',
      'organic supports',
      ...PRINTING_KEYWORDS.slicers.filter(k => k.includes('prusa'))
    ],
    canonicalPath: '/slicers/prusaslicer',
    ogImage: '/images/og/prusaslicer.jpg',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Slicers', url: '/guides' },
      { name: 'PrusaSlicer', url: '/slicers/prusaslicer' }
    ]
  })
  
  // Add FAQ schema
  addSchema({
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What are the best PrusaSlicer settings for PLA?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'For PLA in PrusaSlicer: Nozzle temp 210-215°C, bed temp 60°C, print speed 60-80mm/s, layer height 0.2mm. Enable cooling at 100% after first layer. Use 3 perimeters and 15-20% gyroid infill for balanced strength.'
        }
      },
      {
        '@type': 'Question',
        name: 'Should I use Arachne in PrusaSlicer?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, Arachne perimeter generator is recommended for most prints. It automatically varies wall widths to fill thin sections without gaps, improving both quality and strength. Only disable it for simple geometric models.'
        }
      }
    ]
  })
})
</script>

<style lang="scss" scoped>
.slicer-page {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-md);
}

.text-prusa {
  color: #FA6831;
}

// Hero
.slicer-hero {
  padding: var(--space-4xl) 0;
  text-align: center;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  
  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-md);
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    font-weight: 500;
    margin-bottom: var(--space-lg);
    
    &.prusa {
      background: rgba(250, 104, 49, 0.15);
      color: #FA6831;
    }
  }
  
  .hero-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 5vw, 3.5rem);
    margin-bottom: var(--space-md);
  }
  
  .hero-subtitle {
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto var(--space-xl);
    line-height: 1.7;
  }
  
  .hero-cta {
    display: flex;
    gap: var(--space-md);
    justify-content: center;
    margin-bottom: var(--space-2xl);
    
    @media (max-width: 480px) {
      flex-direction: column;
      align-items: center;
    }
    
    .cta-btn.prusa {
      background: #FA6831;
    }
  }
  
  .hero-stats {
    display: flex;
    justify-content: center;
    gap: var(--space-3xl);
    
    .stat {
      text-align: center;
      
      .value {
        display: block;
        font-family: var(--font-display);
        font-size: var(--text-2xl);
        font-weight: 700;
        color: #FA6831;
      }
      
      .label {
        font-size: var(--text-sm);
        color: var(--text-muted);
      }
    }
  }
}

// Section titles
.section-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  text-align: center;
  margin-bottom: var(--space-2xl);
}

// Features
.features-section {
  padding: var(--space-4xl) 0;
}

.features-grid {
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

.feature-card {
  padding: var(--space-xl);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  text-align: center;
  
  .feature-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto var(--space-md);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-lg);
    
    &.prusa {
      background: rgba(250, 104, 49, 0.1);
      color: #FA6831;
    }
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
    
    code {
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
    }
  }
}

// Settings
.settings-section {
  padding: var(--space-4xl) 0;
  background: var(--bg-secondary);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-xl);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.setting-category {
  padding: var(--space-lg);
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  
  h3 {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    margin-bottom: var(--space-md);
    color: #FA6831;
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      padding: var(--space-sm) 0;
      border-bottom: 1px solid var(--border-subtle);
      font-size: var(--text-sm);
      color: var(--text-secondary);
      
      &:last-child {
        border-bottom: none;
      }
      
      strong {
        color: var(--text-primary);
      }
    }
  }
}

// Printers
.printers-section {
  padding: var(--space-4xl) 0;
}

.printers-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xl);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.printer-group {
  padding: var(--space-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  
  h3 {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    margin-bottom: var(--space-md);
    color: #FA6831;
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      padding: var(--space-xs) 0;
      color: var(--text-secondary);
      font-size: var(--text-sm);
    }
  }
}

// SEO Content
.seo-content {
  padding: var(--space-4xl) 0;
  background: var(--bg-secondary);
  
  .seo-article {
    max-width: 800px;
    margin: 0 auto;
    
    h2 {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      margin-bottom: var(--space-lg);
    }
    
    h3 {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      margin: var(--space-xl) 0 var(--space-md);
    }
    
    p {
      color: var(--text-secondary);
      line-height: 1.8;
      margin-bottom: var(--space-md);
      
      strong {
        color: var(--text-primary);
      }
    }
  }
}

// CTA
.cta-section {
  padding: var(--space-4xl) 0;
  
  .cta-card {
    max-width: 600px;
    margin: 0 auto;
    padding: var(--space-2xl);
    border-radius: var(--radius-xl);
    text-align: center;
    
    &.prusa {
      background: linear-gradient(135deg, rgba(250, 104, 49, 0.1) 0%, var(--bg-tertiary) 100%);
      border: 1px solid rgba(250, 104, 49, 0.2);
    }
    
    h2 {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      margin-bottom: var(--space-sm);
    }
    
    p {
      color: var(--text-secondary);
      margin-bottom: var(--space-lg);
    }
  }
}
</style>





