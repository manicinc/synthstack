<template>
  <q-page class="guidelines-page">
    <div class="page-container">
      <div class="page-header">
        <q-icon
          name="gavel"
          size="48px"
          color="primary"
        />
        <h1>Community Guidelines</h1>
        <p class="subtitle">
          Help us keep SynthStack a welcoming place for all makers
        </p>
      </div>

      <div class="guidelines-content">
        <!-- Quick Summary -->
        <div class="summary-card">
          <h3>📋 TL;DR</h3>
          <ul>
            <li>✅ Share original work or properly attributed remixes</li>
            <li>✅ Use accurate descriptions and metadata</li>
            <li>✅ Be respectful in comments and feedback</li>
            <li>❌ No copyrighted/trademarked content without permission</li>
            <li>❌ No inappropriate, offensive, or dangerous content</li>
            <li>❌ No spam, misleading descriptions, or low-quality uploads</li>
          </ul>
        </div>

        <!-- Full Guidelines -->
        <section class="guideline-section">
          <h2>1. Original Work & Attribution</h2>
          <p>
            We welcome both original creations and remixes/derivatives. When sharing work:
          </p>
          <ul>
            <li><strong>Original work:</strong> You created the design from scratch</li>
            <li><strong>Remixes:</strong> You modified an existing design. Always credit the original creator with a link to the source</li>
            <li><strong>Collaborations:</strong> Credit all contributors in your description</li>
          </ul>
          <div class="info-box">
            <q-icon name="info" />
            <p>
              Using our upload wizard, you can specify whether your work is original or a remix, 
              and provide proper attribution automatically.
            </p>
          </div>
        </section>

        <section class="guideline-section">
          <h2>2. Licensing</h2>
          <p>
            Choose a license that reflects how you want others to use your work. We support:
          </p>
          <div class="license-grid">
            <div class="license-item">
              <strong>CC BY</strong>
              <p>Anyone can use for any purpose with credit</p>
            </div>
            <div class="license-item">
              <strong>CC BY-SA</strong>
              <p>Same as CC BY, but derivatives must use same license</p>
            </div>
            <div class="license-item">
              <strong>CC BY-NC</strong>
              <p>Free to use with credit, no commercial use</p>
            </div>
            <div class="license-item">
              <strong>CC0</strong>
              <p>Public domain - no restrictions</p>
            </div>
            <div class="license-item">
              <strong>GPL</strong>
              <p>Open source - derivatives must also be open source</p>
            </div>
          </div>
          <p class="note">
            <strong>Important:</strong> When remixing, your license must be compatible with the original.
          </p>
        </section>

        <section class="guideline-section">
          <h2>3. Copyright & Trademarks</h2>
          <p>
            Do not upload content that infringes on intellectual property rights:
          </p>
          <ul>
            <li>❌ Models of trademarked characters (Disney, Marvel, etc.) without permission</li>
            <li>❌ Logos, brand symbols, or company imagery</li>
            <li>❌ Scanned or copied artwork from other artists</li>
            <li>❌ Models from games, movies, or media without proper licensing</li>
          </ul>
          <div class="warning-box">
            <q-icon name="warning" />
            <p>
              Copyright violations will be removed and may result in account suspension. 
              We comply with DMCA takedown requests.
            </p>
          </div>
        </section>

        <section class="guideline-section">
          <h2>4. Content Standards</h2>
          <p>All uploads must be:</p>
          <ul>
            <li>✅ Safe for work (no adult/NSFW content)</li>
            <li>✅ Non-violent (no weapons designed to harm)</li>
            <li>✅ Non-discriminatory (no hate symbols or offensive content)</li>
            <li>✅ Legal (no drug paraphernalia or illegal items)</li>
            <li>✅ Functional (no intentionally defective designs)</li>
          </ul>
        </section>

        <section class="guideline-section">
          <h2>5. Quality Standards</h2>
          <p>To maintain catalog quality, uploads should:</p>
          <ul>
            <li>Have accurate, descriptive titles (not "Test" or "asdfgh")</li>
            <li>Include meaningful descriptions of the model's purpose</li>
            <li>Use correct categories and relevant tags</li>
            <li>Provide helpful print settings when possible</li>
            <li>Be printable (watertight meshes, reasonable geometry)</li>
          </ul>
        </section>

        <section class="guideline-section">
          <h2>6. Community Interaction</h2>
          <p>When commenting and interacting:</p>
          <ul>
            <li>✅ Be constructive with feedback</li>
            <li>✅ Help others troubleshoot printing issues</li>
            <li>✅ Share your makes and results</li>
            <li>❌ No harassment, insults, or personal attacks</li>
            <li>❌ No spam, self-promotion, or off-topic content</li>
            <li>❌ No political, religious, or inflammatory discussions</li>
          </ul>
        </section>

        <section class="guideline-section">
          <h2>7. Moderation Process</h2>
          <p>
            All uploads go through our moderation process:
          </p>
          <ol>
            <li><strong>AI Review:</strong> Automated check for quality and policy compliance</li>
            <li><strong>Auto-Approval:</strong> Clear submissions are approved within minutes</li>
            <li><strong>Human Review:</strong> Flagged items are reviewed by our team</li>
            <li><strong>Appeal:</strong> You can appeal rejected submissions</li>
          </ol>
          <p>
            Most submissions are approved automatically. Reviews typically take 2-5 minutes.
          </p>
        </section>

        <section class="guideline-section">
          <h2>8. Enforcement</h2>
          <p>Violations may result in:</p>
          <ul>
            <li>Content removal with notification</li>
            <li>Warning for minor or first-time violations</li>
            <li>Temporary suspension for repeated violations</li>
            <li>Permanent ban for serious or continued violations</li>
          </ul>
        </section>

        <!-- Report Section -->
        <div class="report-section">
          <h3>See Something Wrong?</h3>
          <p>
            Help us maintain quality by reporting content that violates these guidelines.
            Use the report button on any model, comment, or profile.
          </p>
          <q-btn
            color="primary"
            icon="flag"
            label="Learn About Reporting"
            to="/faq#reporting"
          />
        </div>

        <!-- Last Updated -->
        <div class="last-updated">
          <p>Last updated: December 2024</p>
          <p>
            Questions? <router-link to="/contact">
              Contact us
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.guidelines-page {
  padding: 80px 24px;
}

