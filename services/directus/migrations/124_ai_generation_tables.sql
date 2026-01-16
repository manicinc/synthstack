-- ============================================
-- AI Generation Tables Migration
-- ============================================
-- Creates tables for text and image generation history
-- Part of the SynthStack AI generation feature

-- Text generations history
CREATE TABLE IF NOT EXISTS text_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    prompt TEXT NOT NULL,
    preset_id VARCHAR(50),
    system_prompt TEXT,
    result TEXT NOT NULL,
    model VARCHAR(50) NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    credits_used INTEGER NOT NULL DEFAULT 1,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_text_gen_user FOREIGN KEY (user_id)
        REFERENCES directus_users(id) ON DELETE CASCADE
);

-- Image generations history
CREATE TABLE IF NOT EXISTS image_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    prompt TEXT NOT NULL,
    full_prompt TEXT,
    preset_id VARCHAR(50),
    image_url TEXT NOT NULL,
    revised_prompt TEXT,
    size VARCHAR(20) NOT NULL DEFAULT '1024x1024',
    quality VARCHAR(20) NOT NULL DEFAULT 'standard',
    style VARCHAR(20) NOT NULL DEFAULT 'vivid',
    credits_used INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_image_gen_user FOREIGN KEY (user_id)
        REFERENCES directus_users(id) ON DELETE CASCADE
);

-- Generation presets (shared across text and image)
CREATE TABLE IF NOT EXISTS generation_presets (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'image')),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    prompt_template TEXT NOT NULL,
    icon VARCHAR(50),
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_text_gen_user ON text_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_text_gen_created ON text_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_text_gen_preset ON text_generations(preset_id);

CREATE INDEX IF NOT EXISTS idx_image_gen_user ON image_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_image_gen_created ON image_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_gen_preset ON image_generations(preset_id);

CREATE INDEX IF NOT EXISTS idx_presets_type ON generation_presets(type, is_active);
CREATE INDEX IF NOT EXISTS idx_presets_category ON generation_presets(category);

-- Update trigger for presets
CREATE OR REPLACE FUNCTION update_preset_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_preset_updated ON generation_presets;
CREATE TRIGGER trigger_preset_updated
    BEFORE UPDATE ON generation_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_preset_timestamp();

-- Seed default text presets
INSERT INTO generation_presets (id, type, name, description, prompt_template, icon, category, sort_order)
VALUES
    ('blog-post', 'text', 'Blog Post Outline', 'Create a structured blog post outline with sections and key points', 'You are a professional content writer. Create a well-structured blog post outline with an engaging introduction, clear sections with key points, and a compelling conclusion.', 'article', 'creative', 1),
    ('email-draft', 'text', 'Email Draft', 'Write a professional email based on your requirements', 'You are a professional email writer. Write clear, concise, and professional emails. Match the tone to the context.', 'email', 'business', 2),
    ('code-docs', 'text', 'Code Documentation', 'Generate documentation for your code or API', 'You are a technical documentation expert. Write clear, comprehensive documentation including descriptions, parameters, return values, and examples.', 'code', 'technical', 3),
    ('creative-story', 'text', 'Creative Story Starter', 'Get creative story ideas and opening paragraphs', 'You are a creative writing assistant. Generate engaging story starters with vivid descriptions, intriguing characters, and compelling hooks.', 'auto_stories', 'creative', 4),
    ('product-description', 'text', 'Product Description', 'Create compelling product descriptions for marketing', 'You are a marketing copywriter. Write persuasive product descriptions that highlight benefits, features, and unique selling points.', 'inventory_2', 'business', 5),
    ('meeting-summary', 'text', 'Meeting Summary', 'Summarize meeting notes into clear action items', 'You are an executive assistant. Transform meeting notes into clear, organized summaries with key decisions, action items, owners, and deadlines.', 'groups', 'business', 6),
    ('technical-explanation', 'text', 'Technical Explanation', 'Explain complex technical concepts clearly', 'You are a technical educator. Explain complex concepts in clear, accessible language. Use analogies, examples, and step-by-step breakdowns.', 'psychology', 'technical', 7),
    ('social-media', 'text', 'Social Media Post', 'Create engaging social media content', 'You are a social media manager. Create engaging, shareable content optimized for social platforms. Include relevant hashtags and call-to-actions.', 'share', 'casual', 8)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    prompt_template = EXCLUDED.prompt_template,
    updated_at = NOW();

