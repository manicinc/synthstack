<template>
  <q-page class="legal-page">
    <section class="legal-hero">
      <h1>GDPR Compliance</h1>
      <p>Your data protection rights under EU law</p>
    </section>

    <section class="legal-content">
      <div class="legal-container">
        <article class="legal-article">
          <h2>Our Commitment to GDPR</h2>
          <p>
            SynthStack is committed to protecting the privacy of all users, including those 
            in the European Economic Area (EEA). We comply with the General Data Protection 
            Regulation (GDPR) and have implemented appropriate measures to ensure your data 
            is handled lawfully, fairly, and transparently.
          </p>

          <h2>Your Rights Under GDPR</h2>
          <p>As an EU resident, you have the following rights regarding your personal data:</p>

          <div class="rights-grid">
            <div class="right-card">
              <q-icon
                name="visibility"
                size="32px"
              />
              <h3>Right to Access</h3>
              <p>Request a copy of the personal data we hold about you.</p>
            </div>
            <div class="right-card">
              <q-icon
                name="edit"
                size="32px"
              />
              <h3>Right to Rectification</h3>
              <p>Request correction of inaccurate or incomplete data.</p>
            </div>
            <div class="right-card">
              <q-icon
                name="delete"
                size="32px"
              />
              <h3>Right to Erasure</h3>
              <p>Request deletion of your personal data ("right to be forgotten").</p>
            </div>
            <div class="right-card">
              <q-icon
                name="block"
                size="32px"
              />
              <h3>Right to Restrict</h3>
              <p>Request restriction of processing in certain circumstances.</p>
            </div>
            <div class="right-card">
              <q-icon
                name="download"
                size="32px"
              />
              <h3>Right to Portability</h3>
              <p>Receive your data in a structured, machine-readable format.</p>
            </div>
            <div class="right-card">
              <q-icon
                name="do_not_disturb"
                size="32px"
              />
              <h3>Right to Object</h3>
              <p>Object to processing based on legitimate interests.</p>
            </div>
          </div>

          <h2>How to Exercise Your Rights</h2>
          <p>
            To exercise any of these rights, please contact our Data Protection team:
          </p>
          <div class="contact-box">
            <p><strong>Email:</strong> <a href="mailto:team@manic.agency">team@manic.agency</a></p>
            <p><strong>Subject:</strong> GDPR Data Request</p>
          </div>
          <p>
            We will respond to your request within 30 days. In complex cases, we may extend 
            this period by up to two additional months, but we will inform you of any delay.
          </p>
          <p>
            To verify your identity, we may ask for additional information such as confirmation 
            of your email address or recent account activity.
          </p>

          <h2>Data Processing Activities</h2>
          
          <h3>What We Process</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Data Category</th>
                <th>Purpose</th>
                <th>Legal Basis</th>
                <th>Retention</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Account Data (email, name)</td>
                <td>Provide service, authentication</td>
                <td>Contract</td>
                <td>Until account deletion + 30 days</td>
              </tr>
              <tr>
                <td>AI Conversation Data</td>
                <td>Provide AI copilot features</td>
                <td>Contract</td>
                <td>90 days default, adjustable</td>
              </tr>
              <tr>
                <td>Project Data</td>
                <td>Provide project management features</td>
                <td>Contract</td>
                <td>Until deleted by user</td>
              </tr>
              <tr>
                <td>Usage Data</td>
                <td>Analytics, service improvement</td>
                <td>Consent / Legitimate Interest</td>
                <td>26 months</td>
              </tr>
              <tr>
                <td>Session Recordings</td>
                <td>UX improvement (Microsoft Clarity)</td>
                <td>Consent</td>
                <td>30 days</td>
              </tr>
              <tr>
                <td>Support Communications</td>
                <td>Resolve issues, improve support</td>
                <td>Contract / Legitimate Interest</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td>Payment Information</td>
                <td>Process subscriptions</td>
                <td>Contract / Legal Obligation</td>
                <td>7 years (legal requirement)</td>
              </tr>
              <tr>
                <td>Marketing Preferences</td>
                <td>Send newsletters (with consent)</td>
                <td>Consent</td>
                <td>Until consent withdrawn</td>
              </tr>
            </tbody>
          </table>

          <h3>Third-Party Processors (Sub-Processors)</h3>
          <p>We use the following GDPR-compliant service providers to process your data:</p>
          <table class="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Provider</th>
                <th>Location</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cloud Hosting</td>
                <td>Linode/Akamai</td>
                <td>EU & US data centers</td>
                <td>Infrastructure</td>
              </tr>
              <tr>
                <td>Authentication</td>
                <td>Supabase</td>
                <td>US (SCCs in place)</td>
                <td>User authentication</td>
              </tr>
              <tr>
                <td>Analytics</td>
                <td>Google Analytics</td>
                <td>US (SCCs, IP anonymization)</td>
                <td>Usage analytics</td>
              </tr>
              <tr>
                <td>Session Recording</td>
                <td>Microsoft Clarity</td>
                <td>US (SCCs in place)</td>
                <td>UX analytics</td>
              </tr>
              <tr>
                <td>AI Processing</td>
                <td>OpenAI</td>
                <td>US (SCCs in place)</td>
                <td>AI copilot features</td>
              </tr>
              <tr>
                <td>AI Processing</td>
                <td>Anthropic</td>
                <td>US (SCCs in place)</td>
                <td>AI copilot features</td>
              </tr>
              <tr>
                <td>Payments</td>
                <td>Stripe</td>
                <td>US (SCCs in place)</td>
                <td>Payment processing</td>
              </tr>
              <tr>
                <td>Email</td>
                <td>Resend</td>
                <td>US (SCCs in place)</td>
                <td>Transactional email</td>
              </tr>
            </tbody>
          </table>

          <h2>International Data Transfers</h2>
          <p>
            Some of our service providers are based in the United States. For these transfers, 
            we rely on:
          </p>
          <ul>
            <li><strong>Standard Contractual Clauses (SCCs)</strong> approved by the European Commission</li>
            <li><strong>Data Processing Agreements (DPAs)</strong> with all sub-processors</li>
            <li><strong>Additional safeguards</strong> including encryption, access controls, and data minimization</li>
          </ul>

          <h2>Consent Management</h2>
          <p>
            We use a consent management platform to obtain and manage your consent for non-essential 
            data processing. You can manage your preferences at any time:
          </p>
          <ul>
            <li>
              Click the cookie icon (<q-icon
                name="cookie"
                size="16px"
              />) in the bottom-left corner
            </li>
            <li>
              Visit your <router-link to="/app/account">
                Account Settings
              </router-link>
            </li>
            <li>Contact us at <a href="mailto:team@manic.agency">team@manic.agency</a></li>
          </ul>

          <h2>Data Protection Measures</h2>
          <p>We implement technical and organizational measures to protect your data:</p>
          <ul>
            <li><strong>Encryption:</strong> TLS 1.3 in transit, AES-256 at rest</li>
            <li><strong>Access Control:</strong> Role-based permissions, MFA for admin access</li>
            <li><strong>Pseudonymization:</strong> Analytics data is pseudonymized where possible</li>
            <li><strong>Data Minimization:</strong> We only collect data necessary for stated purposes</li>
            <li><strong>Regular Audits:</strong> Security assessments and penetration testing</li>
          </ul>
          <p>
            See our <router-link to="/security">
              Security Policy
            </router-link> for comprehensive details.
          </p>

          <h2>Data Protection Officer</h2>
          <p>
            While not legally required given our size, we have designated a privacy contact
            who can be reached at <a href="mailto:team@manic.agency">team@manic.agency</a>.
          </p>

          <h2>Complaints</h2>
          <p>
            If you believe we have not handled your data appropriately, you have the right 
            to lodge a complaint with your local data protection authority. A list of EU 
            data protection authorities can be found on the 
            <a
              href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
              target="_blank"
              rel="noopener"
            >
              European Data Protection Board website
            </a>.
          </p>
          <p>
            We encourage you to contact us first at <a href="mailto:team@manic.agency">team@manic.agency</a>
            so we can try to resolve your concerns directly.
          </p>

          <h2>Updates to This Page</h2>
          <p>
            We may update this GDPR information as our practices evolve or regulations change. 
            Material changes will be communicated via email to registered users.
          </p>
          <p><strong>Last Updated:</strong> January 6, 2025</p>
        </article>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
@import './legal-styles.scss';

.rights-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin: 32px 0;
}

.right-card {
  padding: 24px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
  
  h3 {
    margin: 12px 0 8px;
    font-size: 1rem;
  }
  
  p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
}

.contact-box {
  padding: 20px 24px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  margin: 16px 0;
  
  p {
    margin: 4px 0;
  }
}

.data-table {
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
}

@media (max-width: 900px) {
  .rights-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .rights-grid {
    grid-template-columns: 1fr;
  }
  
  .data-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
