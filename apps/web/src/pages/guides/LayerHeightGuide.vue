<!--
  @component LayerHeightGuide
  @description Comprehensive guide to layer height settings in 3D printing.
  SEO optimized for "layer height", "3d print quality", "resolution" keywords.
-->
<template>
  <q-page class="guide-page">
    <article class="guide-article">
      <!-- Hero -->
      <header class="guide-hero">
        <div class="container">
          <router-link
            to="/guides"
            class="back-link"
          >
            <q-icon name="sym_o_arrow_back" /> Back to Guides
          </router-link>
          <div class="guide-meta">
            <span class="difficulty beginner">Beginner</span>
            <span class="read-time">12 min read</span>
            <span class="updated">Updated Dec 2024</span>
          </div>
          <h1>Layer Height Explained: The Complete Guide</h1>
          <p class="lead">
            Layer height is one of the most important settings in 3D printing. Learn how to 
            choose the right layer height for quality, speed, and strength.
          </p>
        </div>
      </header>

      <!-- Table of Contents -->
      <nav class="toc">
        <div class="container">
          <h2>Table of Contents</h2>
          <ol>
            <li><a href="#what-is-layer-height">What is Layer Height?</a></li>
            <li><a href="#how-it-affects">How Layer Height Affects Your Prints</a></li>
            <li><a href="#choosing">Choosing the Right Layer Height</a></li>
            <li><a href="#common-values">Common Layer Heights Explained</a></li>
            <li><a href="#nozzle-relationship">Layer Height vs Nozzle Size</a></li>
            <li><a href="#variable-layer">Variable Layer Height</a></li>
            <li><a href="#tips">Pro Tips</a></li>
          </ol>
        </div>
      </nav>

      <!-- Content -->
      <div class="guide-content">
        <div class="container">
          <section id="what-is-layer-height">
            <h2>What is Layer Height?</h2>
            <p>
              <strong>Layer height</strong> (also called layer thickness or Z resolution) is 
              the vertical thickness of each layer your 3D printer deposits. It's measured in 
              millimeters (mm) and typically ranges from 0.05mm to 0.4mm for most FDM printers.
            </p>
            <p>
              Think of it like the "resolution" of your print in the vertical direction. Just 
              like pixel density in images, smaller layer heights create smoother surfaces with 
              less visible layer lines, while larger layer heights print faster but show more 
              visible steps.
            </p>
            <div class="info-box">
              <q-icon name="sym_o_lightbulb" />
              <p>
                <strong>Quick Reference:</strong> A 0.2mm layer height is the standard "default" 
                for most prints. Use 0.1mm for detailed work, 0.3mm for fast drafts.
              </p>
            </div>
          </section>

          <section id="how-it-affects">
            <h2>How Layer Height Affects Your Prints</h2>
            
            <h3>Print Quality & Surface Finish</h3>
            <p>
              Smaller layer heights produce smoother surfaces because the "stair-stepping" 
              effect is less visible. This is especially noticeable on curved surfaces and 
              angled features.
            </p>
            <ul>
              <li><strong>0.1mm:</strong> Very smooth, minimal layer lines visible</li>
              <li><strong>0.2mm:</strong> Good balance, slight layer lines on curves</li>
              <li><strong>0.3mm:</strong> Visible layer lines, but faster printing</li>
            </ul>

            <h3>Print Time</h3>
            <p>
              Layer height has a <em>direct</em> impact on print time. Doubling your layer 
              height roughly halves your print time (assuming similar speeds).
            </p>
            <div class="comparison-table">
              <table>
                <thead>
                  <tr>
                    <th>Layer Height</th>
                    <th>Relative Print Time</th>
                    <th>Quality</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>0.1mm</td>
                    <td>2x longer</td>
                    <td>Excellent</td>
                  </tr>
                  <tr>
                    <td>0.2mm</td>
                    <td>Baseline</td>
                    <td>Good</td>
                  </tr>
                  <tr>
                    <td>0.3mm</td>
                    <td>33% faster</td>
                    <td>Acceptable</td>
                  </tr>
                  <tr>
                    <td>0.4mm</td>
                    <td>50% faster</td>
                    <td>Draft</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Strength & Layer Adhesion</h3>
            <p>
              Interestingly, <strong>thicker layers can be stronger</strong> in certain 
              orientations. With fewer layer interfaces, there are fewer potential weak points. 
              However, this depends heavily on your print orientation and the type of stress.
            </p>
          </section>

          <section id="choosing">
            <h2>Choosing the Right Layer Height</h2>
            <p>The best layer height depends on your priorities:</p>
            
            <div class="use-case-grid">
              <div class="use-case">
                <h4>Miniatures & Detailed Models</h4>
                <div class="recommended">
                  0.08mm - 0.12mm
                </div>
                <p>Maximum detail for tabletop gaming figures, jewelry, or intricate designs.</p>
              </div>
              <div class="use-case">
                <h4>General Purpose Prints</h4>
                <div class="recommended">
                  0.16mm - 0.20mm
                </div>
                <p>Good balance for most everyday prints, decorations, and household items.</p>
              </div>
              <div class="use-case">
                <h4>Functional Parts</h4>
                <div class="recommended">
                  0.20mm - 0.28mm
                </div>
                <p>Strength and speed for mechanical parts, brackets, and enclosures.</p>
              </div>
              <div class="use-case">
                <h4>Prototypes & Drafts</h4>
                <div class="recommended">
                  0.28mm - 0.40mm
                </div>
                <p>Fast iteration for fit testing and concept validation.</p>
              </div>
            </div>
          </section>

          <section id="common-values">
            <h2>Common Layer Heights Explained</h2>
            
            <h3>0.1mm (100 microns)</h3>
            <p>
              Often called "high quality" or "fine" mode. Excellent for miniatures, display 
              pieces, and anything where surface finish matters. Expect 2-3x longer print times.
            </p>

            <h3>0.2mm (200 microns)</h3>
            <p>
              The <strong>industry standard</strong> default. Works well for almost everything 
              and is the baseline most profiles are optimized for. Start here if you're unsure.
            </p>

            <h3>0.28mm (280 microns)</h3>
            <p>
              A good "fast" setting that's noticeably quicker than 0.2mm while still looking 
              decent. Popular for functional parts and large prints.
            </p>

            <h3>0.32mm (320 microns)</h3>
            <p>
              Maximum recommended for most 0.4mm nozzles. Very fast but with visible layers. 
              Best for draft prints or parts that will be post-processed.
            </p>
          </section>

          <section id="nozzle-relationship">
            <h2>Layer Height vs Nozzle Size</h2>
            <p>
              Your nozzle diameter limits the range of usable layer heights. The general rule:
            </p>
            <div class="formula-box">
              <p><strong>Min Layer Height:</strong> 25% of nozzle diameter</p>
              <p><strong>Max Layer Height:</strong> 75-80% of nozzle diameter</p>
            </div>
            <p>For a standard 0.4mm nozzle:</p>
            <ul>
              <li><strong>Minimum:</strong> 0.1mm (0.4 × 0.25)</li>
              <li><strong>Maximum:</strong> 0.32mm (0.4 × 0.8)</li>
              <li><strong>Sweet spot:</strong> 0.12mm - 0.28mm</li>
            </ul>
            <div class="warning-box">
              <q-icon name="sym_o_warning" />
              <p>
                Going below 25% may cause poor layer adhesion. Going above 80% can cause 
                rounded layers and poor overhangs.
              </p>
            </div>
          </section>

          <section id="variable-layer">
            <h2>Variable Layer Height</h2>
            <p>
              Modern slicers like <strong>PrusaSlicer</strong> and <strong>OrcaSlicer</strong> 
              support variable layer height—automatically or manually adjusting layer height 
              throughout the print.
            </p>
            <h3>How It Works</h3>
            <ul>
              <li>Use thin layers on curved/angled surfaces for smooth finish</li>
              <li>Use thick layers on flat/vertical sections for speed</li>
              <li>Can reduce print time by 20-40% with similar visual quality</li>
            </ul>
            <h3>Enabling Variable Layer Height</h3>
            <p>
              In PrusaSlicer/OrcaSlicer: Right-click on the model → "Variable layer height" 
              or use the adaptive layers feature in print settings.
            </p>
          </section>

          <section id="tips">
            <h2>Pro Tips</h2>
            <ul class="tips-list">
              <li>
                <strong>Use "magic numbers":</strong> Layer heights that are multiples of your 
                Z-axis step distance (usually 0.04mm) can improve quality. Common magic numbers 
                for 0.04mm steps: 0.12, 0.16, 0.20, 0.24, 0.28, 0.32mm.
              </li>
              <li>
                <strong>First layer matters most:</strong> Your first layer height is often 
                different (typically 0.2-0.3mm) regardless of other layers for better adhesion.
              </li>
              <li>
                <strong>Consider post-processing:</strong> If you're going to sand and paint, 
                you can use thicker layers and save time.
              </li>
              <li>
                <strong>Test your limits:</strong> Every printer is different. Print a 
                calibration cube at various layer heights to see what works best for yours.
              </li>
            </ul>
          </section>

          <!-- CTA -->
          <section class="guide-cta">
            <h2>Let AI Choose Your Layer Height</h2>
            <p>
              SynthStack analyzes your model geometry and automatically selects the optimal 
              layer height based on detail requirements and print time goals.
            </p>
            <q-btn
              label="Generate Optimized Profile"
              color="accent"
              unelevated
              size="lg"
              to="/app/generate"
            />
          </section>
        </div>
      </div>
    </article>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSeo } from '@/composables/useSeo'

