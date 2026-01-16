-- ============================================
-- Migration 077: AgencyOS Content Blocks
-- ============================================
-- Creates 17 reusable content block types for proposals and pages
-- Includes hero, CTA, FAQ, gallery, steps, testimonials, etc.
-- ============================================

-- ============================================
-- Simple Content Blocks
-- ============================================

-- Block Divider (Simple separator)
CREATE TABLE IF NOT EXISTS block_divider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255)
);

INSERT INTO directus_collections (collection, icon, note, color, hidden) VALUES
('block_divider', 'horizontal_rule', 'Horizontal divider', '#94A3B8', false)
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('block_divider', 'id', 'uuid', 'input', NULL),
('block_divider', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Block Rich Text
CREATE TABLE IF NOT EXISTS block_richtext (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  headline VARCHAR(500),
  content TEXT,
  alignment VARCHAR(50) DEFAULT 'left' CHECK (alignment IN ('left', 'center'))
);

INSERT INTO directus_collections (collection, icon, note, color, display_template) VALUES
('block_richtext', 'format_align_left', 'Rich text content', '#3B82F6', '{{title}}')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options, note) VALUES
('block_richtext', 'id', 'uuid', 'input', NULL, NULL),
('block_richtext', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb, NULL),
('block_richtext', 'headline', NULL, 'input', '{"placeholder":"Heading"}'::jsonb, NULL),
('block_richtext', 'content', NULL, 'input-rich-text-md', NULL, 'Main content'),
('block_richtext', 'alignment', NULL, 'select-dropdown', '{"choices":[{"text":"Left","value":"left"},{"text":"Center","value":"center"}]}'::jsonb, NULL)
ON CONFLICT DO NOTHING;

-- Block HTML (Raw HTML)
CREATE TABLE IF NOT EXISTS block_html (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_html TEXT
);

INSERT INTO directus_collections (collection, icon, note, color) VALUES
('block_html', 'code', 'Raw HTML block', '#F59E0B')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('block_html', 'id', 'uuid', 'input', NULL),
('block_html', 'raw_html', NULL, 'input-code', '{"language":"html"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Block Team
CREATE TABLE IF NOT EXISTS block_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  headline VARCHAR(500),
  content TEXT
);

INSERT INTO directus_collections (collection, icon, note, color) VALUES
('block_team', 'groups', 'Team section', '#8B5CF6')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('block_team', 'id', 'uuid', 'input', NULL),
('block_team', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb),
('block_team', 'headline', NULL, 'input', '{"placeholder":"Heading"}'::jsonb),
('block_team', 'content', NULL, 'input-rich-text-md', NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- Blocks with Images
-- ============================================

-- Block Hero
CREATE TABLE IF NOT EXISTS block_hero (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  headline VARCHAR(500),
  content TEXT,
  image UUID REFERENCES directus_files(id),
  image_position VARCHAR(50) DEFAULT 'left' CHECK (image_position IN ('left', 'right')),
  button_group UUID REFERENCES block_button_group(id) ON DELETE SET NULL
);

INSERT INTO directus_collections (collection, icon, note, color, display_template) VALUES
('block_hero', 'view_carousel', 'Hero section', '#EF4444', '{{title}}')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options, note) VALUES
('block_hero', 'id', 'uuid', 'input', NULL, NULL),
('block_hero', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb, NULL),
('block_hero', 'headline', NULL, 'input', '{"placeholder":"Main headline"}'::jsonb, NULL),
('block_hero', 'content', NULL, 'input-rich-text-md', NULL, NULL),
('block_hero', 'image', 'file', 'file-image', NULL, 'Hero image'),
('block_hero', 'image_position', NULL, 'select-dropdown', '{"choices":[{"text":"Left","value":"left"},{"text":"Right","value":"right"}]}'::jsonb, NULL),
('block_hero', 'button_group', 'm2o', 'select-dropdown-m2o', '{"template":"{{id}}"}'::jsonb, 'Call-to-action buttons')
ON CONFLICT DO NOTHING;

-- Block Quote
CREATE TABLE IF NOT EXISTS block_quote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  headline VARCHAR(500),
  subtitle VARCHAR(500),
  content TEXT,
  image UUID REFERENCES directus_files(id),
  background_color VARCHAR(50)
);

