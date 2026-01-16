<template>
  <q-page class="docs-page">
    <div class="docs-container">
      <!-- Header -->
      <header class="docs-header">
        <div class="breadcrumbs">
          <router-link to="/docs">
            Documentation
          </router-link>
          <q-icon
            name="chevron_right"
            size="16px"
          />
          <span>Collaborative Editing Guide</span>
        </div>
        <h1>Collaborative Editing Guide</h1>
        <p class="lead">
          Work together in real-time with smart field locking and conflict-free collaboration.
        </p>
      </header>

      <!-- Table of Contents -->
      <nav class="toc">
        <h2>On This Page</h2>
        <ul>
          <li><a href="#overview">Overview</a></li>
          <li><a href="#getting-started">Getting Started</a></li>
          <li><a href="#field-locking">Field Locking</a></li>
          <li><a href="#user-awareness">User Awareness</a></li>
          <li><a href="#best-practices">Best Practices</a></li>
          <li><a href="#technical">Technical Details</a></li>
          <li><a href="#troubleshooting">Troubleshooting</a></li>
        </ul>
      </nav>

      <!-- Content -->
      <article class="docs-content">
        <!-- Overview -->
        <section id="overview">
          <h2>Overview</h2>
          <p>
            Collaborative Editing enables multiple team members to work on the same content simultaneously
            without conflicts. Powered by Y.js CRDT technology, it provides real-time synchronization with
            smart field locking to prevent editing conflicts.
          </p>

          <div class="feature-grid">
            <div class="feature">
              <q-icon
                name="real_time_sync"
                size="32px"
                color="primary"
              />
              <h3>Real-Time Sync</h3>
              <p>See changes from other users instantly</p>
            </div>
            <div class="feature">
              <q-icon
                name="lock"
                size="32px"
                color="primary"
              />
              <h3>Field Locking</h3>
              <p>Automatic lock when editing a field</p>
            </div>
            <div class="feature">
              <q-icon
                name="people"
                size="32px"
                color="primary"
              />
              <h3>User Awareness</h3>
              <p>See who's viewing and editing</p>
            </div>
            <div class="feature">
              <q-icon
                name="block"
                size="32px"
                color="primary"
              />
              <h3>Conflict-Free</h3>
              <p>No more "save conflicts" errors</p>
            </div>
          </div>
        </section>

        <!-- Getting Started -->
        <section id="getting-started">
          <h2>Getting Started</h2>

          <h3>Enabling Collaborative Editing</h3>
          <p>Collaborative editing is enabled by default on all SynthStack instances. To verify:</p>
          <ol>
            <li>Log into Directus admin panel</li>
            <li>Navigate to <strong>Settings → Extensions</strong></li>
            <li>Verify <code>@directus-labs/collaborative-editing</code> is installed and enabled</li>
          </ol>

          <h3>WebSocket Connection</h3>
          <p>
            Collaborative editing requires WebSockets for real-time communication. Your SynthStack instance
            is pre-configured with WebSocket support.
          </p>

          <div class="info-box">
            <q-icon
              name="info"
              size="24px"
              color="primary"
            />
            <div>
              <strong>Connection Status</strong>
              <p>Look for the green connection indicator in the bottom right of the Directus admin panel.</p>
            </div>
          </div>
        </section>

        <!-- Field Locking -->
        <section id="field-locking">
          <h2>Field Locking</h2>
          <p>
            Field locking prevents multiple users from editing the same field simultaneously, avoiding conflicts.
          </p>

          <h3>How It Works</h3>
          <ol>
            <li><strong>Click to Lock:</strong> When you click into a field, it's automatically locked</li>
            <li><strong>Visual Indicator:</strong> Other users see a lock icon and the editor's name</li>
            <li><strong>Auto-Unlock:</strong> Field unlocks when you click away or after timeout</li>
            <li><strong>Manual Unlock:</strong> Admins can force-unlock fields if needed</li>
          </ol>

          <h3>Lock Behavior</h3>
          <div class="behavior-table">
            <table>
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Behavior</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>You click into an unlocked field</td>
                  <td>Field locks to you, you can edit</td>
                </tr>
                <tr>
                  <td>Field is locked by another user</td>
                  <td>Field is read-only, shows lock icon</td>
                </tr>
                <tr>
                  <td>You click away from a field</td>
                  <td>Field unlocks after 2 seconds</td>
                </tr>
                <tr>
                  <td>Your connection drops</td>
                  <td>Fields auto-unlock after 30 seconds</td>
                </tr>
                <tr>
                  <td>You close the browser</td>
                  <td>Fields unlock immediately</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Lock Timeout</h3>
          <p>
            If a user's browser crashes or loses connection, their locks automatically release after 30 seconds.
            Admins can manually force-unlock fields at any time.
          </p>
        </section>

        <!-- User Awareness -->
        <section id="user-awareness">
          <h2>User Awareness</h2>
          <p>
            See who's currently viewing or editing the same content as you in real-time.
          </p>

          <h3>User Avatars</h3>
          <p>
            Active users appear as avatars in the top right corner of the item detail page.
            Hover over an avatar to see the user's name and what they're doing.
          </p>

          <h3>Presence Indicators</h3>
          <ul>
            <li><strong>Green Dot:</strong> User is actively viewing the item</li>
            <li><strong>Blue Dot:</strong> User is editing a field</li>
            <li><strong>Gray Dot:</strong> User is idle (no activity for 5+ minutes)</li>
          </ul>

          <h3>Field Highlights</h3>
          <p>
            When another user is editing a field, that field is highlighted with their avatar color.
            This makes it easy to see at a glance what's being edited.
          </p>
        </section>

        <!-- Best Practices -->
        <section id="best-practices">
          <h2>Best Practices</h2>

          <h3>1. Communicate with Your Team</h3>
          <p>
            While collaborative editing prevents conflicts, it's still good practice to communicate
            with your team about major edits or content restructuring.
          </p>

          <h3>2. Work on Different Fields</h3>
          <p>
            The system works best when team members focus on different fields. For example:
          </p>
          <ul>
            <li>Writer focuses on content field</li>
            <li>Editor focuses on title and excerpt</li>
            <li>SEO specialist works on metadata</li>
          </ul>

          <h3>3. Save Regularly</h3>
          <p>
            While changes sync in real-time, you still need to save to persist to the database.
            Use Cmd/Ctrl+S to save quickly.
          </p>

          <h3>4. Watch for Lock Indicators</h3>
          <p>
            If you see a field is locked, check who's editing it before asking them to move on.
            They might be in the middle of important work.
          </p>

          <h3>5. Use Versioning</h3>
          <p>
            Enable content versioning on collections with frequent collaborative editing.
            This provides a safety net if something goes wrong.
          </p>
        </section>

        <!-- Technical Details -->
        <section id="technical">
          <h2>Technical Details</h2>

          <h3>Technology Stack</h3>
          <p>Collaborative editing is powered by:</p>
          <ul>
            <li><strong>Y.js:</strong> CRDT (Conflict-free Replicated Data Type) library</li>
            <li><strong>WebSockets:</strong> Real-time bidirectional communication</li>
            <li><strong>y-websocket:</strong> WebSocket provider for Y.js</li>
            <li><strong>Awareness Protocol:</strong> User presence and cursor tracking</li>
          </ul>

          <h3>Data Flow</h3>
          <ol>
            <li>User opens item in Directus admin</li>
            <li>Client establishes WebSocket connection</li>
            <li>Client joins collaboration room for that item</li>
            <li>Local changes propagate to server via WebSocket</li>
            <li>Server broadcasts changes to all connected clients</li>
            <li>Clients merge changes using Y.js CRDT algorithm</li>
          </ol>

          <h3>Requirements</h3>
          <div class="requirements">
            <h4>Server Requirements:</h4>
            <ul>
              <li>WebSocket support (wss:// for production)</li>
              <li>Sticky sessions if using load balancer</li>
              <li>CORS properly configured</li>
            </ul>

            <h4>Client Requirements:</h4>
            <ul>
              <li>Modern browser with WebSocket support</li>
              <li>Stable internet connection</li>
              <li>Cookies enabled for session management</li>
            </ul>
          </div>
        </section>

        <!-- Troubleshooting -->
        <section id="troubleshooting">
          <h2>Troubleshooting</h2>

          <h3>Connection Issues</h3>

          <h4>WebSocket connection failed</h4>
          <ul>
            <li>Check browser console for WebSocket errors</li>
            <li>Verify <code>WEBSOCKETS_ENABLED=true</code> in environment</li>
            <li>Ensure firewall allows WebSocket connections</li>
            <li>Check that reverse proxy supports WebSocket upgrade</li>
          </ul>

          <h4>Frequent disconnections</h4>
          <ul>
            <li>Check internet connection stability</li>
            <li>Increase WebSocket ping timeout in configuration</li>
            <li>Verify load balancer has sticky sessions enabled</li>
          </ul>

          <h3>Field Locking Issues</h3>

          <h4>Field stuck locked</h4>
          <ul>
            <li>Wait 30 seconds for automatic timeout</li>
            <li>Admin can force-unlock from Settings → Collaborative Editing</li>
            <li>Check that lock owner hasn't lost connection</li>
          </ul>

          <h4>Can't lock field</h4>
          <ul>
            <li>Verify you have edit permissions for the collection</li>
            <li>Check that WebSocket connection is active (green indicator)</li>
            <li>Refresh the page to re-establish connection</li>
          </ul>

          <h3>Sync Issues</h3>

          <h4>Changes not appearing for other users</h4>
          <ul>
            <li>Check WebSocket connection status</li>
            <li>Verify both users are on the same item</li>
            <li>Look for JavaScript errors in console</li>
            <li>Check server logs for WebSocket errors</li>
          </ul>

          <h4>Getting "conflict" errors</h4>
          <ul>
            <li>Verify collaborative editing extension is enabled</li>
            <li>Check that WebSocket connection is working</li>
            <li>May indicate extension misconfiguration</li>
          </ul>

          <h3>Need More Help?</h3>
          <p>Still having issues? Here's how to get help:</p>
          <ul>
            <li>Check the <a href="/docs/visual-editing">Visual Editing Guide</a></li>
            <li>
              Review <a
                href="https://github.com/directus-labs/collaborative-editing"
                target="_blank"
              >Directus Labs Collaborative Editing</a> docs
            </li>
            <li>Open browser DevTools and check Console and Network tabs</li>
            <li>Contact support at <a href="mailto:support@synthstack.ai">support@synthstack.ai</a></li>
          </ul>
        </section>
      </article>

      <!-- Footer Navigation -->
      <footer class="docs-footer">
        <router-link
          to="/docs/visual-editing"
          class="btn-secondary"
        >
          <q-icon name="arrow_back" />
          Visual Editing Guide
        </router-link>
        <router-link
          to="/docs"
          class="btn-primary"
        >
          Back to Docs
          <q-icon name="arrow_forward" />
        </router-link>
      </footer>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar'

useMeta({
  title: 'Collaborative Editing Guide - SynthStack AI',
  meta: {
    description: {
      name: 'description',
      content: 'Learn how to use real-time collaborative editing with smart field locking in Directus CMS.'
    }
  }
})
</script>

<style lang="scss" scoped>
.docs-page {
  background: var(--bg-base);
  min-height: 100vh;
}

.docs-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 80px 24px 120px;
}

