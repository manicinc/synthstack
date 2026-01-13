<!--
  @component PLAvsABSvsPETG
  @description Comprehensive filament comparison guide - high SEO value.
-->
<template>
  <q-page class="guide-page">
    <article class="guide-article">
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
            <span class="read-time">18 min read</span>
          </div>
          <h1>PLA vs PETG vs ABS: Complete Comparison 2024</h1>
          <p class="lead">
            Choosing the right filament? Compare PLA, PETG, and ABS for strength, 
            temperature resistance, ease of printing, and best use cases.
          </p>
        </div>
      </header>

      <div class="guide-content">
        <div class="container">
          <!-- Quick Comparison -->
          <section id="quick-comparison">
            <h2>Quick Comparison Table</h2>
            <div class="comparison-table-wrapper">
              <table class="comparison-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th class="pla">
                      PLA
                    </th>
                    <th class="petg">
                      PETG
                    </th>
                    <th class="abs">
                      ABS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Ease of Printing</td>
                    <td class="pla">
                      ⭐⭐⭐⭐⭐ Easy
                    </td>
                    <td class="petg">
                      ⭐⭐⭐⭐ Moderate
                    </td>
                    <td class="abs">
                      ⭐⭐ Difficult
                    </td>
                  </tr>
                  <tr>
                    <td>Strength</td>
                    <td class="pla">
                      ⭐⭐⭐ Moderate
                    </td>
                    <td class="petg">
                      ⭐⭐⭐⭐ High
                    </td>
                    <td class="abs">
                      ⭐⭐⭐⭐ High
                    </td>
                  </tr>
                  <tr>
                    <td>Flexibility</td>
                    <td class="pla">
                      ⭐⭐ Brittle
                    </td>
                    <td class="petg">
                      ⭐⭐⭐⭐ Good
                    </td>
                    <td class="abs">
                      ⭐⭐⭐ Moderate
                    </td>
                  </tr>
                  <tr>
                    <td>Heat Resistance</td>
                    <td class="pla">
                      ⭐⭐ ~60°C
                    </td>
                    <td class="petg">
                      ⭐⭐⭐ ~75°C
                    </td>
                    <td class="abs">
                      ⭐⭐⭐⭐⭐ ~100°C
                    </td>
                  </tr>
                  <tr>
                    <td>Nozzle Temp</td>
                    <td class="pla">
                      190-210°C
                    </td>
                    <td class="petg">
                      230-250°C
                    </td>
                    <td class="abs">
                      230-260°C
                    </td>
                  </tr>
                  <tr>
                    <td>Bed Temp</td>
                    <td class="pla">
                      50-60°C
                    </td>
                    <td class="petg">
                      70-80°C
                    </td>
                    <td class="abs">
                      90-110°C
                    </td>
                  </tr>
                  <tr>
                    <td>Enclosure Needed</td>
                    <td class="pla">
                      No
                    </td>
                    <td class="petg">
                      Optional
                    </td>
                    <td class="abs">
                      Yes
                    </td>
                  </tr>
                  <tr>
                    <td>Warping</td>
                    <td class="pla">
                      Low
                    </td>
                    <td class="petg">
                      Low-Medium
                    </td>
                    <td class="abs">
                      High
                    </td>
                  </tr>
                  <tr>
                    <td>Stringing</td>
                    <td class="pla">
                      Low
                    </td>
                    <td class="petg">
                      High
                    </td>
                    <td class="abs">
                      Medium
                    </td>
                  </tr>
                  <tr>
                    <td>Cost (per kg)</td>
                    <td class="pla">
                      $15-25
                    </td>
                    <td class="petg">
                      $18-30
                    </td>
                    <td class="abs">
                      $15-25
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- PLA Section -->
          <section id="pla">
            <h2>PLA (Polylactic Acid)</h2>
            <div class="filament-badge pla">
              Most Popular
            </div>
            
            <h3>What is PLA?</h3>
            <p>
              PLA is a biodegradable thermoplastic made from renewable resources like corn 
              starch or sugarcane. It's the most popular 3D printing filament due to its 
              ease of use and low cost.
            </p>

            <h3>Pros</h3>
            <ul class="pros-list">
              <li>Easiest filament to print - great for beginners</li>
              <li>No heated bed required (but recommended)</li>
              <li>Low warping and excellent bed adhesion</li>
              <li>Wide variety of colors and specialty variants</li>
              <li>Biodegradable and low odor</li>
              <li>Excellent surface finish and detail</li>
            </ul>

            <h3>Cons</h3>
            <ul class="cons-list">
              <li>Low heat resistance (~60°C glass transition)</li>
              <li>Brittle - can snap under stress</li>
              <li>Not suitable for outdoor use (UV degradation)</li>
              <li>Weak layer adhesion compared to PETG/ABS</li>
            </ul>

            <h3>Best For</h3>
            <ul>
              <li>Decorative prints and display models</li>
              <li>Prototyping and concept models</li>
              <li>Miniatures and detailed figures</li>
              <li>Educational and hobby projects</li>
              <li>Low-stress household items</li>
            </ul>

            <div class="settings-box">
              <h4>Recommended Settings</h4>
              <ul>
                <li><strong>Nozzle:</strong> 200-210°C</li>
                <li><strong>Bed:</strong> 55-60°C</li>
                <li><strong>Speed:</strong> 50-80mm/s</li>
                <li><strong>Cooling:</strong> 100% after first layer</li>
                <li><strong>Retraction:</strong> Standard settings work well</li>
              </ul>
            </div>
          </section>

          <!-- PETG Section -->
          <section id="petg">
            <h2>PETG (Polyethylene Terephthalate Glycol)</h2>
            <div class="filament-badge petg">
              Best All-Rounder
            </div>

            <h3>What is PETG?</h3>
            <p>
              PETG is a modified version of PET (used in water bottles) with added glycol 
              for improved printability. It combines ease of printing with better mechanical 
              properties than PLA.
            </p>

            <h3>Pros</h3>
            <ul class="pros-list">
              <li>Excellent layer adhesion and strength</li>
              <li>Good flexibility - bends before breaking</li>
              <li>Higher heat resistance than PLA (~75°C)</li>
              <li>Food-safe options available</li>
              <li>Chemical and moisture resistant</li>
              <li>No enclosure needed</li>
            </ul>

            <h3>Cons</h3>
            <ul class="cons-list">
              <li>Very stringy - requires tuned retraction</li>
              <li>Can stick too well to some surfaces</li>
              <li>Slightly more expensive than PLA</li>
              <li>Hygroscopic - absorbs moisture</li>
              <li>Surface finish not as clean as PLA</li>
            </ul>

            <h3>Best For</h3>
            <ul>
              <li>Functional parts and enclosures</li>
              <li>Mechanical components</li>
              <li>Food containers (food-safe versions)</li>
              <li>Outdoor items (more UV resistant than PLA)</li>
              <li>Parts requiring impact resistance</li>
            </ul>

            <div class="settings-box">
              <h4>Recommended Settings</h4>
              <ul>
                <li><strong>Nozzle:</strong> 235-245°C</li>
                <li><strong>Bed:</strong> 75-85°C</li>
                <li><strong>Speed:</strong> 40-60mm/s</li>
                <li><strong>Cooling:</strong> 50-80%</li>
                <li><strong>Retraction:</strong> Increase distance, enable coasting</li>
              </ul>
            </div>
            
            <div class="tip-box">
              <q-icon name="sym_o_lightbulb" />
              <p>
                <strong>Pro Tip:</strong> Use a glue stick or hairspray as a release 
                agent. PETG can bond too well to bare glass/PEI and damage the surface.
              </p>
            </div>
          </section>

          <!-- ABS Section -->
          <section id="abs">
            <h2>ABS (Acrylonitrile Butadiene Styrene)</h2>
            <div class="filament-badge abs">
              Industrial Standard
            </div>

            <h3>What is ABS?</h3>
            <p>
              ABS is a petroleum-based thermoplastic used in LEGO bricks, car parts, and 
              many industrial applications. It's the traditional "engineering" filament 
              but requires more skill to print.
            </p>

            <h3>Pros</h3>
            <ul class="pros-list">
              <li>Excellent heat resistance (~100°C)</li>
              <li>Strong and durable</li>
              <li>Can be smoothed with acetone vapor</li>
              <li>Good impact resistance</li>
              <li>Proven industrial material</li>
            </ul>

            <h3>Cons</h3>
            <ul class="cons-list">
              <li>Significant warping - requires enclosure</li>
              <li>Produces toxic fumes - needs ventilation</li>
              <li>High bed temperature required</li>
              <li>Not beginner-friendly</li>
              <li>Layer adhesion can be tricky</li>
            </ul>

            <h3>Best For</h3>
            <ul>
              <li>High-temperature applications</li>
              <li>Automotive parts</li>
              <li>Mechanical housings</li>
              <li>Parts requiring post-processing (sanding, acetone smoothing)</li>
              <li>Professional/industrial prototypes</li>
            </ul>

            <div class="settings-box">
              <h4>Recommended Settings</h4>
              <ul>
                <li><strong>Nozzle:</strong> 240-260°C</li>
                <li><strong>Bed:</strong> 100-110°C</li>
                <li><strong>Speed:</strong> 40-60mm/s</li>
                <li><strong>Cooling:</strong> 0-30% (minimal)</li>
                <li><strong>Enclosure:</strong> Required (45-60°C chamber)</li>
              </ul>
            </div>

            <div class="warning-box">
              <q-icon name="sym_o_warning" />
              <p>
                <strong>Safety Warning:</strong> ABS produces styrene fumes. Always print 
                in a well-ventilated area or use an enclosure with a filter.
              </p>
            </div>
          </section>

          <!-- Decision Guide -->
          <section id="decision">
            <h2>Which Should You Choose?</h2>
            
            <div class="decision-grid">
              <div class="decision-card">
                <h4>Choose PLA if:</h4>
                <ul>
                  <li>You're new to 3D printing</li>
                  <li>Making decorative items</li>
                  <li>Heat resistance isn't needed</li>
                  <li>You want the easiest experience</li>
                </ul>
              </div>
              <div class="decision-card">
                <h4>Choose PETG if:</h4>
                <ul>
                  <li>You need stronger parts than PLA</li>
                  <li>Printing functional items</li>
                  <li>Need some heat resistance</li>
                  <li>Want durability without ABS hassle</li>
                </ul>
              </div>
              <div class="decision-card">
                <h4>Choose ABS if:</h4>
                <ul>
                  <li>You have an enclosed printer</li>
                  <li>Need maximum heat resistance</li>
                  <li>Want to acetone smooth parts</li>
                  <li>Industrial/automotive applications</li>
                </ul>
              </div>
            </div>
          </section>

          <section class="guide-cta">
            <h2>Get Perfect Settings for Any Filament</h2>
            <p>
              Tell SynthStack your filament type and we'll generate optimized settings 
              for your specific printer and model.
            </p>
            <q-btn
              label="Generate Profile"
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

