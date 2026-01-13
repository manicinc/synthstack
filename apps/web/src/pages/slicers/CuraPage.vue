<!--
  @component CuraSlicerPage
  @description Dedicated SEO landing page for Cura slicer users.
  Targets high-value keywords like "cura settings", "cura profile", etc.
  
  SEO Focus: Cura settings, Cura profile generator, best Cura settings
-->
<template>
  <q-page class="slicer-page">
    <!-- Hero Section -->
    <section class="slicer-hero">
      <div class="container">
        <div class="hero-badge cura">
          <q-icon
            name="sym_o_apps"
            size="16px"
          />
          Ultimaker Cura
        </div>
        <h1 class="hero-title">
          AI-Generated <span class="text-cura">Cura Settings</span>
        </h1>
        <p class="hero-subtitle">
          Generate optimized Cura slicer profiles in seconds. Our AI analyzes your 
          STL files and creates perfect settings for your printer and filament.
        </p>
        <div class="hero-cta">
          <q-btn
            label="Generate Cura Profile"
            color="primary"
            unelevated
            size="lg"
            to="/app/generate"
            class="cta-btn"
          />
          <q-btn
            label="Browse Community Profiles"
            outline
            size="lg"
            to="/profiles?slicer=cura"
          />
        </div>
        <div class="hero-stats">
          <div class="stat">
            <span class="value">25K+</span>
            <span class="label">Cura Profiles Generated</span>
          </div>
          <div class="stat">
            <span class="value">5.x</span>
            <span class="label">Latest Version Support</span>
          </div>
          <div class="stat">
            <span class="value">98%</span>
            <span class="label">Success Rate</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <div class="container">
        <h2 class="section-title">
          Why Use SynthStack for Cura?
        </h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <q-icon
                name="sym_o_auto_awesome"
                size="32px"
              />
            </div>
            <h3>AI-Optimized Settings</h3>
            <p>
              Our AI analyzes your model's geometry to set optimal layer height, 
              print speed, temperature, and support settings automatically.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <q-icon
                name="sym_o_download"
                size="32px"
              />
            </div>
            <h3>One-Click Export</h3>
            <p>
              Download ready-to-use <code>.curaprofile</code> files that import 
              directly into Ultimaker Cura with all settings configured.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <q-icon
                name="sym_o_tune"
                size="32px"
              />
            </div>
            <h3>Full Parameter Control</h3>
            <p>
              Every Cura setting is covered—from quality and shell to infill, 
              material, speed, travel, cooling, support, and adhesion.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <q-icon
                name="sym_o_precision_manufacturing"
                size="32px"
              />
            </div>
            <h3>200+ Printers Supported</h3>
            <p>
              Pre-configured for Ender 3, Prusa i3, Anycubic, Artillery, Elegoo, 
              and virtually any FDM printer that works with Cura.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Settings Overview -->
    <section class="settings-section">
      <div class="container">
        <h2 class="section-title">
          Cura Settings We Optimize
        </h2>
        <div class="settings-grid">
          <div class="setting-category">
            <h3>Quality Settings</h3>
            <ul>
              <li><strong>Layer Height:</strong> 0.08mm - 0.32mm based on detail needs</li>
              <li><strong>Initial Layer Height:</strong> Optimized for adhesion</li>
              <li><strong>Line Width:</strong> Calibrated to your nozzle size</li>
              <li><strong>Wall Line Count:</strong> Set for strength requirements</li>
            </ul>
          </div>
          <div class="setting-category">
            <h3>Speed Settings</h3>
            <ul>
              <li><strong>Print Speed:</strong> Balanced for quality vs time</li>
              <li><strong>Infill Speed:</strong> Optimized for internal structure</li>
              <li><strong>Wall Speed:</strong> Slower for surface quality</li>
              <li><strong>Travel Speed:</strong> Maximized to reduce oozing</li>
            </ul>
          </div>
          <div class="setting-category">
            <h3>Material Settings</h3>
            <ul>
              <li><strong>Printing Temperature:</strong> Filament-specific</li>
              <li><strong>Build Plate Temperature:</strong> For optimal adhesion</li>
              <li><strong>Flow:</strong> Calibrated to extrusion rate</li>
              <li><strong>Retraction:</strong> Tuned for stringing prevention</li>
            </ul>
          </div>
          <div class="setting-category">
            <h3>Support & Adhesion</h3>
            <ul>
              <li><strong>Support Type:</strong> Normal, tree, or none</li>
              <li><strong>Support Density:</strong> Based on overhang complexity</li>
              <li><strong>Build Plate Adhesion:</strong> Skirt, brim, or raft</li>
              <li><strong>Z Seam:</strong> Positioned for best appearance</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="how-it-works">
      <div class="container">
        <h2 class="section-title">
          How to Get Your Cura Profile
        </h2>
        <div class="steps-grid">
          <div class="step">
            <div class="step-number">
              1
            </div>
            <h3>Upload Your STL</h3>
            <p>Drag and drop your 3D model file. We analyze overhangs, thin walls, and complexity.</p>
          </div>
          <div class="step">
            <div class="step-number">
              2
            </div>
            <h3>Select Printer & Filament</h3>
            <p>Choose your printer (e.g., Ender 3) and filament type (PLA, PETG, etc.).</p>
          </div>
          <div class="step">
            <div class="step-number">
              3
            </div>
            <h3>Generate Profile</h3>
            <p>Our AI creates optimized settings. Review and adjust if needed.</p>
          </div>
          <div class="step">
            <div class="step-number">
              4
            </div>
            <h3>Download & Print</h3>
            <p>Export the .curaprofile file, import into Cura, and start printing!</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Popular Profiles -->
    <section class="popular-profiles">
      <div class="container">
        <h2 class="section-title">
          Popular Cura Profiles
        </h2>
        <div class="profiles-grid">
          <div
            v-for="profile in popularProfiles"
            :key="profile.name"
            class="profile-card"
          >
            <div class="profile-header">
              <h4>{{ profile.name }}</h4>
              <div class="profile-stats">
                <span>
                  <q-icon
                    name="sym_o_download"
                    size="14px"
                  />
                  {{ profile.downloads }}
                </span>
                <span>
                  <q-icon
                    name="sym_o_star"
                    size="14px"
                  />
                  {{ profile.rating }}
                </span>
              </div>
            </div>
            <p>{{ profile.description }}</p>
            <div class="profile-tags">
              <span
                v-for="tag in profile.tags"
                :key="tag"
                class="tag"
              >{{ tag }}</span>
            </div>
          </div>
        </div>
        <div class="view-all">
          <q-btn
            label="View All Cura Profiles"
            outline
            to="/profiles?slicer=cura"
          />
        </div>
      </div>
    </section>

    <!-- SEO Content -->
    <section class="seo-content">
      <div class="container">
        <article class="seo-article">
          <h2>Best Cura Settings for 3D Printing in 2024</h2>
          <p>
            <strong>Ultimaker Cura</strong> is one of the most popular slicers for FDM
            3D printing, used by millions of makers worldwide. Getting the right
            <strong>Cura settings</strong> is essential for successful prints, but the
            hundreds of parameters can be overwhelming.
          </p>
          <p>
            SynthStack simplifies this by using AI to generate optimized <strong>Cura
              profiles</strong> based on your specific model, printer, and filament.
            Whether you're printing with <strong>PLA</strong>, <strong>PETG</strong>,
            <strong>ABS</strong>, or <strong>TPU</strong>, our profiles are tuned for
            each material's unique requirements.
          </p>
          <h3>Key Cura Settings Explained</h3>
          <p>
            <strong>Layer height</strong> determines print resolution and time. A
            0.2mm layer height works well for most prints, while 0.1mm provides finer
            detail. <strong>Print speed</strong> typically ranges from 40-60mm/s for
            quality prints, with faster speeds possible on well-tuned machines.
          </p>
          <p>
            <strong>Retraction settings</strong> are crucial for preventing stringing.
            Direct drive extruders typically need 0.5-2mm retraction distance, while
            Bowden setups may need 4-7mm. <strong>Retraction speed</strong> of 25-45mm/s
            works well for most setups.
          </p>
          <p>
            <strong>Infill patterns</strong> like Gyroid and Cubic provide good strength
            with reasonable print times. <strong>Infill density</strong> of 15-20% works
            for decorative items, while functional parts may need 40-60%.
          </p>
          <h3>Compatible Printers</h3>
          <p>
            SynthStack generates Cura profiles for all major printers including
            <strong>Creality Ender 3</strong>, <strong>Ender 3 V2</strong>,
            <strong>Ender 5</strong>, <strong>CR-10</strong>, <strong>Anycubic Kobra</strong>,
            <strong>Artillery Sidewinder</strong>, <strong>Elegoo Neptune</strong>,
            <strong>Prusa i3 MK3S</strong>, and custom/DIY printers.
          </p>
        </article>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-card">
          <h2>Ready to Optimize Your Cura Settings?</h2>
          <p>
            Upload your STL and get a perfect Cura profile in under 30 seconds.
            No more trial and error—just great prints.
          </p>
          <q-btn
            label="Generate Free Cura Profile"
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
 * Cura Slicer Page
 * 
 * SEO landing page targeting Cura users searching for settings and profiles.
 */