const { setPageSeo, setHowToSeo, addSchema } = useSeo()

onMounted(() => {
  setPageSeo({
    title: 'Layer Height Guide - Choose the Right Resolution | SynthStack',
    description: 'Complete guide to layer height in 3D printing. Learn how to choose between 0.1mm, 0.2mm, 0.3mm and when to use each for quality, speed, or strength.',
    keywords: [
      'layer height',
      '3d print layer height',
      'layer height settings',
      '0.2mm layer height',
      '0.1mm layer height',
      'print quality settings',
      'fdm resolution',
      'layer thickness',
      '3d print resolution',
      'best layer height'
    ],
    canonicalPath: '/guides/layer-height-explained',
    ogImage: '/images/og/layer-height-guide.jpg',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Guides', url: '/guides' },
      { name: 'Layer Height', url: '/guides/layer-height-explained' }
    ]
  })

  setHowToSeo({
    name: 'How to Choose the Right Layer Height for 3D Printing',
    description: 'Learn to select optimal layer height for your 3D prints',
    totalTime: 'PT12M',
    steps: [
      { name: 'Understand layer height basics', text: 'Layer height is the thickness of each printed layer, typically 0.1-0.4mm' },
      { name: 'Consider your priorities', text: 'Decide if quality, speed, or strength is most important' },
      { name: 'Match to your use case', text: 'Use 0.1mm for detail, 0.2mm for general, 0.3mm+ for drafts' },
      { name: 'Check nozzle compatibility', text: 'Stay within 25-80% of your nozzle diameter' },
      { name: 'Test and iterate', text: 'Print test pieces to find optimal settings for your printer' }
    ]
  })

  addSchema({
    '@type': 'Article',
    headline: 'Layer Height Explained: The Complete Guide',
    description: 'Comprehensive guide to choosing layer height for 3D printing',
    author: { '@type': 'Organization', name: 'SynthStack' },
    datePublished: '2024-12-01',
    dateModified: '2024-12-05'
  })
})
</script>