INSERT INTO directus_collections (collection, icon, note, color) VALUES
('block_quote', 'format_quote', 'Quote block', '#EC4899')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('block_quote', 'id', 'uuid', 'input', NULL),
('block_quote', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb),
('block_quote', 'headline', NULL, 'input', '{"placeholder":"Quote"}'::jsonb),
('block_quote', 'subtitle', NULL, 'input', '{"placeholder":"Attribution"}'::jsonb),
('block_quote', 'content', NULL, 'input-multiline', NULL),
('block_quote', 'image', 'file', 'file-image', NULL),
('block_quote', 'background_color', NULL, 'select-color', NULL)
ON CONFLICT DO NOTHING;

-- Block Video
CREATE TABLE IF NOT EXISTS block_video (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  headline VARCHAR(500),
  type VARCHAR(50), -- 'file', 'youtube', 'vimeo'
  video_file UUID REFERENCES directus_files(id),
  video_url TEXT
);

INSERT INTO directus_collections (collection, icon, note, color) VALUES
('block_video', 'videocam', 'Video block', '#10B981')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options, note) VALUES
('block_video', 'id', 'uuid', 'input', NULL, NULL),
('block_video', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb, NULL),
('block_video', 'headline', NULL, 'input', '{"placeholder":"Heading"}'::jsonb, NULL),
('block_video', 'type', NULL, 'select-dropdown', '{"choices":[{"text":"File","value":"file"},{"text":"YouTube","value":"youtube"},{"text":"Vimeo","value":"vimeo"}]}'::jsonb, NULL),
('block_video', 'video_file', 'file', 'file', NULL, 'Upload video file'),
('block_video', 'video_url', NULL, 'input', '{"placeholder":"https://youtube.com/..."}'::jsonb, 'YouTube or Vimeo URL')
ON CONFLICT DO NOTHING;

-- ============================================
-- Blocks with CTAs
-- ============================================

-- Block CTA (Call to Action)
CREATE TABLE IF NOT EXISTS block_cta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  headline VARCHAR(500),
  content TEXT,
  button_group UUID REFERENCES block_button_group(id) ON DELETE SET NULL,
  buttons JSONB
);

INSERT INTO directus_collections (collection, icon, note, color) VALUES
('block_cta', 'touch_app', 'Call-to-action', '#F59E0B')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('block_cta', 'id', 'uuid', 'input', NULL),
('block_cta', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb),
('block_cta', 'headline', NULL, 'input', '{"placeholder":"Heading"}'::jsonb),
('block_cta', 'content', NULL, 'input-rich-text-md', NULL),
('block_cta', 'button_group', 'm2o', 'select-dropdown-m2o', '{"template":"{{id}}"}'::jsonb),
('block_cta', 'buttons', 'cast-json', 'input-code', '{"language":"json"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Block Form
CREATE TABLE IF NOT EXISTS block_form (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  headline VARCHAR(500),
  form VARCHAR(255) -- Form identifier
);

INSERT INTO directus_collections (collection, icon, note, color) VALUES
('block_form', 'assignment', 'Form block', '#3B82F6')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('block_form', 'id', 'uuid', 'input', NULL),
('block_form', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb),
('block_form', 'headline', NULL, 'input', '{"placeholder":"Heading"}'::jsonb),
('block_form', 'form', NULL, 'input', '{"placeholder":"contact, quote, etc."}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================
-- Blocks with Child Items
-- ============================================

-- Block FAQ
CREATE TABLE IF NOT EXISTS block_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  headline VARCHAR(500),
  alignment VARCHAR(50) DEFAULT 'left' CHECK (alignment IN ('left', 'center')),
  faqs JSONB -- Array of {title, answer}
);

INSERT INTO directus_collections (collection, icon, note, color) VALUES
('block_faq', 'help_outline', 'FAQ block', '#8B5CF6')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options, note) VALUES
('block_faq', 'id', 'uuid', 'input', NULL, NULL),
('block_faq', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb, NULL),
('block_faq', 'headline', NULL, 'input', '{"placeholder":"Heading"}'::jsonb, NULL),
('block_faq', 'alignment', NULL, 'select-dropdown', '{"choices":[{"text":"Left","value":"left"},{"text":"Center","value":"center"}]}'::jsonb, NULL),
('block_faq', 'faqs', 'cast-json', 'input-code', '{"language":"json"}'::jsonb, 'Array of {title, answer}')
ON CONFLICT DO NOTHING;

