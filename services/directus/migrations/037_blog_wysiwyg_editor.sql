-- Migration: 037_blog_wysiwyg_editor.sql
-- Description: Configure blog_posts.body field to use WYSIWYG editor with preview and formatting
-- This enhances the editor experience for content creators

-- Update the body field to use input-rich-text-html interface with full toolbar
UPDATE directus_fields
SET
  interface = 'input-rich-text-html',
  options = '{
    "toolbar": [
      "undo",
      "redo",
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "subscript",
      "superscript",
      "fontselect",
      "fontsizeselect",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "numlist",
      "bullist",
      "removeformat",
      "blockquote",
      "customLink",
      "unlink",
      "customImage",
      "customMedia",
      "table",
      "hr",
      "code",
      "fullscreen",
      "ltr rtl",
      "forecolor",
      "backcolor",
      "alignleft",
      "aligncenter",
      "alignright",
      "alignjustify",
      "indent",
      "outdent"
    ],
    "font": "sans-serif",
    "customFormats": [],
    "imageToken": null,
    "softLength": null,
    "trim": true
  }',
  display = 'formatted-value',
  display_options = '{"format": true}',
  note = 'Main content of the blog post. Use the toolbar for formatting, images, code blocks, etc.',
  width = 'full'
WHERE collection = 'blog_posts' AND field = 'body';

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
SELECT
  v.collection,
  v.field,
  v.special,
  v.interface,
  v.options::json,
  v.display,
  v.display_options::json,
  v.readonly,
  v.hidden,
  v.sort,
  v.width,
  v.translations::json,
  v.note,
  v.conditions::json,
  v.required,
  v."group",
  v.validation::json,
  v.validation_message
FROM (
  VALUES (
    'blog_posts',
    'body',
    NULL,
    'input-rich-text-html',
    '{
      "toolbar": [
        "undo",
        "redo",
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "subscript",
        "superscript",
        "fontselect",
        "fontsizeselect",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "numlist",
        "bullist",
        "removeformat",
        "blockquote",
        "customLink",
        "unlink",
        "customImage",
        "customMedia",
        "table",
        "hr",
        "code",
        "fullscreen",
        "ltr rtl",
        "forecolor",
        "backcolor",
        "alignleft",
        "aligncenter",
        "alignright",
        "alignjustify",
        "indent",
        "outdent"
      ],
      "font": "sans-serif",
      "customFormats": [],
      "imageToken": null,
      "softLength": null,
      "trim": true
    }',
    'formatted-value',
    '{"format": true}',
    false,
    false,
    10,
    'full',
    NULL,
    'Main content of the blog post. Use the toolbar for formatting, images, code blocks, etc.',
    NULL,
    false,
    NULL,
    NULL,
    NULL
  )
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- Also update the summary field for a nice textarea
UPDATE directus_fields
SET
  interface = 'input-multiline',
  options = '{
    "placeholder": "Brief summary of the blog post...",
    "softLength": 160,
    "trim": true
  }',
  note = 'Short summary for previews and SEO (aim for ~160 characters)',
  width = 'full'
WHERE collection = 'blog_posts' AND field = 'summary';

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
SELECT
  v.collection,
  v.field,
  v.special,
  v.interface,
  v.options::json,
  v.display,
  v.display_options::json,
  v.readonly,
  v.hidden,
  v.sort,
  v.width,
  v.translations::json,
  v.note,
  v.conditions::json,
  v.required,
  v."group",
  v.validation::json,
  v.validation_message
FROM (
  VALUES (
    'blog_posts',
    'summary',
    NULL,
    'input-multiline',
    '{
      "placeholder": "Brief summary of the blog post...",
      "softLength": 160,
      "trim": true
    }',
    NULL,
    NULL,
    false,
    false,
    5,
    'full',
    NULL,
    'Short summary for previews and SEO (aim for ~160 characters)',
    NULL,
    false,
    NULL,
    NULL,
    NULL
  )
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- Configure title field
UPDATE directus_fields
SET
  interface = 'input',
  options = '{
    "placeholder": "Enter blog post title...",
    "trim": true
  }',
  required = true
WHERE collection = 'blog_posts' AND field = 'title';

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
SELECT
  v.collection,
  v.field,
  v.special,
  v.interface,
  v.options::json,
  v.display,
  v.display_options::json,
  v.readonly,
  v.hidden,
  v.sort,
  v.width,
  v.translations::json,
  v.note,
  v.conditions::json,
  v.required,
  v."group",
  v.validation::json,
  v.validation_message
FROM (
  VALUES (
    'blog_posts',
    'title',
    NULL,
    'input',
    '{
      "placeholder": "Enter blog post title...",
      "trim": true
    }',
    NULL,
    NULL,
    false,
    false,
    1,
    'full',
    NULL,
    NULL,
    NULL,
    true,
    NULL,
    NULL,
    NULL
  )
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);
