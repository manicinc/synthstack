-- Migration: 065_content_blocks.sql
-- Description: Content block types for proposals and page builder
-- Dependencies: 064_proposal_blocks.sql

-- =============================================================================
-- BLOCK: RICH TEXT
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_richtext (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  content TEXT,
  alignment VARCHAR(20) DEFAULT 'left' CHECK (alignment IN ('left', 'center', 'right')),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- =============================================================================
-- BLOCK: PRICING TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  subtitle TEXT,

  -- Pricing items as JSONB array
  -- Each item: { name, description, quantity, unit, unit_price, total, is_optional }
  items JSONB DEFAULT '[]'::jsonb,

  -- Display options
  show_subtotal BOOLEAN DEFAULT true,
  show_tax BOOLEAN DEFAULT false,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  show_total BOOLEAN DEFAULT true,

  -- Currency
  currency VARCHAR(3) DEFAULT 'USD',

  -- Notes
  footer_note TEXT,

  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- =============================================================================
-- BLOCK: TEAM MEMBERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) DEFAULT 'Our Team',
  subtitle TEXT,

  -- Team members as JSONB array
  -- Each member: { name, role, bio, image_url, linkedin_url }
  team_members JSONB DEFAULT '[]'::jsonb,

  -- Layout
  columns INTEGER DEFAULT 3 CHECK (columns BETWEEN 1 AND 4),

  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- =============================================================================
-- BLOCK: FAQ / ACCORDION
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) DEFAULT 'Frequently Asked Questions',
  subtitle TEXT,

  -- FAQ items as JSONB array
  -- Each item: { question, answer }
  items JSONB DEFAULT '[]'::jsonb,

  -- Display options
  allow_multiple_open BOOLEAN DEFAULT false,
  first_open BOOLEAN DEFAULT true,

  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- =============================================================================
-- BLOCK: HERO SECTION
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_hero (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline VARCHAR(500),
  subheadline TEXT,

  -- Background
  background_image UUID REFERENCES directus_files(id),
  background_color VARCHAR(20),
  overlay_opacity DECIMAL(3,2) DEFAULT 0.5,

  -- CTA buttons as JSONB array
  -- Each button: { text, url, style }
  buttons JSONB DEFAULT '[]'::jsonb,

  -- Layout
  alignment VARCHAR(20) DEFAULT 'center' CHECK (alignment IN ('left', 'center', 'right')),
  height VARCHAR(20) DEFAULT 'medium' CHECK (height IN ('small', 'medium', 'large', 'full')),

  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- =============================================================================
-- BLOCK: CALL TO ACTION
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_cta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline VARCHAR(500),
  description TEXT,

  -- Button
  button_text VARCHAR(100),
  button_url VARCHAR(500),
  button_style VARCHAR(20) DEFAULT 'primary',

  -- Secondary action
  secondary_text VARCHAR(255),
  secondary_url VARCHAR(500),

  -- Background
  background_color VARCHAR(20),
  background_image UUID REFERENCES directus_files(id),

  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- =============================================================================
-- BLOCK: GALLERY / IMAGES
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),

  -- Images as JSONB array
  -- Each image: { file_id, caption, alt }
  images JSONB DEFAULT '[]'::jsonb,

  -- Layout
  columns INTEGER DEFAULT 3 CHECK (columns BETWEEN 1 AND 6),
  aspect_ratio VARCHAR(20) DEFAULT 'square' CHECK (aspect_ratio IN ('square', 'landscape', 'portrait', 'auto')),
  gap VARCHAR(20) DEFAULT 'medium' CHECK (gap IN ('none', 'small', 'medium', 'large')),

  -- Lightbox
  enable_lightbox BOOLEAN DEFAULT true,

  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- =============================================================================
-- BLOCK: STEPS / PROCESS
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  subtitle TEXT,

  -- Steps as JSONB array
  -- Each step: { number, title, description, icon }
  steps JSONB DEFAULT '[]'::jsonb,

  -- Layout
  layout VARCHAR(20) DEFAULT 'horizontal' CHECK (layout IN ('horizontal', 'vertical', 'numbered')),
  show_numbers BOOLEAN DEFAULT true,
  show_connector BOOLEAN DEFAULT true,

  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- =============================================================================
-- BLOCK: TESTIMONIALS
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),

  -- Testimonials as JSONB array
  -- Each testimonial: { quote, author_name, author_title, author_company, author_image, rating }
  testimonials JSONB DEFAULT '[]'::jsonb,

  -- Layout
  layout VARCHAR(20) DEFAULT 'carousel' CHECK (layout IN ('carousel', 'grid', 'single')),
  columns INTEGER DEFAULT 1 CHECK (columns BETWEEN 1 AND 3),
  show_rating BOOLEAN DEFAULT false,

  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- =============================================================================
