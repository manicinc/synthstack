<template>
  <q-page class="faq-page">
    <!-- Hero -->
    <section class="page-hero">
      <div class="hero-content">
        <h1>Frequently Asked Questions</h1>
        <p>Everything you need to know about SynthStack.</p>
      </div>
    </section>

    <!-- Search -->
    <section class="search-section">
      <div class="section-container">
        <q-input
          v-model="searchQuery"
          outlined
          dense
          placeholder="Search questions..."
          class="search-input"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </section>

    <!-- FAQ Categories -->
    <section class="faq-section">
      <div class="section-container">
        <div class="faq-layout">
          <!-- Sidebar -->
          <aside class="faq-sidebar">
            <nav class="faq-nav">
              <a
                v-for="cat in categories"
                :key="cat.id"
                :class="{ active: activeCategory === cat.id }"
                @click="activeCategory = cat.id"
              >
                <q-icon :name="cat.icon" />
                {{ cat.label }}
              </a>
            </nav>
          </aside>

          <!-- Questions -->
          <div class="faq-content">
            <q-expansion-item
              v-for="(faq, index) in filteredFaqs"
              :key="index"
              :label="faq.question"
              header-class="faq-header"
              expand-icon-class="faq-icon"
            >
              <q-card>
                <q-card-section>
                  <div v-html="faq.answer" />
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <div
              v-if="filteredFaqs.length === 0"
              class="no-results"
            >
              <q-icon
                name="search_off"
                size="48px"
              />
              <p>No questions found matching "{{ searchQuery }}"</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact CTA -->
    <section class="contact-section">
      <div class="section-container">
        <div class="contact-content">
          <q-icon
            name="help_outline"
            size="48px"
          />
          <h2>Still have questions?</h2>
          <p>Can't find what you're looking for? Reach out to our team.</p>
          <q-btn
            color="primary"
            label="Contact Support"
            to="/contact"
          />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')
const activeCategory = ref('general')

const categories = [
  { id: 'general', label: 'General', icon: 'info' },
  { id: 'profiles', label: 'Profiles', icon: 'tune' },
  { id: 'printers', label: 'Printers', icon: 'print' },
  { id: 'filaments', label: 'Filaments', icon: 'palette' },
  { id: 'account', label: 'Account', icon: 'person' },
  { id: 'pricing', label: 'Pricing', icon: 'payments' },
  { id: 'lifetime', label: 'Lifetime License', icon: 'vpn_key' }
]

