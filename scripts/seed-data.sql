-- SynthStack Seed Data
-- Sample data for development and testing

-- =========================================
-- PRINTERS
-- =========================================

INSERT INTO printers (manufacturer, model, technology, build_volume_x, build_volume_y, build_volume_z, max_nozzle_temp, max_bed_temp, heated_bed, enclosure, extruder_type, nozzle_diameter, firmware, features, slicer_support, verified) VALUES
-- Bambu Lab
('Bambu Lab', 'X1 Carbon', 'FDM', 256, 256, 256, 300, 110, TRUE, TRUE, 'direct_drive', 0.4, 'Marlin (modified)', ARRAY['AMS', 'Lidar', 'AI'], ARRAY['bambu-studio', 'orcaslicer'], TRUE),
('Bambu Lab', 'P1S', 'FDM', 256, 256, 256, 300, 100, TRUE, TRUE, 'direct_drive', 0.4, 'Marlin (modified)', ARRAY['AMS Compatible'], ARRAY['bambu-studio', 'orcaslicer'], TRUE),
('Bambu Lab', 'P1P', 'FDM', 256, 256, 256, 300, 100, TRUE, FALSE, 'direct_drive', 0.4, 'Marlin (modified)', ARRAY['AMS Compatible'], ARRAY['bambu-studio', 'orcaslicer'], TRUE),
('Bambu Lab', 'A1', 'FDM', 256, 256, 256, 300, 100, TRUE, FALSE, 'direct_drive', 0.4, 'Marlin (modified)', ARRAY['AMS Lite'], ARRAY['bambu-studio', 'orcaslicer'], TRUE),
('Bambu Lab', 'A1 mini', 'FDM', 180, 180, 180, 300, 80, TRUE, FALSE, 'direct_drive', 0.4, 'Marlin (modified)', ARRAY['AMS Lite'], ARRAY['bambu-studio', 'orcaslicer'], TRUE),

-- Prusa Research
('Prusa Research', 'MK4', 'FDM', 250, 210, 220, 300, 120, TRUE, FALSE, 'direct_drive', 0.4, 'Prusa Firmware', ARRAY['Input Shaper', 'Loadcell'], ARRAY['prusaslicer', 'orcaslicer'], TRUE),
('Prusa Research', 'MK3S+', 'FDM', 250, 210, 210, 300, 120, TRUE, FALSE, 'direct_drive', 0.4, 'Prusa Firmware', ARRAY['Filament Sensor'], ARRAY['prusaslicer', 'orcaslicer'], TRUE),
('Prusa Research', 'MINI+', 'FDM', 180, 180, 180, 280, 100, TRUE, FALSE, 'bowden', 0.4, 'Prusa Firmware', ARRAY['Compact'], ARRAY['prusaslicer', 'orcaslicer'], TRUE),
('Prusa Research', 'XL', 'FDM', 360, 360, 360, 300, 120, TRUE, TRUE, 'direct_drive', 0.4, 'Prusa Firmware', ARRAY['Multi-tool', '5 Toolheads'], ARRAY['prusaslicer', 'orcaslicer'], TRUE),

-- Creality
('Creality', 'K1', 'FDM', 220, 220, 250, 300, 100, TRUE, TRUE, 'direct_drive', 0.4, 'Klipper', ARRAY['Fast Printing'], ARRAY['cura', 'orcaslicer', 'prusaslicer'], TRUE),
('Creality', 'K1 Max', 'FDM', 300, 300, 300, 300, 100, TRUE, TRUE, 'direct_drive', 0.4, 'Klipper', ARRAY['Fast Printing', 'AI Camera'], ARRAY['cura', 'orcaslicer', 'prusaslicer'], TRUE),
('Creality', 'Ender-3 V3', 'FDM', 220, 220, 250, 300, 110, TRUE, FALSE, 'direct_drive', 0.4, 'Klipper', ARRAY['Core XZ'], ARRAY['cura', 'orcaslicer', 'prusaslicer'], TRUE),
('Creality', 'Ender-3 V3 KE', 'FDM', 220, 220, 240, 260, 100, TRUE, FALSE, 'direct_drive', 0.4, 'Klipper', ARRAY['WiFi', 'Touch Screen'], ARRAY['cura', 'orcaslicer', 'prusaslicer'], TRUE),
('Creality', 'Ender-3 S1 Pro', 'FDM', 220, 220, 270, 300, 110, TRUE, FALSE, 'direct_drive', 0.4, 'Marlin', ARRAY['CR Touch'], ARRAY['cura', 'prusaslicer'], TRUE),