import { onMounted } from 'vue'
import { useSeo, PRINTING_KEYWORDS } from '@/composables/useSeo'

const { setPageSeo, addSchema, setSoftwareAppSeo } = useSeo()

// Popular profiles data
const popularProfiles = [
  {
    name: 'Ender 3 PLA Standard',
    description: 'Balanced quality and speed for everyday PLA prints on Ender 3.',
    downloads: '12.5K',
    rating: '4.9',
    tags: ['PLA', 'Ender 3', 'Quality']
  },
  {
    name: 'PETG Functional Parts',
    description: 'Strong, heat-resistant settings for functional PETG prints.',
    downloads: '8.2K',
    rating: '4.8',
    tags: ['PETG', 'Strong', 'Functional']
  },
  {
    name: 'Miniatures Detail',
    description: 'Ultra-fine 0.1mm layer height for miniatures and detailed models.',
    downloads: '6.8K',
    rating: '4.9',
    tags: ['Miniatures', '0.1mm', 'Detail']
  },
  {
    name: 'Speed Draft',
    description: 'Fast draft prints at 100mm/s+ for prototyping and test fits.',
    downloads: '5.4K',
    rating: '4.6',
    tags: ['Fast', 'Draft', 'Prototype']
  }
]

// SEO Setup
onMounted(() => {
  setPageSeo({
    title: 'Cura Settings Generator - AI Cura Profile Creator | SynthStack',
    description: 'Generate optimized Ultimaker Cura slicer settings with AI. Get perfect Cura profiles for PLA, PETG, ABS. Supports Ender 3, Prusa, Anycubic, and 200+ printers.',
    keywords: [
      'cura settings',
      'cura profile',
      'cura slicer settings',
      'best cura settings',
      'cura profile generator',
      'ultimaker cura settings',
      'cura pla settings',
      'cura petg settings',
      'cura ender 3 settings',
      'cura retraction settings',
      'cura print speed',
      'cura layer height',
      'cura infill settings',
      'cura support settings',
      'cura temperature settings',
      'cura 5 settings',
      ...PRINTING_KEYWORDS.slicers.filter(k => k.includes('cura'))
    ],
    canonicalPath: '/slicers/cura',
    ogImage: '/images/og/cura.jpg',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Slicers', url: '/guides' },
      { name: 'Cura', url: '/slicers/cura' }
    ]
  })
  
  // Add Software schema
  setSoftwareAppSeo()
  
  // Add FAQ schema for Cura
  addSchema({
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What are the best Cura settings for PLA?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'For PLA in Cura: Print temperature 190-210°C, bed temperature 50-60°C, print speed 40-60mm/s, layer height 0.2mm, retraction distance 5-7mm (Bowden) or 0.5-2mm (direct drive). Enable cooling fan at 100%.'
        }
      },
      {
        '@type': 'Question',
        name: 'How do I fix stringing in Cura?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'To fix stringing: Increase retraction distance (try 6-7mm for Bowden), increase retraction speed (35-50mm/s), lower printing temperature by 5-10°C, enable combing mode, and increase travel speed.'
        }
      },
      {
        '@type': 'Question',
        name: 'What Cura version does SynthStack support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'SynthStack supports Ultimaker Cura 5.x (latest version) and exports .curaprofile files that are fully compatible with Cura\'s profile import feature.'
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

.text-cura {
  color: #0078D7;
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
    
    &.cura {
      background: rgba(0, 120, 215, 0.15);
      color: #0078D7;
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
    
    .cta-btn {
      background: #0078D7;
    }
  }
  
  .hero-stats {
    display: flex;
    justify-content: center;
    gap: var(--space-3xl);
    
    @media (max-width: 640px) {
      gap: var(--space-xl);
    }
    
    .stat {
      text-align: center;
      
      .value {
        display: block;
        font-family: var(--font-display);
        font-size: var(--text-2xl);
        font-weight: 700;
        color: #0078D7;
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
    background: rgba(0, 120, 215, 0.1);
    border-radius: var(--radius-lg);
    color: #0078D7;
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
    color: #0078D7;
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

// How It Works
.how-it-works {
  padding: var(--space-4xl) 0;
}

.steps-grid {
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

.step {
  text-align: center;
  
  .step-number {
    width: 48px;
    height: 48px;
    margin: 0 auto var(--space-md);
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0078D7;
    color: white;
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 700;
    border-radius: var(--radius-full);
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

// Popular Profiles
.popular-profiles {
  padding: var(--space-4xl) 0;
  background: var(--bg-secondary);
}

.profiles-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.profile-card {
  padding: var(--space-lg);
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  
  .profile-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-sm);
    
    h4 {
      font-family: var(--font-display);
      font-size: var(--text-base);
    }
    
    .profile-stats {
      display: flex;
      gap: var(--space-sm);
      font-size: var(--text-xs);
      color: var(--text-muted);
      
      span {
        display: flex;
        align-items: center;
        gap: 2px;
      }
    }
  }
  
  p {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    line-height: 1.5;
    margin-bottom: var(--space-sm);
  }
  
  .profile-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    
    .tag {
      padding: 2px 8px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
  }
}

.view-all {
  text-align: center;
  margin-top: var(--space-xl);
}

// SEO Content
.seo-content {
  padding: var(--space-4xl) 0;
  
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
  background: var(--bg-secondary);
  
  .cta-card {
    max-width: 600px;
    margin: 0 auto;
    padding: var(--space-2xl);
    background: linear-gradient(135deg, rgba(0, 120, 215, 0.1) 0%, var(--bg-tertiary) 100%);
    border: 1px solid rgba(0, 120, 215, 0.2);
    border-radius: var(--radius-xl);
    text-align: center;
    
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




