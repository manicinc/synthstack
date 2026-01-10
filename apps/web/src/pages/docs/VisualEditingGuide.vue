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
          <span>Visual Editing Guide</span>
        </div>
        <h1>Visual Editing Guide</h1>
        <p class="lead">
          Learn how to edit your content directly on your website with Directus Visual Editor integration.
        </p>
      </header>

      <!-- Table of Contents -->
      <nav class="toc">
        <h2>On This Page</h2>
        <ul>
          <li><a href="#overview">Overview</a></li>
          <li><a href="#enabling">Enabling Visual Editing Mode</a></li>
          <li><a href="#editing">Editing Content</a></li>
          <li><a href="#edit-modes">Edit Modes</a></li>
          <li><a href="#best-practices">Best Practices</a></li>
          <li><a href="#troubleshooting">Troubleshooting</a></li>
        </ul>
      </nav>

      <!-- Content -->
      <article class="docs-content">
        <!-- Overview -->
        <section id="overview">
          <h2>Overview</h2>
          <p>
            Visual Editing allows you to edit content directly on your website without switching between
            the admin panel and preview. Changes are made in-context, giving you a true WYSIWYG experience.
          </p>

          <div class="info-box">
            <q-icon
              name="info"
              size="24px"
              color="primary"
            />
            <div>
              <strong>Enterprise Feature</strong>
              <p>Visual editing is available on all SynthStack plans and powered by Directus Visual Editor.</p>
            </div>
          </div>
        </section>

        <!-- Enabling Visual Editing -->
        <section id="enabling">
          <h2>Enabling Visual Editing Mode</h2>
          <p>
            Visual editing mode is activated by adding a query parameter to any page URL for security.
          </p>

          <h3>Step 1: Add Query Parameter</h3>
          <p>Add <code>?visual-editing=true</code> to any page URL:</p>
          <pre><code>https://yoursite.com/?visual-editing=true