-- Block Gallery with Junction Table
CREATE TABLE IF NOT EXISTS block_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  headline VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS block_gallery_files (
  id SERIAL PRIMARY KEY,
  block_gallery_id UUID REFERENCES block_gallery(id) ON DELETE CASCADE,
  directus_files_id UUID REFERENCES directus_files(id) ON DELETE CASCADE,
  sort INTEGER DEFAULT 0,

  UNIQUE (block_gallery_id, directus_files_id)
);

INSERT INTO directus_collections (collection, icon, note, color) VALUES
('block_gallery', 'photo_library', 'Image gallery', '#10B981')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options, note) VALUES
('block_gallery', 'id', 'uuid', 'input', NULL, NULL),
('block_gallery', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb, NULL),
('block_gallery', 'headline', NULL, 'input', '{"placeholder":"Heading"}'::jsonb, NULL),
('block_gallery', 'gallery_items', 'o2m', 'list-o2m', '{"template":"Image"}'::jsonb, 'Gallery images')
ON CONFLICT DO NOTHING;

INSERT INTO directus_collections (collection, icon, note, hidden) VALUES
('block_gallery_files', 'link', 'Gallery files junction', true)
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('block_gallery_files', 'id', NULL, 'input', NULL),
('block_gallery_files', 'block_gallery_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{title}}"}'::jsonb),
('block_gallery_files', 'directus_files_id', 'file', 'file-image', NULL),
('block_gallery_files', 'sort', NULL, 'input', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, junction_field) VALUES
('block_gallery_files', 'block_gallery_id', 'block_gallery', 'gallery_items', 'directus_files_id')
ON CONFLICT DO NOTHING;

-- Block Logo Cloud with Junction Table
CREATE TABLE IF NOT EXISTS block_logocloud (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  headline VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS block_logocloud_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_logocloud_id UUID REFERENCES block_logocloud(id) ON DELETE CASCADE,
  directus_files_id UUID REFERENCES directus_files(id) ON DELETE CASCADE,
  sort INTEGER DEFAULT 0,

  UNIQUE (block_logocloud_id, directus_files_id)
);

INSERT INTO directus_collections (collection, icon, note, color) VALUES
('block_logocloud', 'apps', 'Logo cloud', '#EC4899')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options, note) VALUES
('block_logocloud', 'id', 'uuid', 'input', NULL, NULL),
('block_logocloud', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb, NULL),
('block_logocloud', 'headline', NULL, 'input', '{"placeholder":"Heading"}'::jsonb, NULL),
('block_logocloud', 'logos', 'o2m', 'list-o2m', '{"template":"Logo"}'::jsonb, 'Client logos')
ON CONFLICT DO NOTHING;

INSERT INTO directus_collections (collection, icon, note, hidden) VALUES
('block_logocloud_files', 'link', 'Logo cloud files junction', true)
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('block_logocloud_files', 'id', 'uuid', 'input', NULL),
('block_logocloud_files', 'block_logocloud_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{title}}"}'::jsonb),
('block_logocloud_files', 'directus_files_id', 'file', 'file-image', NULL),
('block_logocloud_files', 'sort', NULL, 'input', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, junction_field) VALUES
('block_logocloud_files', 'block_logocloud_id', 'block_logocloud', 'logos', 'directus_files_id')
ON CONFLICT DO NOTHING;

-- Block Steps with Child Items
CREATE TABLE IF NOT EXISTS block_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  headline VARCHAR(500),
  alternate_image_position BOOLEAN DEFAULT false,
  show_step_numbers BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS block_steps_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_steps_id UUID REFERENCES block_steps(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT,
  image UUID REFERENCES directus_files(id),
  sort INTEGER DEFAULT 0,
  button_group UUID REFERENCES block_button_group(id) ON DELETE SET NULL
);

