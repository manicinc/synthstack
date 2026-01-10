<!--
  @component RetractionGuide
  @description Comprehensive guide to retraction settings - fixing stringing and oozing.
  High-value SEO target for "stringing fix", "retraction settings" keywords.
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
            <span class="difficulty intermediate">Intermediate</span>
            <span class="read-time">15 min read</span>
          </div>
          <h1>Retraction Settings: Fix Stringing Forever</h1>
          <p class="lead">
            Master retraction to eliminate stringing, oozing, and blobs. This guide covers 
            everything from basic settings to advanced tuning for perfect prints.
          </p>
        </div>
      </header>

      <div class="guide-content">
        <div class="container">
          <section id="what-is-retraction">
            <h2>What is Retraction?</h2>
            <p>
              <strong>Retraction</strong> is when your printer pulls filament back into the 
              hotend during travel moves. This prevents molten plastic from oozing out and 
              creating strings between parts of your print.
            </p>
            <p>
              When the extruder moves from one spot to another without printing (travel moves), 
              the pressure in the nozzle can cause filament to leak out. Retraction counteracts 
              this by creating negative pressure.
            </p>
          </section>

          <section id="key-settings">
            <h2>Key Retraction Settings</h2>
            
            <h3>Retraction Distance</h3>
            <p>
              How far the filament is pulled back, measured in millimeters. This is the most 
              important retraction setting.
            </p>
            <div class="settings-table">
              <table>
                <thead>
                  <tr>
                    <th>Extruder Type</th>
                    <th>Recommended Distance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Direct Drive</td>
                    <td>0.5mm - 2mm</td>
                  </tr>
                  <tr>
                    <td>Bowden (short tube)</td>
                    <td>3mm - 5mm</td>
                  </tr>
                  <tr>
                    <td>Bowden (long tube)</td>
                    <td>5mm - 8mm</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="warning-box">
              <q-icon name="sym_o_warning" />
              <p>
                <strong>Too much retraction</strong> can cause clogs, especially with direct 
                drive. Start low and increase gradually.
              </p>
            </div>

            <h3>Retraction Speed</h3>
            <p>
              How fast the filament is pulled back, measured in mm/s. Faster isn't always better.
            </p>
            <ul>
              <li><strong>Typical range:</strong> 25-50 mm/s</li>
              <li><strong>Direct drive:</strong> 25-35 mm/s (slower to prevent grinding)</li>
              <li><strong>Bowden:</strong> 35-50 mm/s (faster to compensate for tube flex)</li>
            </ul>

            <h3>Minimum Travel Distance</h3>
            <p>
              The minimum distance the nozzle must travel before retraction occurs. Short 
              travels don't need retraction.
            </p>
            <ul>
              <li><strong>Recommended:</strong> 1.5mm - 2mm</li>
              <li>Shorter = more retractions = slower print</li>
              <li>Longer = fewer retractions but more stringing on short moves</li>
            </ul>

            <h3>Z Hop</h3>
            <p>
              Raises the nozzle slightly during travel moves to avoid hitting the print.
            </p>
            <ul>
              <li><strong>When to use:</strong> Prints with many small features or when nozzle catches on parts</li>
              <li><strong>Typical height:</strong> 0.2mm - 0.4mm</li>
              <li><strong>Downside:</strong> Can increase stringing; only use when needed</li>
            </ul>
          </section>

          <section id="diagnosing">
            <h2>Diagnosing Stringing Issues</h2>
            
            <h3>Thin, Hair-like Strings</h3>
            <p>
              Wispy strings between parts, often breaking off easily.
            </p>
            <ul>
              <li><strong>Cause:</strong> Temperature too high or retraction too low</li>
              <li><strong>Fix:</strong> Lower temp by 5-10°C, increase retraction distance</li>
            </ul>

            <h3>Thick, Solid Strings</h3>
            <p>
              Substantial strings that don't break easily.
            </p>
            <ul>
              <li><strong>Cause:</strong> Insufficient retraction distance</li>
              <li><strong>Fix:</strong> Increase retraction distance by 1-2mm</li>
            </ul>

            <h3>Blobs at Travel Start/End</h3>
            <p>
              Small bumps where retractions happen.
            </p>
            <ul>
              <li><strong>Cause:</strong> Too much retraction or pressure buildup</li>
              <li><strong>Fix:</strong> Reduce retraction distance, enable coasting or wipe</li>
            </ul>

            <h3>Under-extrusion After Retraction</h3>
            <p>
              Gaps or weak areas after travel moves.
            </p>
            <ul>
              <li><strong>Cause:</strong> Too much retraction, slow prime speed</li>
              <li><strong>Fix:</strong> Reduce retraction distance, increase extra prime amount</li>
            </ul>
          </section>

          <section id="tuning-process">
            <h2>How to Tune Retraction</h2>
            
            <h3>Step 1: Print a Stringing Test</h3>
            <p>
              Use a stringing test model (two towers with gaps). Many are available on 
              Thingiverse or Printables.
            </p>

            <h3>Step 2: Start with Baseline Settings</h3>
            <div class="code-block">
              <p><strong>Direct Drive:</strong></p>
              <code>Distance: 1mm | Speed: 30mm/s | Min Travel: 1.5mm</code>
              <p><strong>Bowden:</strong></p>
              <code>Distance: 5mm | Speed: 40mm/s | Min Travel: 1.5mm</code>
            </div>

            <h3>Step 3: Adjust Distance First</h3>
            <p>
              If you have stringing, increase distance by 0.5mm (direct drive) or 1mm (Bowden) 
              until stringing reduces. If you get blobs or under-extrusion, decrease.
            </p>

            <h3>Step 4: Fine-tune Speed</h3>
            <p>
              Once distance is dialed in, adjust speed. Faster can help with stringing but 
              may cause grinding. Find the sweet spot.
            </p>

            <h3>Step 5: Lower Temperature</h3>
            <p>
              If retraction alone doesn't fix it, try lowering print temperature by 5-10°C. 
              Cooler plastic is less runny.
            </p>
          </section>

          <section id="advanced">
            <h2>Advanced Settings</h2>

            <h3>Coasting</h3>
            <p>
              Stops extrusion slightly before the end of a line to relieve pressure. Can 
              reduce blobs and stringing.
            </p>
            <ul>
              <li><strong>Typical value:</strong> 0.064mm³ (Cura) or 0.2mm distance</li>
            </ul>

            <h3>Wipe</h3>
            <p>
              Moves the nozzle along the print while retracting to "wipe" excess filament 
              onto the part rather than stringing into the air.
            </p>
            <ul>
              <li><strong>Wipe distance:</strong> 0.5mm - 2mm</li>
            </ul>

            <h3>Pressure Advance / Linear Advance</h3>
            <p>
              Firmware feature (Klipper: Pressure Advance, Marlin: Linear Advance) that 
              preemptively adjusts extrusion based on speed changes. Dramatically reduces 
              the need for retraction.
            </p>
            <ul>
              <li><strong>If available:</strong> Tune PA first, then minimal retraction</li>
              <li><strong>Typical PA values:</strong> 0.02 - 0.08 (direct drive), 0.3 - 0.9 (Bowden)</li>
            </ul>
          </section>

          <section id="filament-specific">
            <h2>Filament-Specific Tips</h2>

            <h3>PLA</h3>
            <p>Easiest to tune. Standard settings usually work well.</p>

            <h3>PETG</h3>
            <p>
              Very stringy by nature. Use higher retraction (add 1-2mm), enable coasting, 
              and print 5-10°C cooler than datasheet max.
            </p>

            <h3>TPU (Flexible)</h3>
            <p>
              Retraction often causes jams with flexible filaments. Use minimal or no 
              retraction (0-1mm max) and print slower.
            </p>

            <h3>ABS/ASA</h3>
            <p>
              Similar to PLA but may need slightly more retraction due to higher temperatures.
            </p>
          </section>

          <section class="guide-cta">
            <h2>Auto-Tune Your Retraction</h2>
            <p>
              Printverse automatically sets retraction based on your extruder type, filament, 
              and print speed. No more guessing.
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

