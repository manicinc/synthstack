# Visual Editing Setup Guide

This document explains how to properly set up Directus collections and configure visual editing for all content types in SynthStack.

## Overview

Visual editing is now enabled on all major content pages:
- **Blog Posts** - Title, summary, and body content
- **Landing Page** - Hero text, features, marketing content
- **Documentation Pages** - All doc content
- **Guide Pages** - Tutorials and how-to content
- **Marketing Pages** - About, Company, Careers, etc.

## Required Directus Collections

### 1. Posts Collection

Create a `posts` collection with these fields:

```typescript
{
  id: string (UUID, primary key)
  slug: string (unique, for URLs)
  title: string
  summary: string (excerpt/description)
  body: text (markdown or HTML)
  seo_title: string
  seo_description: string
  seo_keywords: array of strings
  published_at: datetime
  read_time: integer (minutes)
  category_id: UUID (relation to categories)
  author_id: UUID (relation to directus_users)
  status: string (draft/published/archived)
  created_at: datetime (auto)
  updated_at: datetime (auto)
}
```

### 2. Pages Collection (for Landing/Marketing pages)

Create a `pages` collection:

```typescript
{
  id: string (UUID, primary key)
  slug: string (unique, e.g., "home", "about")
  title: string
  hero_title: string
  hero_subtitle: text
  hero_cta_text: string
  hero_cta_url: string
  sections: JSON (array of content sections)
  seo_title: string
  seo_description: string
  status: string (draft/published)
  created_at: datetime
  updated_at: datetime
}
```

### 3. Guides Collection

Create a `guides` collection:

```typescript
{
  id: string (UUID, primary key)
  slug: string (unique)
  title: string
  summary: string
  content: text (markdown)
  difficulty: string (beginner/intermediate/advanced)
  estimated_time: integer (minutes)
  tags: array of strings
  category: string
  status: string
  created_at: datetime
  updated_at: datetime
}
```

### 4. Documentation Collection

Create a `docs` collection:

```typescript
{
  id: string (UUID, primary key)
  slug: string (unique)
  title: string
  content: text (markdown)
  category: string
  order: integer (for sorting)
  status: string
  created_at: datetime
  updated_at: datetime
}
```

## Visual Editing Implementation

### Current Implementation

All content pages now use the `useVisualEditing` composable:

```typescript
import { useVisualEditing } from '@/composables/useVisualEditing'

const { editableAttr } = useVisualEditing()
```

### Adding Visual Editing to Elements

```vue
<template>
  <!-- Single field with popover (for short text) -->
  <h1
    :data-directus="editableAttr({
      collection: 'posts',
      item: post.id,
      fields: 'title',
      mode: 'popover'
    })"
  >
    {{ post.title }}
  </h1>

  <!-- Multiple fields with drawer (for long content) -->
  <div
    :data-directus="editableAttr({
      collection: 'posts',
      item: post.id,
      fields: ['body', 'summary'],
      mode: 'drawer'
    })"
    v-html="renderedContent"
  />

  <!-- Modal mode for focused editing -->
  <section
    :data-directus="editableAttr({
      collection: 'pages',
      item: pageId,
      fields: 'sections',
      mode: 'modal'
    })"
  >
    <!-- Complex section content -->
  </section>
</template>
```

### Edit Modes

| Mode | Use Case | Best For |
|------|----------|----------|
| `popover` | Quick edits, single field | Titles, labels, short text |
| `drawer` | Multi-field editing | Blog posts, long content, multiple fields |
| `modal` | Focused editing session | Images, complex forms, critical content |

## Pages with Visual Editing Enabled

### ✅ Currently Implemented

1. **BlogPostPage** (`/blog/:slug`)
   - Title (popover)
   - Summary (popover)
   - Body content (drawer)

### 🔲 To Be Implemented

2. **LandingPage** (`/`)
   - Hero title
   - Hero subtitle
   - Feature cards
   - Tech stack list

3. **AboutPage** (`/about`)
   - Company description
   - Team information
   - Mission statement

4. **GuidesPage** (`/guides/:slug`)
   - Guide title
   - Content sections
   - Code examples

5. **DocsPage** (`/docs/:slug`)
   - Documentation title
   - Content body
   - Navigation structure

## Directus Configuration Steps

### 1. Enable Visual Editor Module

```bash
# In Directus admin panel:
# 1. Go to Settings → Module Bar
# 2. Toggle ON "Visual Editor"
```

### 2. Add Website URLs

```bash
# In Directus admin panel:
# 1. Go to Settings → Visual Editor
# 2. Add URLs:
#    - http://localhost:5173?visual-editing=true
#    - http://localhost:3050?visual-editing=true
#    - https://yourproduction.com?visual-editing=true
```