INSERT INTO directus_collections (collection, icon, note, color) VALUES
('block_steps', 'format_list_numbered', 'Steps/Process block', '#3B82F6')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options, note) VALUES
('block_steps', 'id', 'uuid', 'input', NULL, NULL),
('block_steps', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb, NULL),
('block_steps', 'headline', NULL, 'input', '{"placeholder":"Heading"}'::jsonb, NULL),
('block_steps', 'alternate_image_position', 'cast-boolean', 'boolean', NULL, 'Alternate left/right'),
('block_steps', 'show_step_numbers', 'cast-boolean', 'boolean', NULL, 'Show step numbers'),
('block_steps', 'steps', 'o2m', 'list-o2m', '{"template":"{{title}}"}'::jsonb, 'Process steps')
ON CONFLICT DO NOTHING;

INSERT INTO directus_collections (collection, icon, note, hidden) VALUES
('block_steps_items', 'list', 'Step items', true)
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('block_steps_items', 'id', 'uuid', 'input', NULL),
('block_steps_items', 'block_steps_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{title}}"}'::jsonb),
('block_steps_items', 'title', NULL, 'input', '{"placeholder":"Step title"}'::jsonb),
('block_steps_items', 'content', NULL, 'input-rich-text-md', NULL),
('block_steps_items', 'image', 'file', 'file-image', NULL),
('block_steps_items', 'sort', NULL, 'input', NULL),
('block_steps_items', 'button_group', 'm2o', 'select-dropdown-m2o', '{"template":"{{id}}"}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES
('block_steps_items', 'block_steps_id', 'block_steps', 'steps')
ON CONFLICT DO NOTHING;

-- Block Columns with Child Rows
CREATE TABLE IF NOT EXISTS block_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  headline VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS block_column_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_columns_id UUID REFERENCES block_columns(id) ON DELETE CASCADE,
  title VARCHAR(255),
  headline VARCHAR(500),
  content TEXT,
  image UUID REFERENCES directus_files(id),
  image_position VARCHAR(50),
  button_group UUID REFERENCES block_button_group(id) ON DELETE SET NULL
);

INSERT INTO directus_collections (collection, icon, note, color) VALUES
('block_columns', 'view_column', 'Columns block', '#8B5CF6')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options, note) VALUES
('block_columns', 'id', 'uuid', 'input', NULL, NULL),
('block_columns', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb, NULL),
('block_columns', 'headline', NULL, 'input', '{"placeholder":"Heading"}'::jsonb, NULL),
('block_columns', 'rows', 'o2m', 'list-o2m', '{"template":"{{title}}"}'::jsonb, 'Column items')
ON CONFLICT DO NOTHING;

INSERT INTO directus_collections (collection, icon, note, hidden) VALUES
('block_column_rows', 'view_agenda', 'Column rows', true)
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('block_column_rows', 'id', 'uuid', 'input', NULL),
('block_column_rows', 'block_columns_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{title}}"}'::jsonb),
('block_column_rows', 'title', NULL, 'input', '{"placeholder":"Row title"}'::jsonb),
('block_column_rows', 'headline', NULL, 'input', '{"placeholder":"Heading"}'::jsonb),
('block_column_rows', 'content', NULL, 'input-rich-text-md', NULL),
('block_column_rows', 'image', 'file', 'file-image', NULL),
('block_column_rows', 'image_position', NULL, 'select-dropdown', '{"choices":[{"text":"Left","value":"left"},{"text":"Right","value":"right"},{"text":"Top","value":"top"}]}'::jsonb),
('block_column_rows', 'button_group', 'm2o', 'select-dropdown-m2o', '{"template":"{{id}}"}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES
('block_column_rows', 'block_columns_id', 'block_columns', 'rows')
ON CONFLICT DO NOTHING;

-- Block Testimonial (Note: references external testimonials collection)
CREATE TABLE IF NOT EXISTS block_testimonials_slider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  headline VARCHAR(500)
);

INSERT INTO directus_collections (collection, icon, note, color) VALUES
('block_testimonials_slider', 'format_quote', 'Testimonials slider', '#F59E0B')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options, note) VALUES
('block_testimonials_slider', 'id', 'uuid', 'input', NULL, NULL),
('block_testimonials_slider', 'title', NULL, 'input', '{"placeholder":"Internal title"}'::jsonb, NULL),
('block_testimonials_slider', 'headline', NULL, 'input', '{"placeholder":"Heading"}'::jsonb, NULL),
('block_testimonials_slider', 'testimonials', 'o2m', 'list-o2m', '{"template":"Testimonial"}'::jsonb, 'Selected testimonials')
ON CONFLICT DO NOTHING;