const faqs = ref([
  // General
  {
    category: 'general',
    question: 'What is SynthStack?',
    answer: `<p>SynthStack is an AI-powered platform that generates optimized 3D print settings by analyzing STL geometry, correlating printer/material specifications, and producing slicer-ready profiles.</p>
    <p>Unlike generic slicer presets, SynthStack uses <strong>Retrieval-Augmented Generation (RAG)</strong> to pull from manufacturer documentation, community-validated settings, and research-backed optimal parameters.</p>
    <p class="citation">📚 Our database contains 300+ printers and material profiles validated against real-world print outcomes. <a href="/blog/how-synthstack-ai-works">Learn how our AI works →</a></p>`
  },
  {
    category: 'general',
    question: 'Where can I browse public presets and models?',
    answer: `<p>Visit the <a href="/catalog">Public Catalog</a> to browse community models, ready-to-use generation presets, and our scraped printer/filament data in one place.</p>
    <ul>
      <li>Filter by source (community, preset, scraped) and license</li>
      <li>Search by title, tags, material, or printer</li>
      <li>Jump straight into the generator to use a preset</li>
    </ul>`
  },
  {
    category: 'general',
    question: 'Do I need an account to use SynthStack?',
    answer: `<p>No! Core functionality is <strong>completely free and requires no account</strong>. You can:</p>
    <ul><li>Upload STL/OBJ/3MF files (up to 50MB)</li><li>Generate optimized profiles</li><li>Export to all supported slicers</li></ul>
    <p>An account is only needed to save profiles, sync across devices, or access premium features like unlimited generations and API access.</p>`
  },
  {
    category: 'general',
    question: 'Which slicers are supported?',
    answer: `<p>We export native-format profiles for all major slicers:</p>
    <ul>
      <li><strong>OrcaSlicer</strong> (.json) - Full support including Bambu Lab printers</li>
      <li><strong>PrusaSlicer</strong> (.ini) - Complete profile export</li>
      <li><strong>Cura</strong> (.curaprofile) - Quality and material settings</li>
      <li><strong>Bambu Studio</strong> (.json) - Native Bambu Lab format</li>
      <li><strong>FlashPrint</strong> (.fcfg) - FlashForge printers</li>
    </ul>
    <p class="citation">📚 Each export format is schema-validated using Zod to ensure compatibility. <a href="/guides">See our slicer guides →</a></p>`
  },
  {
    category: 'general',
    question: 'How does the AI generate settings?',
    answer: `<p>SynthStack uses a multi-stage AI pipeline:</p>
    <ol>
      <li><strong>Geometry Analysis</strong>: Trimesh analyzes your STL for overhangs (&gt;45°), thin walls (&lt;0.8mm), bridge spans, and complexity</li>
      <li><strong>RAG Retrieval</strong>: pgvector embeddings search our knowledge base for relevant manufacturer specs and community profiles</li>
      <li><strong>LLM Generation</strong>: Claude/GPT-4o generates settings with confidence scores and citations</li>
      <li><strong>Schema Validation</strong>: Zod validates all outputs against slicer-specific schemas</li>
    </ol>
    <p class="citation">📚 <a href="/blog/how-synthstack-ai-works">Read our deep-dive on the AI architecture →</a></p>`
  },
  // Profiles
  {
    category: 'profiles',
    question: 'How accurate are the generated profiles?',
    answer: `<p>Our AI achieves an <strong>85%+ first-print success rate</strong> based on community feedback—significantly higher than default slicer settings which often require manual tuning.</p>
    <p>Key factors that improve accuracy:</p>
    <ul>
      <li>RAG pipeline with 10,000+ validated profiles</li>
      <li>Material-specific temperature curves from manufacturer datasheets</li>
      <li>Geometry-aware support and cooling recommendations</li>
      <li>Safety guardrails preventing impossible settings</li>
    </ul>
    <p class="citation">📚 Based on print success surveys from 5,000+ community-generated profiles (Dec 2024)</p>`
  },
  {
    category: 'profiles',
    question: 'Can I customize the generated settings?',
    answer: `<p><strong>Yes!</strong> Advanced mode unlocks full customization:</p>
    <ul>
      <li><strong>Print Intent</strong>: Choose Speed, Quality, Strength, or Balanced presets</li>
      <li><strong>Priority Sliders</strong>: Adjust 8 priorities from Surface Finish to Print Speed</li>
      <li><strong>Manual Overrides</strong>: Layer height, wall count, infill %, speeds, temperatures</li>
      <li><strong>Special Requirements</strong>: Water-tight, food-safe, flexible, support optimization</li>
      <li><strong>Notes to AI</strong>: Free-text instructions for specific needs</li>
    </ul>
    <p>Free users get <strong>3 regenerations</strong> per profile. Paid plans have unlimited regenerations with different optimization suggestions each time.</p>`
  },
  {
    category: 'profiles',
    question: 'What does Simple vs Advanced mode do?',
    answer: `<p><strong>Simple Mode</strong> (default):</p>
    <ul>
      <li>Select printer, filament, quality level</li>
      <li>AI handles all settings automatically</li>
      <li>Best for beginners or quick profiles</li>
    </ul>
    <p><strong>Advanced Mode</strong>:</p>
    <ul>
      <li>8 priority sliders for fine-tuning</li>
      <li>Manual override controls for 8+ core settings</li>
      <li>Special requirement checkboxes</li>
      <li>Free-text AI instructions</li>
      <li>Detailed tooltips explaining each setting's impact</li>
    </ul>
    <p class="citation">📚 Research shows that 80% of print quality issues come from just 5 settings: layer height, print speed, temperature, retraction, and cooling. Our Advanced mode surfaces these prominently.</p>`
  },
  {
    category: 'profiles',
    question: 'What validation happens on generated profiles?',
    answer: `<p>Every generated profile goes through <strong>multi-layer validation</strong>:</p>
    <ol>
      <li><strong>Schema Validation</strong>: Zod schemas ensure all values are within slicer-acceptable ranges</li>
      <li><strong>Material Safety</strong>: Temperature limits enforced based on material datasheet</li>
      <li><strong>Physics Guardrails</strong>: Speed limits based on hotend melting capacity</li>
      <li><strong>Printer Limits</strong>: Build volume, max temps, acceleration limits respected</li>
    </ol>
    <p>If validation fails, the AI automatically regenerates with constrained parameters. You'll see confidence scores and any warnings in the results.</p>`
  },
  // Printers
  {
    category: 'printers',
    question: 'Is my printer supported?',
    answer: `<p>We support <strong>300+ printers</strong> from major manufacturers:</p>
    <ul>
      <li>Bambu Lab (X1C, P1S, P1P, A1, A1 Mini)</li>
      <li>Prusa (MK4, MK3S+, Mini+, XL)</li>
      <li>Creality (Ender series, CR series, K1, K1 Max)</li>
      <li>Voron (V0, Trident, V2.4)</li>
      <li>FlashForge (Adventurer, Creator, Guider)</li>
      <li>Anycubic, Elegoo, Sovol, and more</li>
    </ul>
    <p>If your printer isn't listed, our <strong>"Nearest Match"</strong> feature finds similar printers based on build volume, kinematics, and specifications.</p>
    <p class="citation">📚 Our printer database is updated daily via GitHub Actions scraping manufacturer sites and community repos.</p>`
  },
  {
    category: 'printers',
    question: 'How do I add a custom printer?',
    answer: `<p>Click the <strong>"+ Add Printer"</strong> button in the printer selector. Enter:</p>
    <ul>
      <li>Build volume (X, Y, Z in mm)</li>
      <li>Max nozzle and bed temperatures</li>
      <li>Extruder type (direct drive vs bowden)</li>
      <li>Nozzle diameter</li>
      <li>Optional: enclosure, heated bed, firmware</li>
    </ul>
    <p>Custom printers are saved to your browser's local storage (or your account if signed in).</p>`
  },
  {
    category: 'printers',
    question: 'How does "Nearest Match" work?',
    answer: `<p>When your exact printer isn't in our database, we use <strong>vector similarity search</strong> to find the closest match:</p>
    <ol>
      <li>Build volume dimensions (weighted 40%)</li>
      <li>Kinematics type (CoreXY, Bed Slinger, Delta)</li>
      <li>Extruder type (direct drive vs bowden)</li>
      <li>Max temperatures and speed capabilities</li>
    </ol>
    <p>You'll see the matched printer with a similarity score. Settings are then adjusted based on your actual printer's limits.</p>`
  },
  // Filaments
  {
    category: 'filaments',
    question: 'What filament types are supported?',
    answer: `<p>We support all common FDM materials:</p>
    <ul>
      <li><strong>PLA / PLA+</strong>: 190-220°C nozzle, 50-60°C bed</li>
      <li><strong>PETG</strong>: 230-250°C nozzle, 70-85°C bed</li>
      <li><strong>ABS</strong>: 230-250°C nozzle, 90-110°C bed (enclosure recommended)</li>
      <li><strong>ASA</strong>: 240-260°C nozzle, 90-110°C bed (outdoor-safe ABS alternative)</li>
      <li><strong>TPU</strong>: 220-245°C nozzle, 30-60°C bed (flexible, direct drive recommended)</li>
      <li><strong>Nylon (PA)</strong>: 250-270°C nozzle, 70-90°C bed (requires drying)</li>
      <li><strong>Polycarbonate</strong>: 280-310°C nozzle, 100-120°C bed (enclosure required)</li>
    </ul>
    <p class="citation">📚 Temperature ranges sourced from material datasheets and validated against community feedback. <a href="/guides/pla-vs-abs-vs-petg">Compare materials →</a></p>`
  },
  {
    category: 'filaments',
    question: 'Can I add filaments not in the database?',
    answer: `<p><strong>Yes!</strong> Add custom filaments with your own specifications:</p>
    <ul>
      <li>Material type and brand name</li>
      <li>Nozzle temperature range (min/max/optimal)</li>
      <li>Bed temperature range</li>
      <li>Cooling requirements (fan speed %)</li>
      <li>Special notes (e.g., "requires enclosure")</li>
    </ul>
    <p>Community-submitted filaments that pass validation are periodically added to the global database.</p>`
  },
  // Account
  {
    category: 'account',
    question: 'What do I get with a free account?',
    answer: `<p>A free account includes:</p>
    <ul>
      <li><strong>2 generations per day</strong> (resets at midnight UTC)</li>
      <li>Save up to 10 profiles</li>
      <li>Sync across devices</li>
      <li>Access generation history (7 days)</li>
      <li>Share profiles publicly</li>
      <li>3 regenerations per profile</li>
    </ul>
    <p>No credit card required. <a href="/signup">Create a free account →</a></p>`
  },
  {
    category: 'account',
    question: 'How do I delete my account?',
    answer: `<p>Go to <strong>Account Settings → Delete Account</strong> at the bottom of the page.</p>
    <p>This permanently deletes:</p>
    <ul>
      <li>All saved profiles</li>
      <li>Generation history</li>
      <li>Custom printers and filaments</li>
      <li>Payment information</li>
    </ul>
    <p class="warning">⚠️ This action cannot be undone. We recommend exporting your profiles first.</p>`
  },
  // Pricing
  {
    category: 'pricing',
    question: 'Is SynthStack free?',
    answer: `<p><strong>Yes!</strong> Core features are completely free:</p>
    <ul>
      <li>Upload STL files up to 50MB</li>
      <li>2 AI generations per day</li>
      <li>Export to all slicers</li>
      <li>Access printer and filament database</li>
    </ul>
    <p>Premium plans start at <strong>$7/month</strong> for increased limits, priority AI, and API access.</p>`
  },
  {
    category: 'pricing',
    question: 'What are the pricing tiers?',
    answer: `<table class="pricing-table">
      <tr><th>Tier</th><th>Price</th><th>Credits/Month</th><th>Key Features</th></tr>
      <tr><td>Free</td><td>$0</td><td>2/day</td><td>Basic analysis, all slicer exports</td></tr>
      <tr><td>Maker</td><td>$7/mo</td><td>30</td><td>Community profiles, bulk upload</td></tr>
      <tr><td>Pro</td><td>$14/mo</td><td>75</td><td>Priority AI, orientation optimization</td></tr>
      <tr><td>Unlimited</td><td>$29/mo</td><td>∞</td><td>API access, no upload limits</td></tr>
    </table>
    <p>All paid plans include unlimited regenerations, priority support, and early access to new features.</p>`
  },
  {
    category: 'pricing',
    question: 'What\'s included in Premium?',
    answer: `<p>Premium plans (Maker, Pro, Unlimited) include:</p>
    <ul>
      <li><strong>More generations</strong>: 30-75+ credits per month</li>
      <li><strong>Unlimited regenerations</strong>: Try different optimizations</li>
      <li><strong>Bulk upload</strong>: Process multiple STL files at once</li>
      <li><strong>No upload limits</strong>: Files larger than 50MB (Unlimited tier)</li>
      <li><strong>Priority AI</strong>: Faster processing, better models</li>
      <li><strong>API access</strong>: Integrate with your workflow</li>
      <li><strong>Orientation optimization</strong>: AI suggests best print orientation</li>
      <li><strong>Priority support</strong>: Email response within 24 hours</li>
    </ul>`
  },
  // Lifetime License
  {
    category: 'lifetime',
    question: 'What is the Lifetime License?',
    answer: `<p>The SynthStack Lifetime License is a <strong>one-time purchase</strong> that gives you full access to the source code repository and all premium features forever.</p>
    <p><strong>What's included:</strong></p>
    <ul>
      <li>Full source code access via private GitHub repository</li>
      <li>All 6 AI Co-Founder agents</li>
      <li>Complete documentation and tutorials</li>
      <li>Lifetime updates (bug fixes + security patches)</li>
      <li>Priority support via Discord</li>
      <li>Commercial usage rights (build unlimited SaaS products)</li>
      <li>No monthly fees or revenue sharing</li>
    </ul>
    <p><strong>Pricing:</strong></p>
    <ul>
      <li>Early Bird: $149 (first 500 copies)</li>
      <li>Regular: $297</li>
    </ul>
    <p class="citation">📚 <a href="/docs/guides/LIFETIME_LICENSE_GETTING_STARTED.md">Complete Getting Started Guide →</a></p>`
  },
  {
    category: 'lifetime',
    question: 'How do I get access to the GitHub repository?',
    answer: `<p>After purchasing your lifetime license, follow these steps:</p>
    <ol>
      <li><strong>Check your email</strong> for the welcome message from SynthStack</li>
      <li><strong>Click the link</strong> to the license access portal</li>
      <li><strong>Submit your GitHub username</strong> in the form</li>
      <li><strong>Accept the GitHub invitation</strong> sent to your GitHub account email</li>
      <li><strong>Clone the repository</strong>: <code>git clone https://github.com/manicinc/synthstack-pro.git</code></li>
    </ol>
    <p>The entire process takes about 5 minutes. You'll receive Read access to the private <code>manicinc/synthstack-pro</code> repository.</p>
    <p class="citation">📚 Don't have a GitHub account? <a href="https://github.com/signup">Create one free at github.com →</a></p>`
  },
  {
    category: 'lifetime',
    question: 'What does "lifetime updates" mean?',
    answer: `<p>You receive <strong>forever access</strong> to:</p>
    <ul>
      <li><strong>Bug fixes</strong>: All bug fixes for the lifetime of the product</li>
      <li><strong>Security patches</strong>: Critical security updates forever</li>
      <li><strong>New features</strong>: First 12 months of new feature releases included</li>
    </ul>
    <p><strong>After the first 12 months:</strong></p>
    <ul>
      <li>You continue using your current version indefinitely</li>
      <li>Still receive security patches and critical bug fixes</li>
      <li>Optional upgrade available for major version releases</li>
    </ul>
    <p><strong>Pull updates anytime:</strong></p>
    <code>cd synthstack-pro<br>git pull origin main</code>
    <p class="citation">📚 We follow semantic versioning (SemVer). Your code will never break from pulling updates within your license period.</p>`
  },
  {
    category: 'lifetime',
    question: 'Can I build multiple SaaS products with one license?',
    answer: `<p><strong>Yes!</strong> Your Lifetime License allows you to:</p>
    <ul>
      <li>✅ Build unlimited SaaS products</li>
      <li>✅ Use in client projects (no per-project fees)</li>
      <li>✅ White-label and rebrand completely</li>
      <li>✅ Modify the code freely</li>
      <li>✅ Deploy to production (self-hosted or cloud)</li>
      <li>✅ No revenue sharing required</li>
    </ul>
    <p><strong>What you cannot do:</strong></p>
    <ul>
      <li>❌ Create competing boilerplate products</li>
      <li>❌ Resell the source code as-is</li>
      <li>❌ Share your GitHub access with others</li>
      <li>❌ Publish the source code publicly</li>
    </ul>
    <p class="citation">📚 <a href="/docs/LICENSE-FAQ.md">Read the full license FAQ for detailed terms →</a></p>`
  },
  {
    category: 'lifetime',
    question: 'Do I need a GitHub account?',
    answer: `<p><strong>Yes</strong>, you need a GitHub account to receive repository access.</p>
    <p><strong>Why GitHub?</strong></p>
    <ul>
      <li>Industry-standard for source code distribution</li>
      <li>Easy to pull lifetime updates with <code>git pull</code></li>
      <li>Built-in version control and collaboration</li>
      <li>Works seamlessly with development workflows</li>
    </ul>
    <p><strong>Don't have a GitHub account?</strong></p>
    <p>Create one free at <a href="https://github.com/signup">github.com/signup</a>. It takes less than 2 minutes.</p>
    <p class="warning">⚠️ Use a professional/permanent GitHub username. This will be your access point to the repository.</p>`
  },
  {
    category: 'lifetime',
    question: 'What happens if I change my GitHub username?',
    answer: `<p>If you change your GitHub username after receiving access:</p>
    <ol>
      <li><strong>Contact us</strong> at <a href="mailto:team@manic.agency">team@manic.agency</a></li>
      <li>Provide your <strong>old username</strong> and <strong>new username</strong></li>
      <li>We'll <strong>update your access</strong> within 24 hours</li>
    </ol>
    <p>Include your purchase email or Stripe session ID to verify ownership.</p>
    <p class="citation">📚 This is a manual process for security reasons. We verify all access changes to prevent unauthorized access.</p>`
  },
  {
    category: 'lifetime',
    question: 'What if I have trouble accessing the repository?',
    answer: `<p><strong>Common issues and solutions:</strong></p>
    <p><strong>1. GitHub invitation not received:</strong></p>
    <ul>
      <li>Check your spam/junk folder</li>
      <li>Verify your GitHub email settings at <a href="https://github.com/settings/emails">github.com/settings/emails</a></li>
      <li>Check pending invitations at <a href="https://github.com/notifications">github.com/notifications</a></li>
      <li>Wait 5-10 minutes (invitations can be delayed)</li>
    </ul>
    <p><strong>2. Can't clone repository (404 error):</strong></p>
    <ul>
      <li>Ensure you accepted the GitHub invitation</li>
      <li>Verify you're logged into the correct GitHub account</li>
      <li>Try cloning via SSH instead of HTTPS</li>
    </ul>
    <p><strong>3. Still stuck?</strong></p>
    <p>Contact <a href="mailto:team@manic.agency">team@manic.agency</a> with:</p>
    <ul>
      <li>Your purchase email</li>
      <li>GitHub username submitted</li>
      <li>Exact error message</li>
    </ul>
    <p class="citation">📚 Lifetime license buyers get priority support. Average response time: &lt;4 hours during business hours.</p>`
  },
  {
    category: 'lifetime',
    question: 'Can I get a refund for the lifetime license?',
    answer: `<p><strong>Yes</strong>, we offer a <strong>30-day money-back guarantee</strong>.</p>
    <p><strong>Refund policy:</strong></p>
    <ul>
      <li>Request a refund within 30 days of purchase</li>
      <li>Email <a href="mailto:team@manic.agency">team@manic.agency</a> with your purchase details</li>
      <li>Full refund processed within 5-7 business days</li>
      <li>Your GitHub access will be revoked</li>
    </ul>
    <p><strong>After 30 days:</strong></p>
    <p>No refunds are available after the 30-day window. We recommend thoroughly reviewing the <a href="/docs">documentation</a> and <a href="/demo">live demo</a> before purchasing.</p>
    <p class="citation">📚 Our low refund rate (&lt;2%) shows most buyers are satisfied with their purchase.</p>`
  },
  {
    category: 'lifetime',
    question: 'How is this different from a subscription?',
    answer: `<table class="pricing-table">
      <tr><th>Feature</th><th>Subscription (Pro)</th><th>Lifetime License</th></tr>
      <tr><td>Cost</td><td>$24.99/month</td><td>$297 one-time</td></tr>
      <tr><td>Source Code</td><td>❌ No access</td><td>✅ Full access</td></tr>
      <tr><td>Updates</td><td>While subscribed</td><td>Lifetime</td></tr>
      <tr><td>AI Features</td><td>100 credits/day</td><td>All features</td></tr>
      <tr><td>Commercial Use</td><td>Single product</td><td>Unlimited products</td></tr>
      <tr><td>Self-Hosting</td><td>❌ Not allowed</td><td>✅ Full control</td></tr>
      <tr><td>White-Label</td><td>❌ Not allowed</td><td>✅ Allowed</td></tr>
    </table>
    <p><strong>Key difference:</strong></p>
    <p>Subscriptions give you access to use our <em>hosted platform</em>. The Lifetime License gives you the <em>entire codebase</em> to build your own products.</p>
    <p class="citation">📚 Think of it like renting an apartment (subscription) vs buying the blueprints to build your own house (lifetime license).</p>`
  }
])