.page-container {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 48px;
  
  h1 {
    margin: 16px 0 8px;
    font-size: 2.5rem;
  }
  
  .subtitle {
    color: var(--color-text-secondary);
    font-size: 1.1rem;
    margin: 0;
  }
}

.guidelines-content {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 40px;
}

.summary-card {
  padding: 24px;
  background: rgba(var(--q-primary-rgb, 249, 115, 22), 0.1);
  border-radius: 12px;
  margin-bottom: 40px;
  
  h3 {
    margin: 0 0 16px;
    font-size: 1.25rem;
  }
  
  ul {
    margin: 0;
    padding-left: 20px;
    
    li {
      margin-bottom: 8px;
      line-height: 1.5;
    }
  }
}

.guideline-section {
  margin-bottom: 40px;
  
  h2 {
    font-size: 1.25rem;
    margin: 0 0 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--color-border);
  }
  
  p {
    color: var(--color-text-secondary);
    line-height: 1.7;
    margin: 0 0 16px;
  }
  
  ul, ol {
    margin: 0 0 16px;
    padding-left: 24px;
    
    li {
      margin-bottom: 8px;
      line-height: 1.6;
      color: var(--color-text-secondary);
    }
  }
  
  .note {
    font-style: italic;
    color: var(--color-text-muted);
  }
}

.info-box, .warning-box {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
  
  .q-icon {
    font-size: 24px;
    flex-shrink: 0;
  }
  
  p {
    margin: 0;
    font-size: 0.9rem;
  }
}

.info-box {
  background: rgba(var(--q-primary-rgb, 249, 115, 22), 0.1);
  
  .q-icon { color: var(--q-primary); }
}

.warning-box {
  background: rgba(239, 68, 68, 0.1);
  
  .q-icon { color: #ef4444; }
}

.license-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin: 16px 0;
}

.license-item {
  padding: 16px;
  background: var(--color-bg-tertiary);
  border-radius: 8px;
  
  strong {
    display: block;
    margin-bottom: 4px;
  }
  
  p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }
}

.report-section {
  text-align: center;
  padding: 32px;
  background: var(--color-bg-tertiary);
  border-radius: 12px;
  margin-top: 40px;
  
  h3 {
    margin: 0 0 12px;
  }
  
  p {
    color: var(--color-text-secondary);
    margin: 0 0 20px;
  }
}

.last-updated {
  text-align: center;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
  
  p {
    margin: 4px 0;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    
    a { color: var(--q-primary); }
  }
}

@media (max-width: 600px) {
  .guidelines-content {
    padding: 24px;
  }
  
  .license-grid {
    grid-template-columns: 1fr;
  }
}
</style>