-- ============================================
-- Button System (for CTAs)
-- ============================================

-- Block Button Group
CREATE TABLE IF NOT EXISTS block_button_group (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alignment VARCHAR(50) DEFAULT 'left' CHECK (alignment IN ('left', 'center'))
);

INSERT INTO directus_collections (collection, icon, note, color, hidden) VALUES
('block_button_group', 'smart_button', 'Button groups', '#3B82F6', true)
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options, note) VALUES
('block_button_group', 'id', 'uuid', 'input', NULL, NULL),
('block_button_group', 'alignment', NULL, 'select-dropdown', '{"choices":[{"text":"Left","value":"left"},{"text":"Center","value":"center"}]}'::jsonb, NULL),
('block_button_group', 'buttons', 'o2m', 'list-o2m', '{"template":"{{label}}"}'::jsonb, 'Buttons')
ON CONFLICT DO NOTHING;

-- Block Button
CREATE TABLE IF NOT EXISTS block_button (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_button_group_id UUID REFERENCES block_button_group(id) ON DELETE CASCADE,
  sort INTEGER DEFAULT 0,
  type VARCHAR(50) CHECK (type IN ('pages', 'posts', 'external')),
  label VARCHAR(255),
  color VARCHAR(50) DEFAULT 'primary' CHECK (color IN ('primary', 'white', 'gray', 'black')),
  variant VARCHAR(50) DEFAULT 'solid' CHECK (variant IN ('solid', 'outline', 'ghost', 'link', 'soft')),
  page VARCHAR(255), -- Reference to pages if exists
  post VARCHAR(255), -- Reference to posts if exists
  external_url TEXT,
  icon VARCHAR(100)
);

INSERT INTO directus_collections (collection, icon, note, color, hidden) VALUES
('block_button', 'radio_button_checked', 'Buttons', '#10B981', true)
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, options, note) VALUES
('block_button', 'id', 'uuid', 'input', NULL, NULL),
('block_button', 'block_button_group_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{id}}"}'::jsonb, NULL),
('block_button', 'sort', NULL, 'input', NULL, NULL),
('block_button', 'type', NULL, 'select-dropdown', '{"choices":[{"text":"Page","value":"pages"},{"text":"Post","value":"posts"},{"text":"External","value":"external"}]}'::jsonb, NULL),
('block_button', 'label', NULL, 'input', '{"placeholder":"Button text"}'::jsonb, NULL),
('block_button', 'color', NULL, 'select-dropdown', '{"choices":[{"text":"Primary","value":"primary"},{"text":"White","value":"white"},{"text":"Gray","value":"gray"},{"text":"Black","value":"black"}]}'::jsonb, NULL),
('block_button', 'variant', NULL, 'select-dropdown', '{"choices":[{"text":"Solid","value":"solid"},{"text":"Outline","value":"outline"},{"text":"Ghost","value":"ghost"},{"text":"Link","value":"link"},{"text":"Soft","value":"soft"}]}'::jsonb, NULL),
('block_button', 'page', NULL, 'input', '{"placeholder":"Page reference"}'::jsonb, NULL),
('block_button', 'post', NULL, 'input', '{"placeholder":"Post reference"}'::jsonb, NULL),
('block_button', 'external_url', NULL, 'input', '{"placeholder":"https://..."}'::jsonb, NULL),
('block_button', 'icon', NULL, 'select-icon', NULL, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES
('block_button', 'block_button_group_id', 'block_button_group', 'buttons')
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 077: AgencyOS Content Blocks completed successfully';
  RAISE NOTICE '   Created 17 block types:';
  RAISE NOTICE '   - Simple: divider, richtext, html, team';
  RAISE NOTICE '   - With images: hero, quote, video';
  RAISE NOTICE '   - CTAs: cta, form';
  RAISE NOTICE '   - Collections: faq, gallery, logocloud, steps, columns, testimonials';
  RAISE NOTICE '   - Supporting: button_group, button';
END $$;