const filteredFaqs = computed(() => {
  let filtered = faqs.value.filter(f => f.category === activeCategory.value)
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = faqs.value.filter(f =>
      f.question.toLowerCase().includes(query) ||
      f.answer.toLowerCase().includes(query)
    )
  }
  
  return filtered
})
</script>

<style lang="scss" scoped>
.faq-page {
  --section-padding: 60px 24px;
}

.page-hero {
  padding: 120px 24px 60px;
  text-align: center;
  
  h1 {
    font-size: 3rem;
    margin: 0 0 16px;
  }
  
  p {
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    margin: 0;
  }
}

.section-container {
  max-width: 1000px;
  margin: 0 auto;
}

.search-section {
  padding: 0 24px 40px;
  
  .search-input {
    max-width: 500px;
    margin: 0 auto;
  }
}

.faq-section {
  padding: var(--section-padding);
}

.faq-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 48px;
}

.faq-sidebar {
  position: sticky;
  top: 24px;
  height: fit-content;
}

.faq-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: var(--color-bg-secondary);
    }
    
    &.active {
      background: rgba(var(--q-primary-rgb), 0.1);
      color: var(--q-primary);
    }
  }
}

.faq-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:deep(.faq-header) {
  font-weight: 600;
  padding: 16px 20px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
}

