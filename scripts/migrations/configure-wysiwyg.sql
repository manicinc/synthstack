-- Configure body field to use WYSIWYG editor
UPDATE directus_fields
SET interface = 'input-rich-text-html',
    options = jsonb_set(
      COALESCE(options, '{}'::jsonb),
      '{toolbar}',
      '["bold", "italic", "underline", "h1", "h2", "h3", "numlist", "bullist", "link", "blockquote", "code", "hr"]'::jsonb
    )
WHERE collection = 'blog_posts' AND field = 'body';

-- Also configure title and summary for better editing
UPDATE directus_fields
SET interface = 'input'
WHERE collection = 'blog_posts' AND field IN ('title', 'summary');

-- Verify the changes
SELECT field, interface, options
FROM directus_fields
WHERE collection = 'blog_posts' AND field IN ('title', 'summary', 'body');
