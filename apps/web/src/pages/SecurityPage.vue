<template>
  <q-page class="legal-page security-page">
    <section class="legal-hero">
      <h1>Security Policy</h1>
      <p>Our commitment to protecting your data and privacy</p>
    </section>

    <section class="legal-content">
      <div class="legal-container">
        <article class="legal-article">
          <!-- Security Overview -->
          <div class="security-badge-section">
            <div class="security-badges">
              <div class="badge">
                <q-icon
                  name="verified_user"
                  size="32px"
                />
                <span>256-bit Encryption</span>
              </div>
              <div class="badge">
                <q-icon
                  name="lock"
                  size="32px"
                />
                <span>SOC 2 Roadmap</span>
              </div>
              <div class="badge">
                <q-icon
                  name="shield"
                  size="32px"
                />
                <span>GDPR Compliant</span>
              </div>
              <div class="badge">
                <q-icon
                  name="security"
                  size="32px"
                />
                <span>CCPA Compliant</span>
              </div>
            </div>
          </div>

          <h2>Security Overview & Commitment</h2>
          <p>
            At SynthStack, security is not just a feature—it's the foundation of everything we build. 
            We understand that you're entrusting us with your business data, AI interactions, and 
            sensitive information. This trust is our highest priority, and we're committed to 
            maintaining the strictest security standards across our entire platform.
          </p>
          <p>
            Our security program is designed around the principle of defense in depth, implementing 
            multiple layers of security controls to protect your data at every level. We continuously 
            monitor, audit, and improve our security posture to stay ahead of emerging threats.
          </p>

          <h2>Infrastructure Security</h2>
          <p>Our infrastructure is built on enterprise-grade cloud platforms with industry-leading security:</p>
          
          <h3>Network Security</h3>
          <ul>
            <li><strong>TLS 1.3 Encryption:</strong> All data in transit is encrypted using TLS 1.3 with perfect forward secrecy</li>
            <li><strong>Web Application Firewall (WAF):</strong> Protection against OWASP Top 10 vulnerabilities, DDoS attacks, and malicious traffic</li>
            <li><strong>Network Segmentation:</strong> Strict isolation between production, staging, and development environments</li>
            <li><strong>Intrusion Detection:</strong> Real-time monitoring and alerting for suspicious network activity</li>
            <li><strong>DDoS Protection:</strong> Multi-layer DDoS mitigation with automatic traffic scrubbing</li>
          </ul>

          <h3>Server Security</h3>
          <ul>
            <li><strong>Hardened OS:</strong> Minimal attack surface with only essential services enabled</li>
            <li><strong>Automatic Patching:</strong> Security patches applied within 24 hours of release for critical vulnerabilities</li>
            <li><strong>Container Isolation:</strong> Workloads run in isolated containers with strict resource limits</li>
            <li><strong>SSH Key-Only Access:</strong> Password authentication disabled; Ed25519 keys required</li>
            <li><strong>Bastion Hosts:</strong> Administrative access restricted through hardened jump servers with MFA</li>
          </ul>

          <h2>Data Protection</h2>
          
          <h3>Encryption Standards</h3>
          <table class="security-table">
            <thead>
              <tr>
                <th>Data State</th>
                <th>Encryption Method</th>
                <th>Key Size</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Data in Transit</td>
                <td>TLS 1.3 with AES-256-GCM</td>
                <td>256-bit</td>
              </tr>
              <tr>
                <td>Data at Rest</td>
                <td>AES-256 with envelope encryption</td>
                <td>256-bit</td>
              </tr>
              <tr>
                <td>Database Fields</td>
                <td>Column-level encryption (sensitive fields)</td>
                <td>256-bit</td>
              </tr>
              <tr>
                <td>Backups</td>
                <td>AES-256 with separate key hierarchy</td>
                <td>256-bit</td>
              </tr>
              <tr>
                <td>API Keys & Secrets</td>
                <td>HashiCorp Vault / AWS KMS</td>
                <td>256-bit</td>
              </tr>
            </tbody>
          </table>

          <h3>Key Management</h3>
          <ul>
            <li><strong>Key Rotation:</strong> Encryption keys rotated every 90 days or upon suspected compromise</li>
            <li><strong>Key Hierarchy:</strong> Master keys never leave hardware security modules (HSMs)</li>
            <li><strong>Separation of Duties:</strong> No single individual has access to complete key material</li>
            <li><strong>Audit Logging:</strong> All key access and operations are logged and monitored</li>
          </ul>

          <h3>Data Handling</h3>
          <ul>
            <li><strong>Minimization:</strong> We only collect data necessary for service operation</li>
            <li>
              <strong>Retention Limits:</strong> Data retained only as long as needed (see <router-link to="/privacy">
                Privacy Policy
              </router-link>)
            </li>
            <li><strong>Secure Deletion:</strong> Cryptographic erasure ensures data cannot be recovered</li>
            <li><strong>No Data Selling:</strong> Your data is never sold to third parties</li>
          </ul>

          <h2>Authentication & Access Control</h2>
          
          <h3>Password Security</h3>
          <ul>
            <li><strong>Argon2id Hashing:</strong> Passwords hashed using Argon2id with 65536 memory cost, 3 iterations, 4 parallelism</li>
            <li><strong>Minimum Requirements:</strong> 12+ characters with complexity requirements</li>
            <li><strong>Breach Detection:</strong> Passwords checked against known breach databases (Have I Been Pwned)</li>
            <li><strong>Account Lockout:</strong> Progressive delays after failed attempts; temporary lockout after 10 failures</li>
          </ul>

          <h3>Session Management</h3>
          <ul>
            <li><strong>JWT Tokens:</strong> Short-lived access tokens (1 hour) with secure refresh tokens (7 days)</li>
            <li><strong>Token Rotation:</strong> Refresh tokens rotated on each use to prevent replay attacks</li>
            <li><strong>Secure Cookies:</strong> HttpOnly, Secure, SameSite=Strict attributes</li>
            <li><strong>Device Binding:</strong> Sessions bound to device fingerprint; new devices require re-authentication</li>
          </ul>

          <h3>Multi-Factor Authentication (MFA)</h3>
          <ul>
            <li><strong>TOTP Support:</strong> Compatible with Google Authenticator, Authy, 1Password</li>
            <li><strong>WebAuthn/FIDO2:</strong> Hardware security key support (YubiKey, etc.)</li>
            <li><strong>Recovery Codes:</strong> Secure backup codes for account recovery</li>
            <li><strong>Admin Requirement:</strong> MFA mandatory for all administrative access</li>
          </ul>

          <h3>Role-Based Access Control (RBAC)</h3>
          <ul>
            <li><strong>Principle of Least Privilege:</strong> Users granted minimum permissions necessary</li>
            <li><strong>Granular Permissions:</strong> Fine-grained control over resources and actions</li>
            <li><strong>Regular Audits:</strong> Access reviews conducted quarterly</li>
            <li><strong>Just-in-Time Access:</strong> Elevated privileges granted temporarily with approval</li>
          </ul>

          <h2>Application Security</h2>
          
          <h3>Secure Development Lifecycle</h3>
          <ul>
            <li><strong>Security Training:</strong> All developers complete annual security training</li>
            <li><strong>Code Review:</strong> All changes require peer review with security checklist</li>
            <li><strong>Static Analysis:</strong> Automated SAST scanning on every commit (ESLint, Semgrep)</li>
            <li><strong>Dependency Scanning:</strong> Continuous monitoring for vulnerable dependencies (Snyk, npm audit)</li>
            <li><strong>Dynamic Testing:</strong> Regular DAST scans against staging environment</li>
          </ul>

          <h3>OWASP Top 10 Protection</h3>
          <table class="security-table">
            <thead>
              <tr>
                <th>Vulnerability</th>
                <th>Mitigation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Injection (SQL, NoSQL, Command)</td>
                <td>Parameterized queries, input validation, ORM usage</td>
              </tr>
              <tr>
                <td>Broken Authentication</td>
                <td>Argon2id hashing, MFA, session management</td>
              </tr>
              <tr>
                <td>Sensitive Data Exposure</td>
                <td>Encryption at rest/transit, data masking</td>
              </tr>
              <tr>
                <td>XML External Entities (XXE)</td>
                <td>Disabled DTD processing, safe parsers</td>
              </tr>
              <tr>
                <td>Broken Access Control</td>
                <td>RBAC, server-side authorization checks</td>
              </tr>
              <tr>
                <td>Security Misconfiguration</td>
                <td>Hardened defaults, automated compliance checks</td>
              </tr>
              <tr>
                <td>Cross-Site Scripting (XSS)</td>
                <td>CSP headers, output encoding, DOMPurify</td>
              </tr>
              <tr>
                <td>Insecure Deserialization</td>
                <td>Type validation, allowlist-only deserialization</td>
              </tr>
              <tr>
                <td>Vulnerable Components</td>
                <td>Automated dependency updates, vulnerability scanning</td>
              </tr>
              <tr>
                <td>Insufficient Logging</td>
                <td>Comprehensive audit logs, real-time alerting</td>
              </tr>
            </tbody>
          </table>

          <h3>API Security</h3>
          <ul>
            <li><strong>Rate Limiting:</strong> Request throttling to prevent abuse (100 req/min standard, 1000 req/min API)</li>
            <li><strong>Input Validation:</strong> Strict schema validation on all API endpoints</li>
            <li><strong>CORS Policy:</strong> Whitelist-only cross-origin requests</li>
            <li><strong>API Versioning:</strong> Deprecation notices and migration paths for security updates</li>
          </ul>

          <h2>Vulnerability Disclosure Program</h2>
          <p>
            We welcome responsible security research and encourage the security community to help us 
            keep SynthStack safe. If you discover a security vulnerability, please report it through 
            our responsible disclosure process.
          </p>

          <div class="disclosure-box">
            <h3>How to Report</h3>
            <ol>
              <li><strong>Email:</strong> Send details to <a href="mailto:team@manic.agency">team@manic.agency</a></li>
              <li><strong>Encrypt:</strong> Use our PGP key for sensitive reports (available at <code>/security.txt</code>)</li>
              <li>
                <strong>Include:</strong>
                <ul>
                  <li>Detailed description of the vulnerability</li>
                  <li>Steps to reproduce</li>
                  <li>Proof of concept (if available)</li>
                  <li>Your contact information</li>
                </ul>
              </li>
            </ol>

            <h3>Our Commitment</h3>
            <ul>
              <li><strong>Response Time:</strong> Initial response within 24 hours</li>
              <li><strong>Updates:</strong> Regular status updates throughout the process</li>
              <li><strong>Fix Timeline:</strong> Critical issues patched within 7 days</li>
              <li><strong>Recognition:</strong> Hall of Fame acknowledgment for valid reports</li>
              <li><strong>No Legal Action:</strong> We will not pursue legal action against researchers acting in good faith</li>
            </ul>

            <h3>Scope</h3>
            <p>The following are in scope for our vulnerability disclosure program:</p>
            <ul>
              <li>synthstack.app and all subdomains</li>
              <li>SynthStack mobile applications</li>
              <li>SynthStack API endpoints</li>
              <li>SynthStack desktop applications</li>
            </ul>
            <p>Out of scope: Third-party services, social engineering, physical attacks, denial of service.</p>
          </div>

          <h2>Incident Response</h2>
          
          <h3>Incident Classification</h3>
          <table class="security-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Description</th>
                <th>Response Time</th>
                <th>Notification</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="severity-critical">Critical</span></td>
                <td>Active data breach, system compromise</td>
                <td>Immediate</td>
                <td>Within 24 hours</td>
              </tr>
              <tr>
                <td><span class="severity-high">High</span></td>
                <td>Exploitable vulnerability discovered</td>
                <td>4 hours</td>
                <td>Within 48 hours</td>
              </tr>
              <tr>
                <td><span class="severity-medium">Medium</span></td>
                <td>Potential security weakness</td>
                <td>24 hours</td>
                <td>Within 7 days</td>
              </tr>
              <tr>
                <td><span class="severity-low">Low</span></td>
                <td>Minor issue, no data risk</td>
                <td>72 hours</td>
                <td>Monthly summary</td>
              </tr>
            </tbody>
          </table>

          <h3>Breach Notification</h3>
          <p>In the event of a data breach affecting your information:</p>
          <ul>
            <li><strong>GDPR:</strong> Affected EU users notified within 72 hours</li>
            <li><strong>CCPA:</strong> California residents notified as required by law</li>
            <li><strong>Content:</strong> Nature of breach, data affected, remediation steps, contact information</li>
            <li><strong>Regulatory:</strong> Appropriate authorities notified as required</li>
          </ul>

          <h3>Incident Response Team</h3>
          <p>
            Our dedicated security team is available 24/7 to respond to security incidents. The team 
            includes security engineers, legal counsel, and communications specialists to ensure 
            comprehensive incident management.
          </p>

          <h2>Compliance & Certifications</h2>
          
          <h3>Current Compliance</h3>
          <div class="compliance-grid">
            <div class="compliance-card active">
              <q-icon
                name="check_circle"
                size="24px"
                color="positive"
              />
              <h4>GDPR</h4>
              <p>EU General Data Protection Regulation</p>
              <span class="status">Compliant</span>
            </div>
            <div class="compliance-card active">
              <q-icon
                name="check_circle"
                size="24px"
                color="positive"
              />
              <h4>CCPA</h4>
              <p>California Consumer Privacy Act</p>
              <span class="status">Compliant</span>
            </div>
            <div class="compliance-card active">
              <q-icon
                name="check_circle"
                size="24px"
                color="positive"
              />
              <h4>PCI DSS</h4>
              <p>Payment Card Industry (via Stripe)</p>
              <span class="status">Compliant</span>
            </div>
            <div class="compliance-card planned">
              <q-icon
                name="schedule"
                size="24px"
                color="warning"
              />
              <h4>SOC 2 Type II</h4>
              <p>Service Organization Control</p>
              <span class="status">Q2 2025</span>
            </div>
          </div>

          <h3>Third-Party Audits</h3>
          <ul>
            <li><strong>Annual Penetration Testing:</strong> Conducted by independent security firms</li>
            <li><strong>Quarterly Vulnerability Assessments:</strong> Automated and manual testing</li>
            <li><strong>Code Audits:</strong> Critical security components reviewed by external experts</li>
          </ul>

          <h2>Third-Party Security</h2>
          
          <h3>Vendor Assessment</h3>
          <p>All third-party vendors undergo rigorous security evaluation before integration:</p>
          <ul>
            <li>Security questionnaire completion</li>
            <li>SOC 2 or equivalent certification requirement</li>
            <li>Data processing agreement (DPA) execution</li>
            <li>Annual security review</li>
          </ul>

          <h3>Sub-Processors</h3>
          <table class="security-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Provider</th>
                <th>Purpose</th>
                <th>Certifications</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cloud Infrastructure</td>
                <td>Linode/Akamai</td>
                <td>Hosting</td>
                <td>SOC 2, ISO 27001</td>
              </tr>
              <tr>
                <td>Authentication</td>
                <td>Supabase</td>
                <td>User auth</td>
                <td>SOC 2</td>
              </tr>
              <tr>
                <td>Payments</td>
                <td>Stripe</td>
                <td>Billing</td>
                <td>PCI DSS Level 1</td>
              </tr>
              <tr>
                <td>Email</td>
                <td>Resend</td>
                <td>Transactional</td>
                <td>SOC 2</td>
              </tr>
              <tr>
                <td>AI Processing</td>
                <td>OpenAI / Anthropic</td>
                <td>AI features</td>
                <td>SOC 2</td>
              </tr>
              <tr>
                <td>Analytics</td>
                <td>Google / Microsoft</td>
                <td>Usage analytics</td>
                <td>ISO 27001</td>
              </tr>
            </tbody>
          </table>

          <h2>Physical Security</h2>
          <p>Our infrastructure partners maintain rigorous physical security standards:</p>
          <ul>
            <li><strong>Data Centers:</strong> SOC 2 Type II certified facilities</li>
            <li><strong>Access Control:</strong> Biometric and multi-factor physical access</li>
            <li><strong>Surveillance:</strong> 24/7 CCTV monitoring with 90-day retention</li>
            <li><strong>Environmental:</strong> Fire suppression, climate control, redundant power</li>
            <li><strong>Geographic Redundancy:</strong> Data replicated across multiple regions</li>
          </ul>

          <h2>Employee Security</h2>
          
          <h3>Hiring & Onboarding</h3>
          <ul>
            <li><strong>Background Checks:</strong> Conducted for all employees with data access</li>
            <li><strong>Security Training:</strong> Mandatory onboarding security course</li>
            <li><strong>Acceptable Use Policy:</strong> Signed agreement on responsible data handling</li>
            <li><strong>Principle of Least Privilege:</strong> Access granted based on job function only</li>
          </ul>

          <h3>Ongoing Security</h3>
          <ul>
            <li><strong>Annual Training:</strong> Security awareness training for all employees</li>
            <li><strong>Phishing Simulations:</strong> Regular tests to maintain vigilance</li>
            <li><strong>Access Reviews:</strong> Quarterly review of access permissions</li>
            <li><strong>Secure Workstations:</strong> Managed devices with encryption and MDM</li>
            <li><strong>Clean Desk Policy:</strong> No sensitive information left visible</li>
          </ul>

          <h3>Offboarding</h3>
          <ul>
            <li>Immediate access revocation upon termination</li>
            <li>Return of all company devices and credentials</li>
            <li>Exit interview covering confidentiality obligations</li>
          </ul>

          <h2>Business Continuity</h2>
          <ul>
            <li><strong>Daily Backups:</strong> Automated encrypted backups with 30-day retention</li>
            <li><strong>Point-in-Time Recovery:</strong> Database PITR with 7-day window</li>
            <li><strong>Disaster Recovery:</strong> RTO of 4 hours, RPO of 1 hour</li>
            <li><strong>Geographic Failover:</strong> Automatic failover to secondary region</li>
            <li><strong>Annual DR Testing:</strong> Full disaster recovery drills conducted yearly</li>
          </ul>

          <h2>Security Updates</h2>
          <p>
            This Security Policy is reviewed and updated quarterly to reflect our evolving security 
            practices and the changing threat landscape. Material changes will be communicated via 
            email to registered users.
          </p>
          <p><strong>Last Updated:</strong> January 6, 2025</p>
          <p><strong>Next Review:</strong> April 6, 2025</p>

          <h2>Contact Security Team</h2>
          <div class="contact-box">
            <p><strong>Security Issues:</strong> <a href="mailto:team@manic.agency">team@manic.agency</a></p>
            <p><strong>Privacy Inquiries:</strong> <a href="mailto:team@manic.agency">team@manic.agency</a></p>
            <p><strong>General Support:</strong> <a href="mailto:team@manic.agency">team@manic.agency</a></p>
            <p class="pgp-note">
              <q-icon
                name="vpn_key"
                size="16px"
              />
              PGP key available at <code>/.well-known/security.txt</code>
            </p>
          </div>
        </article>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