const { setPageSeo, setHowToSeo } = useSeo()

onMounted(() => {
  setPageSeo({
    title: 'Retraction Settings Guide - Fix Stringing Forever | Printverse',
    description: 'Master retraction settings to eliminate stringing and oozing. Learn optimal retraction distance and speed for direct drive and Bowden extruders.',
    keywords: [
      'retraction settings',
      'fix stringing',
      '3d print stringing',
      'retraction distance',
      'retraction speed',
      'oozing fix',
      'direct drive retraction',
      'bowden retraction',
      'stringing test',
      'eliminate stringing'
    ],
    canonicalPath: '/guides/retraction-settings-guide',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Guides', url: '/guides' },
      { name: 'Retraction Settings', url: '/guides/retraction-settings-guide' }
    ]
  })

  setHowToSeo({
    name: 'How to Fix Stringing with Retraction Settings',
    description: 'Tune your retraction settings to eliminate stringing',
    steps: [
      { name: 'Print stringing test', text: 'Use a two-tower stringing test model' },
      { name: 'Set baseline', text: 'Direct drive: 1mm/30mm/s. Bowden: 5mm/40mm/s' },
      { name: 'Adjust distance', text: 'Increase by 0.5-1mm until stringing reduces' },
      { name: 'Fine-tune speed', text: 'Adjust speed between 25-50mm/s' },
      { name: 'Lower temperature', text: 'Reduce by 5-10°C if needed' }
    ]
  })
})
</script>

<style lang="scss" scoped>
@import './guide-styles.scss';

.code-block {
  background: var(--bg-tertiary);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  margin: var(--space-lg) 0;
  
  p { margin-bottom: var(--space-xs); }
  
  code {
    display: block;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-accent);
    margin-bottom: var(--space-md);
    
    &:last-child { margin-bottom: 0; }
  }
}

.settings-table {
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
    
    th { background: var(--bg-secondary); font-weight: 500; }
    td { color: var(--text-secondary); }
  }
}
</style>