https://yoursite.com/blog?visual-editing=true
https://yoursite.com/products/123?visual-editing=true</code></pre>

          <h3>Step 2: Access from Directus Admin</h3>
          <p>The easiest way is through the Directus admin panel:</p>
          <ol>
            <li>Go to <strong>Settings → Visual Editor</strong></li>
            <li>Add your website URLs (e.g., <code>http://localhost:5173</code>)</li>
            <li>Navigate to any collection item</li>
            <li>Click the <q-icon name="edit_note" /> <strong>Visual Editor</strong> button</li>
          </ol>

          <div class="warning-box">
            <q-icon
              name="warning"
              size="24px"
              color="warning"
            />
            <div>
              <strong>Authentication Required</strong>
              <p>You must be logged into Directus to use visual editing. The query parameter alone is not sufficient.</p>
            </div>
          </div>
        </section>

        <!-- Editing Content -->
        <section id="editing">
          <h2>Editing Content</h2>
          <p>
            Once in visual editing mode, editable elements will be highlighted when you hover over them.
          </p>

          <h3>Click to Edit</h3>
          <ol>
            <li>Hover over any editable element (text, images, etc.)</li>
            <li>Click the <q-icon name="edit" /> edit icon that appears</li>
            <li>Make your changes in the drawer, modal, or popover</li>
            <li>Click <strong>Save</strong> to apply changes</li>
          </ol>

          <h3>What Can Be Edited</h3>
          <ul>
            <li><strong>Text Content</strong> - Headings, paragraphs, labels</li>
            <li><strong>Rich Text</strong> - HTML content with formatting</li>
            <li><strong>Images</strong> - Upload new images or select from media library</li>
            <li><strong>SEO Metadata</strong> - Title, description, keywords</li>
            <li><strong>Custom Fields</strong> - Any field configured in your collection</li>
          </ul>
        </section>

        <!-- Edit Modes -->
        <section id="edit-modes">
          <h2>Edit Modes</h2>
          <p>
            Visual editing supports three different modes for editing content:
          </p>

          <div class="mode-grid">
            <div class="mode-card">
              <h3><q-icon name="space_dashboard" /> Drawer Mode</h3>
              <p>
                Opens a side drawer with the edit form. Best for editing multiple fields at once
                while still seeing the page context.
              </p>
              <p class="use-case">
                <strong>Use for:</strong> Complex forms, multiple fields, rich content
              </p>
            </div>

            <div class="mode-card">
              <h3><q-icon name="crop_square" /> Modal Mode</h3>
              <p>
                Opens a centered modal dialog. Provides a focused editing experience with
                minimal distractions.
              </p>
              <p class="use-case">
                <strong>Use for:</strong> Important content, focused editing, media uploads
              </p>
            </div>

            <div class="mode-card">
              <h3><q-icon name="comment" /> Popover Mode</h3>
              <p>
                Shows a small inline popover next to the element. Quick and lightweight
                for simple edits.
              </p>
              <p class="use-case">
                <strong>Use for:</strong> Single fields, short text, quick changes
              </p>
            </div>
          </div>
        </section>

        <!-- Best Practices -->
        <section id="best-practices">
          <h2>Best Practices</h2>

          <h3>1. Use Appropriate Edit Modes</h3>
          <ul>
            <li>Use <strong>popover</strong> for single field edits (titles, labels)</li>
            <li>Use <strong>drawer</strong> for multi-field content (blog posts, product descriptions)</li>
            <li>Use <strong>modal</strong> for focused tasks (image uploads, critical content)</li>
          </ul>

          <h3>2. Group Related Fields</h3>
          <p>
            When marking multiple fields on the same element, group them logically:
          </p>
          <pre v-pre><code>&lt;!-- Good: Group related fields --&gt;
&lt;div data-directus="collection:pages,item:123,fields:content,excerpt"&gt;
  &lt;p&gt;{{ excerpt }}&lt;/p&gt;
  &lt;div v-html="content" /&gt;
&lt;/div&gt;</code></pre>

          <h3>3. Provide Visual Feedback</h3>
          <p>
            Make it obvious what content is editable by using hover states and clear boundaries
            around editable regions.
          </p>

          <h3>4. Test in Both Modes</h3>
          <p>
            Always test your site in both normal mode and visual editing mode to ensure
            nothing breaks with the added data attributes.
          </p>
        </section>

        <!-- Troubleshooting -->
        <section id="troubleshooting">
          <h2>Troubleshooting</h2>

          <h3>Visual editing not working</h3>
          <ul>
            <li>Ensure you're logged into Directus</li>
            <li>Check that <code>?visual-editing=true</code> is in the URL</li>
            <li>Verify your site URL is configured in Settings → Visual Editor</li>
            <li>Check browser console for errors</li>
          </ul>

          <h3>Edit icons not appearing</h3>
          <ul>
            <li>Verify <code>data-directus</code> attributes are correctly formatted</li>
            <li>Check that the collection and item IDs are valid</li>
            <li>Ensure fields exist in the Directus collection</li>
            <li>Look for CSP (Content Security Policy) errors in console</li>
          </ul>

          <h3>Changes not saving</h3>
          <ul>
            <li>Check your user has edit permissions for the collection</li>
            <li>Verify the API connection is working</li>
            <li>Look for validation errors in the form</li>
            <li>Check browser network tab for failed requests</li>
          </ul>

          <h3>Need More Help?</h3>
          <p>
            If you're still experiencing issues:
          </p>
          <ul>
            <li>Check the <a href="/docs/collaborative-editing">Collaborative Editing Guide</a></li>
            <li>
              Review the <a
                href="https://docs.directus.io/guides/visual-editing.html"
                target="_blank"
              >Directus Visual Editor Docs</a>
            </li>
            <li>Contact support at <a href="mailto:support@synthstack.ai">support@synthstack.ai</a></li>
          </ul>
        </section>
      </article>

      <!-- Footer Navigation -->
      <footer class="docs-footer">
        <router-link
          to="/docs"
          class="btn-secondary"
        >
          <q-icon name="arrow_back" />
          Back to Docs
        </router-link>
        <router-link
          to="/docs/collaborative-editing"
          class="btn-primary"
        >
          Collaborative Editing Guide
          <q-icon name="arrow_forward" />
        </router-link>
      </footer>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar'

useMeta({
  title: 'Visual Editing Guide - SynthStack AI',
  meta: {
    description: {
      name: 'description',
      content: 'Learn how to use visual in-place editing to edit content directly on your website with Directus integration.'
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

    pre {
      background: var(--bg-subtle);
      border: 1px solid var(--border-default);
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      margin: 16px 0;

      code {
        background: none;
        padding: 0;
        color: var(--text-primary);
        font-size: 0.875rem;
        line-height: 1.6;
      }
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

.info-box, .warning-box {
  display: flex;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  margin: 24px 0;

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

.info-box {
  background: rgba(45, 156, 219, 0.1);
  border: 1px solid rgba(45, 156, 219, 0.3);
}

.warning-box {
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin: 24px 0;
}

.mode-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: var(--primary);
  }

  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.125rem;
    margin: 0 0 12px;
    color: var(--text-primary);
  }

  p {
    font-size: 0.9375rem;
    margin: 0 0 12px;
    color: var(--text-secondary);
  }

  .use-case {
    font-size: 0.875rem;
    color: var(--primary);
    margin: 0;
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

  .mode-grid {
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