<style lang="scss" scoped>
.guide-page {
  background: var(--bg-primary);
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 var(--space-md);
}

// Hero
.guide-hero {
  padding: var(--space-3xl) 0;
  background: var(--bg-secondary);
  
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    color: var(--text-secondary);
    text-decoration: none;
    margin-bottom: var(--space-lg);
    
    &:hover { color: var(--color-accent); }
  }
  
  .guide-meta {
    display: flex;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
    font-size: var(--text-sm);
    
    .difficulty {
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-weight: 500;
      &.beginner { background: #10b981; color: white; }
    }
    
    .read-time, .updated { color: var(--text-muted); }
  }
  
  h1 {
    font-family: var(--font-display);
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    margin-bottom: var(--space-md);
  }
  
  .lead {
    font-size: var(--text-lg);
    color: var(--text-secondary);
    line-height: 1.7;
  }
}

// TOC
.toc {
  padding: var(--space-xl) 0;
  background: var(--bg-tertiary);
  
  h2 {
    font-family: var(--font-display);
    font-size: var(--text-base);
    margin-bottom: var(--space-md);
  }
  
  ol {
    columns: 2;
    column-gap: var(--space-xl);
    padding-left: var(--space-lg);
    
    @media (max-width: 640px) { columns: 1; }
    
    li {
      margin-bottom: var(--space-xs);
      
      a {
        color: var(--text-secondary);
        text-decoration: none;
        &:hover { color: var(--color-accent); }
      }
    }
  }
}