-- Voron Design
('Voron Design', 'Voron 2.4', 'FDM', 350, 350, 350, 300, 120, TRUE, TRUE, 'direct_drive', 0.4, 'Klipper', ARRAY['CoreXY', 'DIY'], ARRAY['orcaslicer', 'prusaslicer', 'cura'], TRUE),
('Voron Design', 'Voron Trident', 'FDM', 300, 300, 250, 300, 120, TRUE, TRUE, 'direct_drive', 0.4, 'Klipper', ARRAY['CoreXY', 'DIY', 'Triple Z'], ARRAY['orcaslicer', 'prusaslicer', 'cura'], TRUE),
('Voron Design', 'Voron 0.2', 'FDM', 120, 120, 120, 300, 120, TRUE, TRUE, 'direct_drive', 0.4, 'Klipper', ARRAY['Compact', 'DIY'], ARRAY['orcaslicer', 'prusaslicer', 'cura'], TRUE),

-- Elegoo
('Elegoo', 'Neptune 4 Pro', 'FDM', 225, 225, 265, 300, 110, TRUE, FALSE, 'direct_drive', 0.4, 'Klipper', ARRAY['Input Shaper', 'Linear Rails'], ARRAY['cura', 'orcaslicer', 'prusaslicer'], TRUE),
('Elegoo', 'Neptune 4 Plus', 'FDM', 320, 320, 385, 300, 110, TRUE, FALSE, 'direct_drive', 0.4, 'Klipper', ARRAY['Large Volume'], ARRAY['cura', 'orcaslicer', 'prusaslicer'], TRUE),
('Elegoo', 'Neptune 4', 'FDM', 225, 225, 265, 260, 100, TRUE, FALSE, 'direct_drive', 0.4, 'Klipper', ARRAY['Budget Friendly'], ARRAY['cura', 'orcaslicer', 'prusaslicer'], TRUE),

-- Anycubic
('Anycubic', 'Kobra 2 Pro', 'FDM', 220, 220, 250, 260, 100, TRUE, FALSE, 'direct_drive', 0.4, 'Marlin', ARRAY['LeviQ Auto Leveling'], ARRAY['cura', 'prusaslicer'], TRUE),
('Anycubic', 'Kobra 2 Max', 'FDM', 420, 420, 500, 260, 100, TRUE, FALSE, 'direct_drive', 0.4, 'Marlin', ARRAY['Large Build Volume'], ARRAY['cura', 'prusaslicer'], TRUE)

ON CONFLICT (manufacturer, model) DO NOTHING;

-- =========================================
-- FILAMENTS
-- =========================================

INSERT INTO filaments (brand, name, material, color_name, color_hex, nozzle_temp_min, nozzle_temp_max, nozzle_temp_optimal, bed_temp_min, bed_temp_max, bed_temp_optimal, print_speed_min, print_speed_max, print_speed_optimal, cooling_fan_min, cooling_fan_max, retraction_distance, retraction_speed, diameter, density, verified) VALUES
-- Polymaker PLA
('Polymaker', 'PolyLite PLA', 'PLA', 'Black', '#1a1a1a', 190, 230, 205, 25, 60, 50, 40, 100, 60, 80, 100, 0.8, 45, 1.75, 1.24, TRUE),
('Polymaker', 'PolyLite PLA', 'PLA', 'White', '#ffffff', 190, 230, 205, 25, 60, 50, 40, 100, 60, 80, 100, 0.8, 45, 1.75, 1.24, TRUE),
('Polymaker', 'PolyLite PLA', 'PLA', 'Grey', '#808080', 190, 230, 205, 25, 60, 50, 40, 100, 60, 80, 100, 0.8, 45, 1.75, 1.24, TRUE),
('Polymaker', 'PolyLite PLA Pro', 'PLA', 'Black', '#1a1a1a', 200, 230, 215, 25, 60, 55, 40, 100, 60, 80, 100, 0.8, 45, 1.75, 1.24, TRUE),

-- Prusament
('Prusament', 'PLA', 'PLA', 'Prusa Orange', '#FA6831', 200, 230, 215, 40, 60, 55, 40, 100, 60, 80, 100, 0.8, 45, 1.75, 1.24, TRUE),
('Prusament', 'PLA', 'PLA', 'Galaxy Black', '#1a1a1a', 200, 230, 215, 40, 60, 55, 40, 100, 60, 80, 100, 0.8, 45, 1.75, 1.24, TRUE),
('Prusament', 'PETG', 'PETG', 'Jet Black', '#0a0a0a', 230, 250, 240, 70, 90, 85, 30, 80, 50, 30, 60, 1.0, 40, 1.75, 1.27, TRUE),
('Prusament', 'PETG', 'PETG', 'Orange', '#FA6831', 230, 250, 240, 70, 90, 85, 30, 80, 50, 30, 60, 1.0, 40, 1.75, 1.27, TRUE),
('Prusament', 'ASA', 'ASA', 'Jet Black', '#0a0a0a', 250, 265, 260, 90, 110, 100, 30, 60, 45, 0, 30, 0.8, 45, 1.75, 1.07, TRUE),

