-- Printverse Directus Schema Migration
-- Initial schema setup for printers, filaments, and profiles

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Printers Collection
-- ============================================
CREATE TABLE IF NOT EXISTS printers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,
  
  -- Printer fields
  manufacturer VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  build_volume_x DECIMAL(10,2) NOT NULL,
  build_volume_y DECIMAL(10,2) NOT NULL,
  build_volume_z DECIMAL(10,2) NOT NULL,
  max_nozzle_temp INT NOT NULL DEFAULT 260,
  max_bed_temp INT NOT NULL DEFAULT 110,
  heated_bed BOOLEAN DEFAULT TRUE,
  enclosure BOOLEAN DEFAULT FALSE,
  extruder_type VARCHAR(50) DEFAULT 'direct_drive',
  nozzle_diameter DECIMAL(5,2) DEFAULT 0.4,
  firmware VARCHAR(100),
  features TEXT[], -- Array of feature tags
  image UUID REFERENCES directus_files(id),
  verified BOOLEAN DEFAULT FALSE,
  community_submitted BOOLEAN DEFAULT FALSE,
  
  UNIQUE(manufacturer, model)
);

-- Index for search
CREATE INDEX idx_printers_manufacturer ON printers(manufacturer);
CREATE INDEX idx_printers_model ON printers(model);

-- ============================================
-- Filaments Collection
-- ============================================
CREATE TABLE IF NOT EXISTS filaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,
  
  -- Filament fields
  material_type VARCHAR(50) NOT NULL,
  brand VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  color VARCHAR(100),
  nozzle_temp_min INT NOT NULL,
  nozzle_temp_max INT NOT NULL,
  nozzle_temp_optimal INT NOT NULL,
  bed_temp_min INT NOT NULL,
  bed_temp_max INT NOT NULL,
  bed_temp_optimal INT NOT NULL,
  print_speed_max INT DEFAULT 60,
  requires_enclosure BOOLEAN DEFAULT FALSE,
  requires_drying BOOLEAN DEFAULT FALSE,
  density DECIMAL(5,2),
  notes TEXT,
  
  UNIQUE(material_type, brand, name)
);

-- Index for search
CREATE INDEX idx_filaments_material ON filaments(material_type);
CREATE INDEX idx_filaments_brand ON filaments(brand);

-- ============================================
-- Print Profiles Collection
-- ============================================
CREATE TABLE IF NOT EXISTS print_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,
  
  -- Profile fields
  user_id UUID, -- Supabase user ID
  printer_id UUID REFERENCES printers(id) ON DELETE SET NULL,
  filament_id UUID REFERENCES filaments(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  settings_json JSONB NOT NULL,
  slicer_exports JSONB, -- {orcaslicer: ..., prusaslicer: ...}
  source VARCHAR(50) DEFAULT 'user', -- ai_generated, community, manufacturer, user
  votes_up INT DEFAULT 0,
  votes_down INT DEFAULT 0,
  success_rate DECIMAL(5,2),
  print_count INT DEFAULT 0,
  is_public BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  
  CONSTRAINT positive_votes CHECK (votes_up >= 0 AND votes_down >= 0)
);

-- Indexes
CREATE INDEX idx_profiles_user ON print_profiles(user_id);
CREATE INDEX idx_profiles_printer ON print_profiles(printer_id);
CREATE INDEX idx_profiles_filament ON print_profiles(filament_id);
CREATE INDEX idx_profiles_public ON print_profiles(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_profiles_votes ON print_profiles(votes_up DESC);

-- ============================================
-- STL Analyses Collection
-- ============================================
CREATE TABLE IF NOT EXISTS stl_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Analysis fields
  user_id UUID, -- Supabase user ID
  filename VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  vertex_count INT NOT NULL,
  face_count INT NOT NULL,
  is_watertight BOOLEAN DEFAULT FALSE,
  is_manifold BOOLEAN DEFAULT FALSE,
  bounding_box JSONB,
  volume DECIMAL(15,4),
  surface_area DECIMAL(15,4),
  center_of_mass JSONB,
  overhangs JSONB,
  thin_walls JSONB,
  complexity_score DECIMAL(5,2),
  print_difficulty VARCHAR(50),
  warnings JSONB,
  
  UNIQUE(file_hash)
);

-- Index
CREATE INDEX idx_analyses_user ON stl_analyses(user_id);
CREATE INDEX idx_analyses_hash ON stl_analyses(file_hash);

-- ============================================
-- Generation History Collection
-- ============================================
CREATE TABLE IF NOT EXISTS generation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Generation fields
  user_id UUID NOT NULL, -- Supabase user ID
  analysis_id UUID REFERENCES stl_analyses(id),
  printer_id UUID REFERENCES printers(id),
  filament_id UUID REFERENCES filaments(id),
  profile_id UUID REFERENCES print_profiles(id),
  quality_preset VARCHAR(50),
  priorities JSONB,
  settings_json JSONB NOT NULL,
  confidence_score DECIMAL(5,2),
  reasoning TEXT,
  citations JSONB,
  warnings JSONB,
  credits_used INT DEFAULT 1
);

