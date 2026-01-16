<template>
  <q-page class="features-page">
    <section class="features-hero section">
      <div class="container">
        <h1>Features</h1>
        <p class="subtitle">
          Everything you need to optimize your 3D prints.
        </p>
      </div>
    </section>

    <section class="features-list section">
      <div class="container">
        <div class="feature-row">
          <div class="feature-content">
            <div class="feature-badge">
              Analysis
            </div>
            <h2>Smart STL Analysis</h2>
            <p>Our analysis engine examines your 3D model using advanced geometry algorithms:</p>
            <ul>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Overhang detection (>45°)
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Thin wall warnings (&lt;0.8mm)
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Optimal orientation suggestions
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Complexity scoring
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Print time estimation
              </li>
            </ul>
          </div>
          <div class="feature-visual">
            <div class="visual-box">
              <q-icon
                name="view_in_ar"
                size="64px"
              />
            </div>
          </div>
        </div>

        <div class="feature-row reverse">
          <div class="feature-content">
            <div class="feature-badge">
              AI
            </div>
            <h2>AI-Generated Settings</h2>
            <p>Powered by Claude and GPT-4, our AI considers:</p>
            <ul>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Your specific printer capabilities
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Filament temperature ranges
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Model geometry requirements
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Manufacturer recommendations
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Community validated data
              </li>
            </ul>
          </div>
          <div class="feature-visual">
            <div class="visual-box">
              <q-icon
                name="psychology"
                size="64px"
              />
            </div>
          </div>
        </div>

        <div class="feature-row">
          <div class="feature-content">
            <div class="feature-badge">
              Export
            </div>
            <h2>Multi-Slicer Export</h2>
            <p>Export optimized profiles to your favorite slicer:</p>
            <ul>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> OrcaSlicer (.json)
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> PrusaSlicer (.ini)
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Cura (.curaprofile)
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> FlashPrint (.fcfg)
              </li>
            </ul>
          </div>
          <div class="feature-visual">
            <div class="visual-box">
              <q-icon
                name="download"
                size="64px"
              />
            </div>
          </div>
        </div>

        <div class="feature-row reverse">
          <div class="feature-content">
            <div class="feature-badge">
              Community
            </div>
            <h2>Community Profiles</h2>
            <p>Learn from the community:</p>
            <ul>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Browse successful print profiles
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Vote on what works
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Share your optimizations
              </li>
              <li>
                <q-icon
                  name="check"
                  color="positive"
                /> Track success rates
              </li>
            </ul>
          </div>
          <div class="feature-visual">
            <div class="visual-box">
              <q-icon
                name="groups"
                size="64px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="cta-section section">
      <div class="container">
        <div class="cta-card">
          <h2>Ready to optimize?</h2>
          <p>Start with 2 free generations daily. No credit card required.</p>
          <q-btn
            unelevated
            color="primary"
            size="lg"
            label="Get Started Free"
            @click="$router.push('/auth/register')"
          />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.features-hero {
  text-align: center;
  padding-top: var(--space-16);
  background: var(--color-bg-secondary);

  h1 {
    font-size: var(--text-4xl);
    margin-bottom: var(--space-4);
  }

  .subtitle {
    font-size: var(--text-xl);
    color: var(--color-text-secondary);
  }
}

.features-list {
  background: var(--color-bg-primary);
}

.feature-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-10);
  align-items: center;
  padding: var(--space-12) 0;
  border-bottom: 1px solid var(--color-bg-elevated);

  &:last-child {
    border-bottom: none;
  }

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }

  &.reverse {
    @media (min-width: 768px) {
      .feature-visual {
        order: -1;
      }
    }
  }
}

.feature-content {
  h2 {
    font-size: var(--text-3xl);
    margin-bottom: var(--space-4);
  }

  p {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-6);
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) 0;

      .q-icon {
        flex-shrink: 0;
      }
    }
  }
}

.feature-badge {
  display: inline-block;
  background: var(--color-primary-muted);
  color: var(--color-primary);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
  margin-bottom: var(--space-4);
}

.feature-visual {
  display: flex;
  justify-content: center;
}

.visual-box {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-bg-elevated);
  border-radius: var(--radius-xl);
  color: var(--color-primary);
}

.cta-section {
  background: var(--color-bg-secondary);
}

.cta-card {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;

  h2 {
    margin-bottom: var(--space-4);
  }

  p {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-8);
  }
}
</style>