const { setPageSeo, addSchema } = useSeo()

onMounted(() => {
  setPageSeo({
    title: 'PLA vs PETG vs ABS: Complete Filament Comparison 2024 | SynthStack',
    description: 'Compare PLA, PETG, and ABS filaments. Learn about strength, temperature resistance, printing difficulty, and which is best for your project.',
    keywords: [
      'pla vs petg',
      'pla vs abs',
      'petg vs abs',
      'best 3d printing filament',
      'filament comparison',
      'pla filament',
      'petg filament',
      'abs filament',
      'which filament to use',
      '3d printing materials'
    ],
    canonicalPath: '/guides/pla-vs-petg-vs-abs',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Guides', url: '/guides' },
      { name: 'PLA vs PETG vs ABS', url: '/guides/pla-vs-petg-vs-abs' }
    ]
  })

  // Add comparison schema
  addSchema({
    '@type': 'Article',
    headline: 'PLA vs PETG vs ABS: Complete Filament Comparison',
    description: 'Comprehensive comparison of the three most popular 3D printing filaments',
    author: { '@type': 'Organization', name: 'SynthStack' },
    datePublished: '2024-12-01',
    dateModified: '2024-12-05',
    about: [
      { '@type': 'Thing', name: 'PLA Filament' },
      { '@type': 'Thing', name: 'PETG Filament' },
      { '@type': 'Thing', name: 'ABS Filament' }
    ]
  })
})
</script>