-- Index
CREATE INDEX idx_generation_user ON generation_history(user_id);
CREATE INDEX idx_generation_date ON generation_history(date_created DESC);

-- ============================================
-- Seed Data: Common Filaments
-- ============================================
INSERT INTO filaments (material_type, brand, name, nozzle_temp_min, nozzle_temp_max, nozzle_temp_optimal, bed_temp_min, bed_temp_max, bed_temp_optimal, print_speed_max, requires_enclosure, requires_drying) VALUES
('PLA', 'Generic', 'PLA Standard', 190, 220, 200, 50, 70, 60, 80, FALSE, FALSE),
('PLA', 'Prusament', 'Galaxy Black', 195, 215, 210, 55, 65, 60, 60, FALSE, FALSE),
('PETG', 'Generic', 'PETG Standard', 220, 250, 235, 70, 90, 80, 60, FALSE, TRUE),
('PETG', 'Prusament', 'Orange', 230, 250, 240, 80, 90, 85, 50, FALSE, TRUE),
('ABS', 'Generic', 'ABS Standard', 230, 260, 245, 90, 110, 100, 60, TRUE, TRUE),
('TPU', 'Generic', 'TPU 95A', 210, 240, 220, 40, 60, 50, 30, FALSE, TRUE),
('ASA', 'Generic', 'ASA Standard', 240, 270, 250, 90, 110, 100, 50, TRUE, TRUE),
('Nylon', 'Generic', 'PA6', 250, 280, 260, 70, 90, 80, 50, TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================
-- Seed Data: Popular Printers
-- ============================================
INSERT INTO printers (manufacturer, model, build_volume_x, build_volume_y, build_volume_z, max_nozzle_temp, max_bed_temp, heated_bed, enclosure, extruder_type, nozzle_diameter, firmware, features, verified) VALUES
('Bambu Lab', 'X1 Carbon', 256, 256, 256, 300, 110, TRUE, TRUE, 'direct_drive', 0.4, 'Custom', ARRAY['AMS', 'Lidar', 'AI Camera'], TRUE),
('Bambu Lab', 'P1S', 256, 256, 256, 300, 110, TRUE, TRUE, 'direct_drive', 0.4, 'Custom', ARRAY['AMS Compatible'], TRUE),
('Bambu Lab', 'A1 Mini', 180, 180, 180, 300, 80, TRUE, FALSE, 'direct_drive', 0.4, 'Custom', ARRAY['AMS Lite'], TRUE),
('Prusa', 'MK4', 250, 210, 220, 300, 120, TRUE, FALSE, 'direct_drive', 0.4, 'Prusa Firmware', ARRAY['Input Shaper', 'Load Cell'], TRUE),
('Prusa', 'XL', 360, 360, 360, 300, 120, TRUE, FALSE, 'direct_drive', 0.4, 'Prusa Firmware', ARRAY['Tool Changer', '5 Tools'], TRUE),
('Creality', 'Ender 3 V3', 220, 220, 250, 260, 100, TRUE, FALSE, 'direct_drive', 0.4, 'Marlin', ARRAY['Klipper Compatible'], TRUE),
('Creality', 'K1 Max', 300, 300, 300, 300, 100, TRUE, TRUE, 'direct_drive', 0.4, 'Custom', ARRAY['AI Camera', 'Lidar'], TRUE),
('Voron', 'Trident 350', 350, 350, 250, 300, 110, TRUE, TRUE, 'direct_drive', 0.4, 'Klipper', ARRAY['CoreXY', 'DIY Kit'], TRUE),
('Voron', '2.4 350', 350, 350, 350, 300, 110, TRUE, TRUE, 'direct_drive', 0.4, 'Klipper', ARRAY['CoreXY', 'DIY Kit'], TRUE),
('Anycubic', 'Kobra 2', 220, 220, 250, 260, 100, TRUE, FALSE, 'direct_drive', 0.4, 'Marlin', ARRAY['Auto Leveling'], TRUE),
('Flashforge', 'Adventurer 5M Pro', 220, 220, 220, 280, 110, TRUE, TRUE, 'direct_drive', 0.4, 'Custom', ARRAY['HEPA Filter'], TRUE),
('Elegoo', 'Neptune 4 Pro', 225, 225, 265, 300, 110, TRUE, FALSE, 'direct_drive', 0.4, 'Klipper', ARRAY['Input Shaper'], TRUE)
ON CONFLICT DO NOTHING;

-- Grant permissions for Directus
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'directus') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA public TO directus;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO directus;
  END IF;
END $$;