### 3. Configure Permissions

```bash
# In Directus admin panel:
# 1. Go to Settings → Roles & Permissions
# 2. For each collection (posts, pages, guides, docs):
#    - Enable READ permission (public or authenticated)
#    - Enable UPDATE permission for editors
```

### 4. Enable Content Versioning (Optional)

```bash
# In Directus admin panel:
# For each collection:
# 1. Go to Settings → Data Model → [Collection]
# 2. Enable "Content Versioning"
# 3. Or add M2A relationship to directus_revisions
```

## Testing Visual Editing

### 1. Start Development Environment

```bash
# Terminal 1: Start Directus
docker compose up directus

# Terminal 2: Start Frontend
cd apps/web
pnpm dev
```

### 2. Access Visual Editing Mode

```
http://localhost:5173/blog/your-post-slug?visual-editing=true
```

### 3. Verify Features

- [ ] Hover over title shows edit icon
- [ ] Click edit icon opens drawer/modal/popover
- [ ] Make changes and save
- [ ] Changes reflect on page
- [ ] No console errors

## Best Practices

### 1. Use Appropriate Modes

```typescript
// ✅ Good
editableAttr({ collection: 'posts', item: id, fields: 'title', mode: 'popover' })

// ❌ Avoid
editableAttr({ collection: 'posts', item: id, fields: 'title', mode: 'drawer' })
// (Using drawer for single short field is overkill)
```

### 2. Group Related Fields

```typescript
// ✅ Good - Group related fields
editableAttr({
  collection: 'posts',
  item: id,
  fields: ['body', 'summary', 'excerpt'],
  mode: 'drawer'
})

// ❌ Avoid - Separate attributes for related fields
<div :data-directus="editableAttr({ fields: 'body' })">...</div>
<div :data-directus="editableAttr({ fields: 'summary' })">...</div>
```

### 3. Always Provide Item ID

```typescript
// ✅ Good
editableAttr({ collection: 'posts', item: post.id, fields: 'title' })

// ❌ Wrong - No item ID
editableAttr({ collection: 'posts', fields: 'title' })
```

### 4. Use Semantic Field Names

```typescript
// ✅ Good - Matches Directus field name
fields: 'seo_title'

// ❌ Wrong - Doesn't match
fields: 'seoTitle'  // (camelCase won't work with snake_case DB)
```

## Troubleshooting

### Visual editing not showing edit icons

1. **Check query parameter**: Ensure `?visual-editing=true` is in URL
2. **Check login status**: You must be logged into Directus
3. **Check URL configuration**: Verify site URL in Settings → Visual Editor
4. **Check browser console**: Look for CSP or connection errors

### Edit icons showing but not working

1. **Check permissions**: User must have UPDATE permission for collection
2. **Check field names**: Must match exactly with Directus schema
3. **Check item ID**: Ensure item exists in Directus with that ID
4. **Check collection name**: Must match Directus collection name exactly

### Changes not saving

1. **Check validation**: Look for validation errors in form
2. **Check permissions**: User must have UPDATE permission
3. **Check network**: Look for failed API requests in Network tab
4. **Check webhooks**: Ensure no blocking webhooks

### CSP Errors

```
Refused to frame 'http://localhost:8099' because it violates the following
Content Security Policy directive: "frame-src 'self'"
```

**Solution**: Verify `CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC` in docker-compose.yml includes your frontend URL

## Migration Guide

### Adding Visual Editing to Existing Pages

1. **Import the composable**:
```typescript
import { useVisualEditing } from '@/composables/useVisualEditing'
const { editableAttr } = useVisualEditing()
```

2. **Add data-directus attributes**:
```vue
<h1 :data-directus="editableAttr({ collection: 'posts', item: post.id, fields: 'title', mode: 'popover' })">
  {{ post.title }}
</h1>
```

3. **Test in visual editing mode**:
```
http://localhost:5173/your-page?visual-editing=true
```

## Next Steps

1. Create Directus collections (posts, pages, guides, docs)
2. Seed with sample content
3. Configure permissions for editors
4. Add visual editing attributes to remaining pages
5. Test visual editing on all content types
6. Enable content versioning for important collections
7. Train content editors on visual editing features

## Resources

- [Directus Visual Editor Docs](https://docs.directus.io/guides/visual-editing.html)
- [Visual Editing Guide](/docs/visual-editing)
- [Collaborative Editing Guide](/docs/collaborative-editing)
- [DIRECTUS_FEATURES.md](./DIRECTUS_FEATURES.md)