// Security page - static content, no script logic needed
</script>

<style lang="scss" scoped>
@import './legal-styles.scss';

.security-page {
  .security-badge-section {
    margin-bottom: 2rem;
  }

  .security-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
    margin: 2rem 0;

    .badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.25rem 1.5rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      min-width: 140px;

      .q-icon {
        color: var(--q-primary);
      }

      span {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--color-text-secondary);
        text-align: center;
      }
    }
  }

  .security-table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0 2rem;
    font-size: 0.875rem;

    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }

    th {
      background: var(--color-bg-tertiary);
      font-weight: 600;
      white-space: nowrap;
    }

    td {
      vertical-align: top;
    }

    code {
      background: var(--color-bg-tertiary);
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }
  }

  .severity-critical {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.75rem;
  }

  .severity-high {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    background: rgba(249, 115, 22, 0.15);
    color: #f97316;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.75rem;
  }

  .severity-medium {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    background: rgba(234, 179, 8, 0.15);
    color: #eab308;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.75rem;
  }

  .severity-low {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.75rem;
  }

  .disclosure-box {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
    margin: 1.5rem 0;

    h3 {
      margin-top: 0;
      color: var(--color-text-primary);
    }

    h3:not(:first-child) {
      margin-top: 1.5rem;
    }

    ol, ul {
      margin-bottom: 0;
    }

    code {
      background: var(--color-bg-tertiary);
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.8125rem;
    }
  }

  .compliance-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
  }

  .compliance-card {
    padding: 1.25rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    text-align: center;

    .q-icon {
      margin-bottom: 0.5rem;
    }

    h4 {
      margin: 0.5rem 0 0.25rem;
      font-size: 1rem;
    }

    p {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }

    .status {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    &.active .status {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    &.planned .status {
      background: rgba(234, 179, 8, 0.15);
      color: #eab308;
    }
  }

  .contact-box {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
    margin-top: 1rem;

    p {
      margin: 0.5rem 0;

      &:first-child {
        margin-top: 0;
      }

      &:last-child {
        margin-bottom: 0;
      }
    }

    a {
      color: var(--q-primary);
    }

    .pgp-note {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
      font-size: 0.8125rem;
      color: var(--color-text-secondary);

      code {
        background: var(--color-bg-tertiary);
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
      }
    }
  }
}

// Responsive
@media (max-width: 768px) {
  .security-page {
    .security-badges {
      flex-direction: column;
      align-items: stretch;

      .badge {
        flex-direction: row;
        justify-content: flex-start;
        min-width: auto;
      }
    }

    .security-table {
      display: block;
      overflow-x: auto;
    }

    .compliance-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>