.docs-header {
  margin-bottom: 48px;

  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 16px;

    a {
      color: var(--primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 16px;
    color: var(--text-primary);
  }

  .lead {
    font-size: 1.25rem;
    color: var(--text-secondary);
    margin: 0;
  }
}

.toc {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 48px;

  h2 {
    font-size: 0.875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    margin: 0 0 16px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      margin: 0;

      a {
        display: block;
        padding: 8px 0;
        color: var(--text-primary);
        text-decoration: none;
        transition: color 0.2s;

        &:hover {
          color: var(--primary);
        }
      }
    }
  }
}

.docs-content {
  section {
    margin-bottom: 48px;

    h2 {
      font-size: 1.875rem;
      font-weight: 700;
      margin: 0 0 24px;
      padding-top: 24px;
      border-top: 1px solid var(--border-default);
      color: var(--text-primary);

      &:first-of-type {
        border-top: none;
        padding-top: 0;
      }
    }

    h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 32px 0 16px;
      color: var(--text-primary);
    }

    h4 {
      font-size: 1.0625rem;
      font-weight: 600;
      margin: 24px 0 12px;
      color: var(--text-primary);
    }

    p {
      font-size: 1rem;
      line-height: 1.75;
      color: var(--text-secondary);
      margin: 0 0 16px;
    }

    ul, ol {
      margin: 0 0 16px;
      padding-left: 24px;
      color: var(--text-secondary);

      li {
        margin: 8px 0;
        line-height: 1.75;
      }
    }

    code {
      background: var(--bg-subtle);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.875rem;
      font-family: 'Courier New', monospace;
      color: var(--primary);
    }

    a {
      color: var(--primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 32px 0;
}

.feature {
  text-align: center;
  padding: 24px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: var(--primary);
  }

  h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 12px 0 8px;
    color: var(--text-primary);
  }

  p {
    font-size: 0.875rem;
    margin: 0;
    color: var(--text-secondary);
  }
}