-- BLOCK: VIDEO
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_video (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),

  -- Video source
  video_type VARCHAR(20) DEFAULT 'youtube' CHECK (video_type IN ('youtube', 'vimeo', 'loom', 'file')),
  video_url VARCHAR(500),
  video_file UUID REFERENCES directus_files(id),

  -- Display
  autoplay BOOLEAN DEFAULT false,
  loop BOOLEAN DEFAULT false,
  muted BOOLEAN DEFAULT false,
  show_controls BOOLEAN DEFAULT true,

  -- Thumbnail
  thumbnail UUID REFERENCES directus_files(id),

  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- =============================================================================
-- BLOCK: COLUMNS / MULTI-COLUMN LAYOUT
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),

  -- Columns as JSONB array
  -- Each column: { width, content }
  columns JSONB DEFAULT '[]'::jsonb,

  -- Layout
  gap VARCHAR(20) DEFAULT 'medium',
  vertical_align VARCHAR(20) DEFAULT 'top' CHECK (vertical_align IN ('top', 'center', 'bottom')),
  stack_on_mobile BOOLEAN DEFAULT true,

  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- =============================================================================
-- BLOCK: QUOTE
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_quote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  quote TEXT NOT NULL,
  author VARCHAR(255),
  author_title VARCHAR(255),
  source_url VARCHAR(500),

  -- Style
  style VARCHAR(20) DEFAULT 'standard' CHECK (style IN ('standard', 'large', 'bordered', 'background')),

  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- =============================================================================
-- BLOCK: LOGO CLOUD
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_logocloud (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),

  -- Logos as JSONB array
  -- Each logo: { file_id, name, url }
  logos JSONB DEFAULT '[]'::jsonb,

  -- Layout
  max_logo_height INTEGER DEFAULT 60,
  grayscale BOOLEAN DEFAULT true,
  columns INTEGER DEFAULT 5 CHECK (columns BETWEEN 2 AND 8),

  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- =============================================================================
-- BLOCK: DIVIDER
-- =============================================================================

CREATE TABLE IF NOT EXISTS block_divider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  style VARCHAR(20) DEFAULT 'line' CHECK (style IN ('line', 'dots', 'space', 'icon')),
  color VARCHAR(20),
  width VARCHAR(20) DEFAULT 'full' CHECK (width IN ('small', 'medium', 'large', 'full')),
  spacing VARCHAR(20) DEFAULT 'medium' CHECK (spacing IN ('small', 'medium', 'large')),
  icon VARCHAR(50), -- For icon style

  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, hidden, sort)
VALUES
  ('block_richtext', 'text_fields', 'Rich text content block', '{{title}}', true, 200),
  ('block_pricing', 'attach_money', 'Pricing table block', '{{title}}', true, 201),
  ('block_team', 'groups', 'Team members block', '{{title}}', true, 202),
  ('block_faq', 'help_outline', 'FAQ accordion block', '{{title}}', true, 203),
  ('block_hero', 'panorama', 'Hero section block', '{{headline}}', true, 204),
  ('block_cta', 'touch_app', 'Call to action block', '{{headline}}', true, 205),
  ('block_gallery', 'photo_library', 'Image gallery block', '{{title}}', true, 206),
  ('block_steps', 'format_list_numbered', 'Process steps block', '{{title}}', true, 207),
  ('block_testimonials', 'format_quote', 'Testimonials block', '{{title}}', true, 208),
  ('block_video', 'videocam', 'Video embed block', '{{title}}', true, 209),
  ('block_columns', 'view_column', 'Multi-column layout block', '{{title}}', true, 210),
  ('block_quote', 'format_quote', 'Quote block', NULL, true, 211),
  ('block_logocloud', 'business', 'Logo cloud block', '{{title}}', true, 212),
  ('block_divider', 'horizontal_rule', 'Divider block', NULL, true, 213)
ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS FOR KEY BLOCKS
-- =============================================================================