// Content
.guide-content {
  padding: var(--space-3xl) 0;
  
  section {
    margin-bottom: var(--space-3xl);
  }
  
  h2 {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    margin-bottom: var(--space-lg);
    padding-top: var(--space-md);
    border-top: 2px solid var(--border-subtle);
  }
  
  h3 {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    margin: var(--space-xl) 0 var(--space-md);
  }
  
  h4 {
    font-family: var(--font-display);
    font-size: var(--text-base);
    margin-bottom: var(--space-sm);
  }
  
  p {
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: var(--space-md);
  }
  
  ul, ol {
    margin: var(--space-md) 0;
    padding-left: var(--space-xl);
    
    li {
      color: var(--text-secondary);
      line-height: 1.8;
      margin-bottom: var(--space-sm);
      
      strong { color: var(--text-primary); }
    }
  }
  
  strong { color: var(--text-primary); }
  em { font-style: italic; }
}

// Info boxes
.info-box, .warning-box, .formula-box {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  margin: var(--space-lg) 0;
  
  .q-icon { flex-shrink: 0; margin-top: 2px; }
  p { margin: 0; }
}

.info-box {
  background: rgba(78, 205, 196, 0.1);
  border-left: 4px solid #4ECDC4;
  .q-icon { color: #4ECDC4; }
}

.warning-box {
  background: rgba(255, 107, 53, 0.1);
  border-left: 4px solid var(--color-accent);
  .q-icon { color: var(--color-accent); }
}

.formula-box {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  flex-direction: column;
  gap: var(--space-sm);
  
  p { font-family: var(--font-mono); font-size: var(--text-sm); }
}

// Tables
.comparison-table {
  overflow-x: auto;
  margin: var(--space-lg) 0;
  
  table {
    width: 100%;
    border-collapse: collapse;
    
    th, td {
      padding: var(--space-sm) var(--space-md);
      text-align: left;
      border: 1px solid var(--border-subtle);
    }
    
    th {
      background: var(--bg-secondary);
      font-weight: 500;
    }
    
    td { color: var(--text-secondary); }
  }
}

// Use case grid
.use-case-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
  margin: var(--space-lg) 0;
  
  @media (max-width: 640px) { grid-template-columns: 1fr; }
}

.use-case {
  padding: var(--space-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  
  h4 { margin-bottom: var(--space-xs); }
  
  .recommended {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--color-accent);
    margin-bottom: var(--space-sm);
  }
  
  p {
    font-size: var(--text-sm);
    margin: 0;
  }
}

// Tips list
.tips-list {
  li {
    padding: var(--space-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-sm);
    list-style: none;
  }
}

// CTA
.guide-cta {
  text-align: center;
  padding: var(--space-2xl);
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  border-radius: var(--radius-xl);
  
  h2 {
    border: none;
    padding: 0;
    margin-bottom: var(--space-sm);
  }
  
  p {
    margin-bottom: var(--space-lg);
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }
}
</style>