.info-box {
  display: flex;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  margin: 24px 0;
  background: rgba(45, 156, 219, 0.1);
  border: 1px solid rgba(45, 156, 219, 0.3);

  strong {
    display: block;
    margin-bottom: 4px;
    color: var(--text-primary);
  }

  p {
    margin: 0;
    font-size: 0.9375rem;
  }
}

.behavior-table {
  margin: 24px 0;
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    overflow: hidden;

    thead {
      background: var(--bg-subtle);

      th {
        padding: 12px 16px;
        text-align: left;
        font-weight: 600;
        color: var(--text-primary);
        border-bottom: 1px solid var(--border-default);
      }
    }

    tbody {
      td {
        padding: 12px 16px;
        color: var(--text-secondary);
        border-bottom: 1px solid var(--border-default);
      }

      tr:last-child td {
        border-bottom: none;
      }

      tr:hover {
        background: var(--bg-subtle);
      }
    }
  }
}

.requirements {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;

  h4 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 12px;
    color: var(--text-primary);

    &:not(:first-child) {
      margin-top: 20px;
    }
  }

  ul {
    margin: 0;
    padding-left: 20px;

    li {
      margin: 6px 0;
      color: var(--text-secondary);
    }
  }
}

.docs-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-top: 48px;
  border-top: 1px solid var(--border-default);

  a {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s;
  }

  .btn-secondary {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    color: var(--text-primary);

    &:hover {
      background: var(--bg-subtle);
    }
  }

  .btn-primary {
    background: var(--primary);
    color: white;

    &:hover {
      background: var(--primary-hover);
    }
  }
}

@media (max-width: 768px) {
  .docs-container {
    padding: 60px 16px 80px;
  }

  .docs-header h1 {
    font-size: 2rem;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .docs-footer {
    flex-direction: column;

    a {
      justify-content: center;
    }
  }
}
</style>
