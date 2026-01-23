<template>
  <q-page class="legal-page">
    <section class="legal-hero">
      <h1>Cookie Policy</h1>
      <p>Last updated: January 6, 2025</p>
    </section>

    <section class="legal-content">
      <div class="legal-container">
        <article class="legal-article">
          <h2>What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. 
            They help the website remember your preferences and understand how you use the site.
          </p>

          <h2>How We Use Cookies</h2>
          <p>SynthStack uses cookies for the following purposes:</p>

          <h3>Essential Cookies (Required)</h3>
          <p>These cookies are necessary for the website to function and cannot be disabled.</p>
          <table class="cookie-table">
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>sb-access-token</code></td>
                <td>Supabase authentication session token</td>
                <td>1 hour</td>
              </tr>
              <tr>
                <td><code>sb-refresh-token</code></td>
                <td>Supabase refresh token for session renewal</td>
                <td>7 days</td>
              </tr>
              <tr>
                <td><code>synthstack_cookie_consent</code></td>
                <td>Remembers your cookie preferences</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td><code>synthstack-theme</code></td>
                <td>Remembers your theme preference (light/dark/system)</td>
                <td>1 year</td>
              </tr>
            </tbody>
          </table>

          <h3>Functional Cookies</h3>
          <p>These cookies remember your preferences to enhance your experience.</p>
          <table class="cookie-table">
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>locale</code></td>
                <td>Remembers your preferred language</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td><code>copilot_preferences</code></td>
                <td>Stores your AI copilot settings</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td><code>last_project</code></td>
                <td>Remembers your last viewed project</td>
                <td>30 days</td>
              </tr>
              <tr>
                <td><code>sidebar_state</code></td>
                <td>Remembers sidebar open/closed state</td>
                <td>1 year</td>
              </tr>
            </tbody>
          </table>

          <h3>Analytics Cookies</h3>
          <p>These cookies help us understand how visitors use our website. They are only set when you provide consent.</p>
          <table class="cookie-table">
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Provider</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>_ga</code></td>
                <td>Google Analytics</td>
                <td>Distinguishes unique users</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td><code>_ga_G-GF2XVP9RXB</code></td>
                <td>Google Analytics 4</td>
                <td>Maintains session state</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td><code>_gid</code></td>
                <td>Google Analytics</td>
                <td>Distinguishes users for 24h</td>
                <td>24 hours</td>
              </tr>
              <tr>
                <td><code>_clck</code></td>
                <td>Microsoft Clarity</td>
                <td>Persists Clarity User ID</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td><code>_clsk</code></td>
                <td>Microsoft Clarity</td>
                <td>Connects page views into a session</td>
                <td>1 day</td>
              </tr>
              <tr>
                <td><code>CLID</code></td>
                <td>Microsoft Clarity</td>
                <td>Identifies returning users</td>
                <td>1 year</td>
              </tr>
            </tbody>
          </table>

          <h3>Marketing Cookies</h3>
          <p>These cookies may be set by our advertising partners to show relevant ads. They are only set when you provide consent.</p>
          <table class="cookie-table">
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Provider</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>NID</code></td>
                <td>Google</td>
                <td>Used for advertising purposes</td>
                <td>6 months</td>
              </tr>
              <tr>
                <td><code>IDE</code></td>
                <td>Google DoubleClick</td>
                <td>Used for targeted advertising</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td><code>_gcl_au</code></td>
                <td>Google Ads</td>
                <td>Conversion tracking</td>
                <td>90 days</td>
              </tr>
            </tbody>
          </table>

          <h2>Managing Cookies</h2>
          <h3>Cookie Consent Banner</h3>
          <p>
            When you first visit SynthStack, you'll see a cookie consent banner. 
            You can choose to accept all cookies, reject non-essential cookies, 
            or customize your preferences by category.
          </p>

          <h3>Update Your Preferences</h3>
          <p>
            You can update your cookie preferences at any time by clicking the 
            cookie icon (<q-icon
              name="cookie"
              size="16px"
            />) in the bottom-left corner, or by visiting our 
            <a
              href="#"
              @click.prevent="openCookieSettings"
            >Cookie Settings</a>.
          </p>

          <h3>Browser Settings</h3>
          <p>Most browsers allow you to control cookies through settings. Common options include:</p>
          <ul>
            <li>
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noopener"
              >Google Chrome</a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                target="_blank"
                rel="noopener"
              >Mozilla Firefox</a>
            </li>
            <li>
              <a
                href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                target="_blank"
                rel="noopener"
              >Safari</a>
            </li>
            <li>
              <a
                href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noopener"
              >Microsoft Edge</a>
            </li>
          </ul>
          <p>
            <strong>Note:</strong> Blocking all cookies may impact website functionality, including 
            authentication and personalization features.
          </p>

          <h2>Google Consent Mode v2</h2>
          <p>
            We use Google Consent Mode v2 to respect your privacy choices. When you deny consent:
          </p>
          <ul>
            <li>Analytics cookies are blocked and no user-level data is collected</li>
            <li>Advertising cookies are blocked and no personalized ads are shown</li>
            <li>Google receives anonymized, cookieless pings for basic analytics modeling</li>
          </ul>

          <h2>Microsoft Clarity</h2>
          <p>
            When you consent to analytics, Microsoft Clarity may record your session activity including:
          </p>
          <ul>
            <li>Mouse movements and clicks</li>
            <li>Page scrolling</li>
            <li>Form interactions (content is masked for privacy)</li>
          </ul>
          <p>
            Clarity automatically masks sensitive content including passwords, credit card fields, 
            and other personal information. You can opt out by declining analytics cookies.
          </p>

          <h2>Do Not Track</h2>
          <p>
            Some browsers have a "Do Not Track" (DNT) feature. While we don't currently respond to 
            DNT signals, we respect the cookie preferences you set through our consent banner.
          </p>

          <h2>Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy to reflect changes in our practices or for 
            legal reasons. Check this page periodically for updates.
          </p>

          <h2>Contact Us</h2>
          <p>
            For questions about our use of cookies, contact us at
            <a href="mailto:team@manic.agency">team@manic.agency</a>.
          </p>
        </article>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
function openCookieSettings() {
  // Trigger cookie consent modal
  window.dispatchEvent(new CustomEvent('open-cookie-settings'))
}
</script>

<style lang="scss" scoped>
@import './legal-styles.scss';

.cookie-table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0 32px;
  font-size: 0.875rem;
  
  th, td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }
  
  th {
    background: var(--color-bg-tertiary);
    font-weight: 600;
  }
  
  code {
    background: var(--color-bg-tertiary);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
  }
}

@media (max-width: 768px) {
  .cookie-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