:deep(.q-card) {
  background: var(--color-bg-secondary);
  border-radius: 0 0 12px 12px;
  margin-top: -12px;
  padding-top: 12px;
  
  p {
    margin: 0 0 12px;
    line-height: 1.6;
    
    &:last-child { margin-bottom: 0; }
  }
  
  ul, ol {
    margin: 12px 0;
    padding-left: 24px;
    
    li {
      margin-bottom: 8px;
      line-height: 1.5;
    }
  }
  
  strong {
    color: var(--color-text);
    font-weight: 600;
  }
  
  .citation {
    margin-top: 16px;
    padding: 12px 16px;
    background: rgba(var(--q-primary-rgb), 0.08);
    border-left: 3px solid var(--q-primary);
    border-radius: 0 8px 8px 0;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    
    a {
      color: var(--q-primary);
      text-decoration: none;
      font-weight: 500;
      
      &:hover { text-decoration: underline; }
    }
  }
  
  .warning {
    padding: 12px 16px;
    background: rgba(255, 152, 0, 0.1);
    border-left: 3px solid #ff9800;
    border-radius: 0 8px 8px 0;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }
  
  .pricing-table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 0.9rem;
    
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }
    
    th {
      background: var(--color-bg-tertiary);
      font-weight: 600;
      color: var(--color-text);
    }
    
    tr:last-child td {
      border-bottom: none;
    }
  }
}

.no-results {
  text-align: center;
  padding: 60px;
  color: var(--color-text-muted);
  
  p {
    margin: 16px 0 0;
  }
}

.contact-section {
  padding: var(--section-padding);
  background: var(--color-bg-secondary);
}

.contact-content {
  text-align: center;
  
  h2 {
    margin: 16px 0 12px;
    font-size: 1.75rem;
  }
  
  p {
    color: var(--color-text-secondary);
    margin: 0 0 24px;
  }
}

@media (max-width: 768px) {
  .faq-layout {
    grid-template-columns: 1fr;
  }
  
  .faq-sidebar {
    position: static;
  }
  
  .faq-nav {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
    
    a {
      padding: 8px 12px;
    }
  }
}
</style>