-- Hatchbox
('Hatchbox', 'PLA', 'PLA', 'Black', '#1a1a1a', 180, 210, 195, 25, 60, 50, 40, 80, 60, 80, 100, 0.8, 45, 1.75, 1.24, TRUE),
('Hatchbox', 'PLA', 'PLA', 'White', '#ffffff', 180, 210, 195, 25, 60, 50, 40, 80, 60, 80, 100, 0.8, 45, 1.75, 1.24, TRUE),
('Hatchbox', 'ABS', 'ABS', 'Black', '#1a1a1a', 230, 250, 245, 90, 110, 100, 30, 60, 45, 0, 20, 0.8, 45, 1.75, 1.04, TRUE),

-- Overture
('Overture', 'PLA', 'PLA', 'Black', '#1a1a1a', 190, 220, 200, 25, 60, 50, 40, 80, 60, 80, 100, 0.8, 45, 1.75, 1.24, TRUE),
('Overture', 'TPU 95A', 'TPU', 'Black', '#1a1a1a', 210, 240, 230, 30, 60, 50, 15, 30, 20, 50, 80, 3.0, 25, 1.75, 1.21, TRUE),
('Overture', 'PETG', 'PETG', 'Black', '#1a1a1a', 230, 250, 235, 70, 85, 80, 30, 60, 45, 30, 60, 1.0, 40, 1.75, 1.27, TRUE),

-- Bambu Lab
('Bambu Lab', 'PLA Basic', 'PLA', 'Black', '#1a1a1a', 190, 230, 205, 25, 60, 45, 50, 300, 100, 80, 100, 0.8, 45, 1.75, 1.24, TRUE),
('Bambu Lab', 'PLA Matte', 'PLA', 'Black', '#1a1a1a', 190, 230, 210, 25, 60, 50, 50, 300, 100, 80, 100, 0.8, 45, 1.75, 1.24, TRUE),
('Bambu Lab', 'PETG Basic', 'PETG', 'Black', '#1a1a1a', 230, 260, 245, 65, 85, 75, 40, 200, 80, 30, 60, 1.0, 40, 1.75, 1.27, TRUE),
('Bambu Lab', 'ABS', 'ABS', 'Black', '#1a1a1a', 240, 270, 260, 90, 110, 100, 30, 150, 60, 0, 30, 0.8, 45, 1.75, 1.04, TRUE),
('Bambu Lab', 'TPU 95A', 'TPU', 'Black', '#1a1a1a', 210, 240, 230, 30, 50, 40, 20, 50, 30, 50, 80, 3.0, 25, 1.75, 1.21, TRUE),

-- eSUN
('eSUN', 'PLA+', 'PLA', 'Black', '#1a1a1a', 205, 225, 215, 45, 65, 55, 40, 80, 60, 80, 100, 0.8, 45, 1.75, 1.24, TRUE),
('eSUN', 'ePETG', 'PETG', 'Black', '#1a1a1a', 230, 250, 240, 70, 90, 80, 30, 60, 45, 30, 60, 1.0, 40, 1.75, 1.27, TRUE),
('eSUN', 'ePA-CF', 'Nylon', 'Black', '#1a1a1a', 260, 280, 270, 80, 100, 90, 30, 50, 40, 0, 30, 1.2, 35, 1.75, 1.10, TRUE),

-- Inland (Micro Center)
('Inland', 'PLA', 'PLA', 'Black', '#1a1a1a', 190, 220, 205, 25, 60, 50, 40, 80, 60, 80, 100, 0.8, 45, 1.75, 1.24, TRUE),
('Inland', 'PLA+', 'PLA', 'Black', '#1a1a1a', 200, 225, 215, 45, 65, 55, 40, 80, 60, 80, 100, 0.8, 45, 1.75, 1.24, TRUE)

ON CONFLICT (brand, name, material, color_name) DO NOTHING;

-- Verify counts
SELECT 
  (SELECT COUNT(*) FROM printers) as printers_count,
  (SELECT COUNT(*) FROM filaments) as filaments_count,
  (SELECT COUNT(*) FROM subscription_plans) as plans_count;