<style lang="scss" scoped>
@import './guide-styles.scss';

// Comparison table
.comparison-table-wrapper {
  overflow-x: auto;
  margin: var(--space-lg) 0;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
  
  th, td {
    padding: var(--space-sm) var(--space-md);
    text-align: center;
    border: 1px solid var(--border-subtle);
    
    &:first-child {
      text-align: left;
      font-weight: 500;
    }
  }
  
  th {
    background: var(--bg-secondary);
    font-weight: 600;
    
    &.pla { background: rgba(76, 175, 80, 0.2); }
    &.petg { background: rgba(33, 150, 243, 0.2); }
    &.abs { background: rgba(255, 87, 34, 0.2); }
  }
  
  td {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    
    &.pla { background: rgba(76, 175, 80, 0.05); }
    &.petg { background: rgba(33, 150, 243, 0.05); }
    &.abs { background: rgba(255, 87, 34, 0.05); }
  }
}

// Filament badges
.filament-badge {
  display: inline-block;
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 600;
  margin-bottom: var(--space-lg);
  
  &.pla { background: #4CAF50; color: white; }
  &.petg { background: #2196F3; color: white; }
  &.abs { background: #FF5722; color: white; }
}

// Pro/Con lists
.pros-list, .cons-list {
  li {
    padding: var(--space-sm) var(--space-md);
    margin-bottom: var(--space-xs);
    border-radius: var(--radius-md);
    list-style: none;
  }
}

.pros-list li {
  background: rgba(76, 175, 80, 0.1);
  border-left: 3px solid #4CAF50;
}

.cons-list li {
  background: rgba(244, 67, 54, 0.1);
  border-left: 3px solid #F44336;
}

// Settings box
.settings-box {
  background: var(--bg-secondary);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  margin: var(--space-lg) 0;
  
  h4 {
    margin-bottom: var(--space-md);
    color: var(--color-accent);
  }
  
  ul {
    margin: 0;
    padding-left: var(--space-lg);
  }
}

// Tip box
.tip-box {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: rgba(155, 89, 182, 0.1);
  border-left: 4px solid #9B59B6;
  border-radius: var(--radius-lg);
  margin: var(--space-lg) 0;
  
  .q-icon { color: #9B59B6; flex-shrink: 0; }
  p { margin: 0; }
}

// Decision grid
.decision-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  margin: var(--space-lg) 0;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.decision-card {
  padding: var(--space-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  
  h4 {
    font-family: var(--font-display);
    margin-bottom: var(--space-md);
    color: var(--color-accent);
  }
  
  ul {
    margin: 0;
    padding-left: var(--space-lg);
    
    li {
      font-size: var(--text-sm);
      margin-bottom: var(--space-xs);
    }
  }
}
</style>