-- Block Richtext Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('block_richtext', 'id', 'uuid', 'input', NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('block_richtext', 'title', NULL, 'input', NULL, NULL, FALSE, FALSE, 2, 'full', 'Section title (optional)', FALSE),
  ('block_richtext', 'content', NULL, 'input-rich-text-html', '{"toolbar": ["bold", "italic", "underline", "link", "code", "bullist", "numlist", "blockquote", "h2", "h3"]}', NULL, FALSE, FALSE, 3, 'full', 'Content', FALSE),
  ('block_richtext', 'alignment', NULL, 'select-dropdown', '{"choices": [{"text": "Left", "value": "left"}, {"text": "Center", "value": "center"}, {"text": "Right", "value": "right"}]}', NULL, FALSE, FALSE, 4, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- Block Pricing Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('block_pricing', 'id', 'uuid', 'input', NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('block_pricing', 'title', NULL, 'input', NULL, NULL, FALSE, FALSE, 2, 'full', NULL, FALSE),
  ('block_pricing', 'subtitle', NULL, 'input', NULL, NULL, FALSE, FALSE, 3, 'full', NULL, FALSE),
  ('block_pricing', 'items', 'cast-json', 'input-code', '{"language": "json", "lineNumber": true}', NULL, FALSE, FALSE, 4, 'full', 'Pricing items array', FALSE),
  ('block_pricing', 'show_subtotal', 'cast-boolean', 'boolean', NULL, 'boolean', FALSE, FALSE, 5, 'half', NULL, FALSE),
  ('block_pricing', 'show_tax', 'cast-boolean', 'boolean', NULL, 'boolean', FALSE, FALSE, 6, 'half', NULL, FALSE),
  ('block_pricing', 'tax_rate', NULL, 'input', '{"min": 0, "max": 100, "step": 0.01}', NULL, FALSE, FALSE, 7, 'half', 'Tax rate %', FALSE),
  ('block_pricing', 'show_total', 'cast-boolean', 'boolean', NULL, 'boolean', FALSE, FALSE, 8, 'half', NULL, FALSE),
  ('block_pricing', 'currency', NULL, 'select-dropdown', '{"choices": [{"text": "USD", "value": "USD"}, {"text": "EUR", "value": "EUR"}, {"text": "GBP", "value": "GBP"}]}', NULL, FALSE, FALSE, 9, 'half', NULL, FALSE),
  ('block_pricing', 'footer_note', NULL, 'input', NULL, NULL, FALSE, FALSE, 10, 'full', 'Note below pricing', FALSE)
) AS v(collection, field, special, interface, options, display, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- Block Hero Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('block_hero', 'id', 'uuid', 'input', NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('block_hero', 'headline', NULL, 'input', NULL, NULL, FALSE, FALSE, 2, 'full', 'Main headline', FALSE),
  ('block_hero', 'subheadline', NULL, 'input-rich-text-md', NULL, NULL, FALSE, FALSE, 3, 'full', 'Supporting text', FALSE),
  ('block_hero', 'background_image', 'file', 'file-image', NULL, 'image', FALSE, FALSE, 4, 'half', NULL, FALSE),
  ('block_hero', 'background_color', NULL, 'select-color', NULL, 'color', FALSE, FALSE, 5, 'half', NULL, FALSE),
  ('block_hero', 'overlay_opacity', NULL, 'slider', '{"min": 0, "max": 1, "step": 0.1}', NULL, FALSE, FALSE, 6, 'half', NULL, FALSE),
  ('block_hero', 'buttons', 'cast-json', 'input-code', '{"language": "json"}', NULL, FALSE, FALSE, 7, 'full', 'CTA buttons array', FALSE),
  ('block_hero', 'alignment', NULL, 'select-dropdown', '{"choices": [{"text": "Left", "value": "left"}, {"text": "Center", "value": "center"}, {"text": "Right", "value": "right"}]}', NULL, FALSE, FALSE, 8, 'half', NULL, FALSE),
  ('block_hero', 'height', NULL, 'select-dropdown', '{"choices": [{"text": "Small", "value": "small"}, {"text": "Medium", "value": "medium"}, {"text": "Large", "value": "large"}, {"text": "Full", "value": "full"}]}', NULL, FALSE, FALSE, 9, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE block_richtext IS 'Rich text content block for proposals and pages';
COMMENT ON TABLE block_pricing IS 'Pricing table block with line items';
COMMENT ON TABLE block_team IS 'Team members showcase block';
COMMENT ON TABLE block_faq IS 'FAQ accordion block';
COMMENT ON TABLE block_hero IS 'Hero section with headline, image, CTAs';
COMMENT ON TABLE block_cta IS 'Call to action block';
COMMENT ON TABLE block_gallery IS 'Image gallery block';
COMMENT ON TABLE block_steps IS 'Process/steps block';
COMMENT ON TABLE block_testimonials IS 'Testimonials carousel/grid block';
COMMENT ON TABLE block_video IS 'Video embed block';
COMMENT ON TABLE block_columns IS 'Multi-column layout block';
COMMENT ON TABLE block_quote IS 'Blockquote block';
COMMENT ON TABLE block_logocloud IS 'Partner/client logos block';
COMMENT ON TABLE block_divider IS 'Section divider block';