-- Seed default image presets
INSERT INTO generation_presets (id, type, name, description, prompt_template, icon, category, sort_order)
VALUES
    ('photorealistic', 'image', 'Photorealistic', 'Ultra-realistic photographs with natural lighting', 'photorealistic, highly detailed, professional photography, natural lighting, 8K resolution', 'photo_camera', 'realistic', 1),
    ('digital-art', 'image', 'Digital Art', 'Modern digital artwork with vibrant colors', 'digital art, vibrant colors, detailed illustration, trending on ArtStation, high quality', 'palette', 'artistic', 2),
    ('watercolor', 'image', 'Watercolor', 'Soft watercolor painting style', 'watercolor painting, soft edges, flowing colors, artistic, traditional media feel', 'water_drop', 'artistic', 3),
    ('line-drawing', 'image', 'Line Drawing', 'Clean line art and sketches', 'line drawing, clean lines, minimalist sketch, black and white, detailed linework', 'draw', 'technical', 4),
    ('3d-render', 'image', '3D Render', 'Polished 3D rendered visuals', '3D render, octane render, ray tracing, high detail, professional 3D visualization', 'view_in_ar', 'technical', 5),
    ('minimalist', 'image', 'Minimalist', 'Clean, simple, and elegant designs', 'minimalist design, clean composition, simple shapes, elegant, modern aesthetic', 'crop_square', 'abstract', 6),
    ('vintage', 'image', 'Vintage/Retro', 'Nostalgic retro and vintage aesthetics', 'vintage style, retro aesthetic, film grain, nostalgic colors, 1970s photography', 'filter_vintage', 'artistic', 7),
    ('comic', 'image', 'Comic Style', 'Bold comic book and graphic novel art', 'comic book style, bold outlines, cel shading, graphic novel art, dynamic composition', 'auto_awesome', 'artistic', 8)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    prompt_template = EXCLUDED.prompt_template,
    updated_at = NOW();

-- Add generation credits tracking to user_credits if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credits' AND column_name = 'text_credits_used'
    ) THEN
        ALTER TABLE user_credits ADD COLUMN text_credits_used INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_credits' AND column_name = 'image_credits_used'
    ) THEN
        ALTER TABLE user_credits ADD COLUMN image_credits_used INTEGER DEFAULT 0;
    END IF;
END $$;

-- Grant permissions for demo user (read-only on presets, full on own generations)
DO $$
DECLARE
    demo_role_id UUID;
BEGIN
    SELECT id INTO demo_role_id FROM directus_roles WHERE name = 'Demo User';

    IF demo_role_id IS NOT NULL THEN
        -- Read-only on presets
        INSERT INTO directus_permissions (role, collection, action, permissions, validation, fields)
        VALUES
            (demo_role_id, 'generation_presets', 'read', '{}', '{}', '*')
        ON CONFLICT DO NOTHING;

        -- Own generations only
        INSERT INTO directus_permissions (role, collection, action, permissions, validation, fields)
        VALUES
            (demo_role_id, 'text_generations', 'read', '{"user_id": {"_eq": "$CURRENT_USER"}}', '{}', '*'),
            (demo_role_id, 'text_generations', 'create', '{}', '{}', '*'),
            (demo_role_id, 'image_generations', 'read', '{"user_id": {"_eq": "$CURRENT_USER"}}', '{}', '*'),
            (demo_role_id, 'image_generations', 'create', '{}', '{}', '*')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

COMMENT ON TABLE text_generations IS 'Stores history of AI text generations per user';
COMMENT ON TABLE image_generations IS 'Stores history of AI image generations per user';
COMMENT ON TABLE generation_presets IS 'Configurable presets for text and image generation';
