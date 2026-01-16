<template>
  <q-page class="legal-page">
    <section class="legal-hero">
      <h1>Privacy Policy</h1>
      <p>Last updated: January 6, 2025</p>
    </section>

    <section class="legal-content">
      <div class="legal-container">
        <article class="legal-article">
          <h2>Introduction</h2>
          <p>
            SynthStack ("we", "our", or "us") respects your privacy and is committed to protecting 
            your personal data. This privacy policy explains how we collect, use, and safeguard 
            your information when you use our service at synthstack.app.
          </p>

          <h2>Information We Collect</h2>
          
          <h3>Information you provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Email address, name, and password when you create an account</li>
            <li><strong>Profile Data:</strong> Business preferences, project configurations, and customization settings you save</li>
            <li><strong>AI Conversations:</strong> Messages and interactions with our AI copilot features</li>
            <li><strong>Project Data:</strong> Content, files, and information you create within projects</li>
            <li><strong>Payment Information:</strong> Billing details processed securely through Stripe (we don't store card numbers)</li>
            <li><strong>Communications:</strong> Information you provide when contacting us</li>
          </ul>

          <h3>Information collected automatically</h3>
          <ul>
            <li><strong>Usage Data:</strong> How you interact with our service (pages visited, features used)</li>
            <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
            <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
            <li><strong>Analytics Data:</strong> Session recordings and heatmaps via Microsoft Clarity (when consented)</li>
            <li>
              <strong>Cookies:</strong> See our <router-link to="/cookies">
                Cookie Policy
              </router-link>
            </li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and improve our AI copilot and SaaS platform services</li>
            <li>Personalize your experience with saved preferences and context</li>
            <li>Process payments and manage your subscription</li>
            <li>Send service-related communications and updates</li>
            <li>Analyze usage patterns to improve our platform</li>
            <li>Train and improve our AI models (with anonymized, aggregated data only)</li>
            <li>Detect and prevent fraud or abuse</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>AI Data Processing</h2>
          <p>
            Your interactions with SynthStack's AI copilot features are processed to provide you with 
            intelligent assistance. Important notes:
          </p>
          <ul>
            <li><strong>Context:</strong> AI uses your project context to provide relevant responses</li>
            <li><strong>Storage:</strong> Conversation history is stored for your continuity and can be deleted anytime</li>
            <li><strong>Third Parties:</strong> AI requests may be processed by OpenAI or Anthropic under strict data agreements</li>
            <li><strong>Training:</strong> Your specific data is NOT used to train public AI models without explicit consent</li>
          </ul>

          <h2>Legal Basis for Processing (GDPR)</h2>
          <p>Under the General Data Protection Regulation (GDPR), we process your data based on:</p>
          <ul>
            <li><strong>Contract:</strong> Processing necessary to provide our service to you</li>
            <li><strong>Consent:</strong> Where you have given explicit consent (e.g., marketing emails, analytics)</li>
            <li><strong>Legitimate Interest:</strong> For analytics, security, and service improvement</li>
            <li><strong>Legal Obligation:</strong> When required by law</li>
          </ul>

          <h2>Data Sharing</h2>
          <p>We do not sell your personal data. We may share data with:</p>
          <ul>
            <li>
              <strong>Service Providers:</strong>
              <ul>
                <li>Cloud hosting (Linode/Akamai)</li>
                <li>Authentication (Supabase)</li>
                <li>Analytics (Google Analytics, Microsoft Clarity)</li>
                <li>Payments (Stripe)</li>
                <li>AI processing (OpenAI, Anthropic)</li>
                <li>Email (Resend)</li>
              </ul>
            </li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            <li><strong>Business Transfers:</strong> In connection with a merger or acquisition</li>
          </ul>

          <h2>Data Retention</h2>
          <ul>
            <li><strong>Account Data:</strong> Retained while your account is active, deleted within 30 days of account deletion</li>
            <li><strong>Project Data:</strong> Retained until you delete it or close your account</li>
            <li><strong>AI Conversations:</strong> Retained for 90 days by default, adjustable in settings</li>
            <li><strong>Analytics Data:</strong> Retained for 26 months (Google Analytics), 30 days (Clarity recordings)</li>
            <li><strong>Log Data:</strong> Retained for 90 days</li>
            <li><strong>Billing Records:</strong> Retained for 7 years as required by law</li>
          </ul>

          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Rectification:</strong> Correct inaccurate data</li>
            <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
            <li><strong>Portability:</strong> Receive your data in a portable format</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interest</li>
            <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
            <li><strong>Restriction:</strong> Request restriction of processing</li>
          </ul>
          <p>To exercise these rights, contact us at <a href="mailto:team@manic.agency">team@manic.agency</a></p>

          <h2>California Privacy Rights (CCPA)</h2>
          <p>California residents have additional rights:</p>
          <ul>
            <li><strong>Right to Know:</strong> Request disclosure of data collected</li>
            <li><strong>Right to Delete:</strong> Request deletion of personal information</li>
            <li><strong>Right to Opt-Out:</strong> Opt out of sale of personal information (we don't sell data)</li>
            <li><strong>Non-Discrimination:</strong> Equal service regardless of privacy choices</li>
          </ul>

          <h2>Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your data, including:
          </p>
          <ul>
            <li>Encryption in transit (TLS 1.3) and at rest (AES-256)</li>
            <li>Access controls and authentication (Argon2id password hashing)</li>
            <li>Regular security assessments and penetration testing</li>
            <li>Employee training on data protection</li>
            <li>Incident response procedures</li>
          </ul>
          <p>
            See our <router-link to="/security">
              Security Policy
            </router-link> for comprehensive details.
          </p>

          <h2>International Transfers</h2>
          <p>
            Your data may be transferred to and processed in countries outside the EEA. 
            We ensure appropriate safeguards are in place (Standard Contractual Clauses, 
            adequacy decisions) to protect your data.
          </p>

          <h2>Children's Privacy</h2>
          <p>
            Our service is not intended for children under 16. We do not knowingly collect 
            data from children under 16. If you believe we have collected such data, 
            please contact us immediately.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this policy periodically. We will notify you of significant changes 
            via email or a prominent notice on our service. Continued use after changes 
            constitutes acceptance of the updated policy.
          </p>

          <h2>Contact Us</h2>
          <p>For privacy-related inquiries:</p>
          <ul>
            <li>Email: <a href="mailto:team@manic.agency">team@manic.agency</a></li>
            <li>General: <a href="mailto:team@manic.agency">team@manic.agency</a></li>
          </ul>
          <p>
            Data Controller: SynthStack<br>
            Website: synthstack.app
          </p>
        </article>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
@import './legal-styles.scss';
</style>
