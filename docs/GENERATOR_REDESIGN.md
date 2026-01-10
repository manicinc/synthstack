# Generator Redesign Plan

## Current Problem

The generator currently shows individual value sliders (Speed 50%, Quality 50%, Strength 50%, Infill 20%) which is **wrong**. This makes it look like a basic profile editor, not an AI-powered generator.

## What It Should Be

The generator should:
1. Accept **preferences/priorities** that the AI uses to WEIGHT its decisions
2. Output complete profiles with 50+ settings, not just show the inputs back
3. Be model-aware - analyze the STL and optimize based on geometry
4. Show users they're getting AI-powered generation, not manual editing

## Redesigned Flow

### Step 1: Upload Model (Required)
- Drop STL/OBJ/3MF
- Show real analysis:
  - Dimensions & volume
  - Triangle count
  - Overhang detection (% of surface needing support)
  - Thin wall warnings
  - Suggested orientation
  - Complexity score

### Step 2: Configure (AI Preferences)

#### Simple Mode (3-5 controls)
```
┌─────────────────────────────────────┐
│ PRINTER        [Bambu X1 Carbon ▼] │
│ FILAMENT       [Prusament PLA   ▼] │
│ INTENT         ○ Speed  ○ Balanced  ● Quality │
│ SUPPORTS       [Auto-detect ▼]     │
└─────────────────────────────────────┘
```

- **Intent**: Single slider/toggle between Speed ←→ Quality
- Everything else is auto-determined by AI

#### Advanced Mode (Expanded)
```
┌─────────────────────────────────────┐
│ QUALITY PRESET                      │
│ [Draft 0.28] [Standard 0.20] [Fine 0.12] [Ultra 0.08] │
│                                     │
│ AI OPTIMIZATION PRIORITIES          │
│ What matters most for this print?   │
│                                     │
│ Surface Finish ●●●●○ (High)         │
│ Print Speed    ●●○○○ (Medium)       │
│ Strength       ●●●○○ (Medium-High)  │
│ Material Usage ●○○○○ (Low)          │
│                                     │
│ SUPPORT STRATEGY                    │
│ ○ None (may fail) ● Auto-detect ○ Everywhere │
│                                     │
│ SPECIAL REQUIREMENTS                │
│ □ Water-tight/manifold              │
│ □ Food-safe temps                   │
│ □ Outdoor use (UV stable)           │
│ □ Flexible part                     │
└─────────────────────────────────────┘
```

### Step 3: Results (AI-Generated)

Show the FULL generated profile with:
- **Summary card**: "Generated in 1.2s using GPT-4 + STL analysis"
- **Key settings preview**: 8-10 most important values
- **Full profile accordion**: Expandable to see all 50+ settings
- **Export options**: OrcaSlicer / PrusaSlicer / Cura / FlashPrint / Bambu Studio
- **Confidence indicators**: "High confidence" / "May need tuning"

## Implementation Tasks

### Phase 1: Core Fixes
- [ ] Remove direct value sliders (Speed/Quality/Strength percentages)
- [ ] Add Intent toggle (Speed ↔ Balanced ↔ Quality)
- [ ] Add proper quality presets that map to layer heights
- [ ] Fix logo to use the layered P design
- [ ] Add FlashPrint to slicer options

### Phase 2: AI Integration  
- [ ] Real STL analysis with Trimesh
- [ ] Connect to ML service for generation
- [ ] Show generation reasoning ("Using tree supports due to 45° overhang detected")
- [ ] Add confidence scores

### Phase 3: Full Profile Export
- [ ] Generate complete .json for OrcaSlicer
- [ ] Generate complete .ini for PrusaSlicer
- [ ] Generate .curaprofile for Cura
- [ ] Generate .fcfg for FlashPrint (complex @Variant encoding)
- [ ] Schema validation for each format

## File Format Schemas

### OrcaSlicer (.json)
```json
{
  "type": "process",
  "name": "Generated Profile",
  "inherits": "0.20mm Standard @BBL X1C",
  "layer_height": "0.2",
  "wall_loops": "3",
  "sparse_infill_density": "20%",
  "support_type": "tree(auto)",
  ...
}
```

### PrusaSlicer (.ini)
```ini
[print:Generated Profile]
inherits = 0.20mm QUALITY @MK4
layer_height = 0.2
perimeters = 3
fill_density = 20%
support_material = 1
...
```

### Cura (.curaprofile)
ZIP containing:
- quality.inst.cfg
- user-overrides.cfg

### FlashPrint (.fcfg)
INI with @Variant binary floats - requires special encoding

## Database Requirements

### Printers Table
- Verified by manufacturer
- Known capabilities (temp limits, speeds, features)
- Compatible slicers
- Default profiles to inherit from

### Filaments Table
- Material properties (temps, cooling, retraction)
- Brand-specific tuning
- Compatibility matrix (which printers work well)

### Generated Profiles Table
- Store successful generations
- Community ratings
- Success/failure feedback loop
- Version tracking

## API Endpoints

```
POST /api/generate
{
  "model_hash": "sha256...",
  "model_analysis": { ... },
  "printer_id": "uuid",
  "filament_id": "uuid", 
  "intent": "quality", // speed | balanced | quality
  "preferences": {
    "surface_finish": 4,
    "print_speed": 2,
    "strength": 3,
    "material_usage": 1
  },
  "supports": "auto",
  "target_slicer": "orcaslicer"
}

Response:
{
  "profile_id": "uuid",
  "generation_time_ms": 1200,
  "model_used": "gpt-4o-mini",
  "confidence": 0.92,
  "settings": { ... },
  "export_formats": {
    "orcaslicer": "base64...",
    "prusaslicer": "base64...",
    "cura": "base64..."
  },
  "reasoning": [
    "Using 0.12mm layer height for quality intent",
    "Enabled tree supports - detected 35% overhang surface",
    "Reduced print speed to 45mm/s for thin wall quality"
  ]
}
```

## Metrics to Track

- Generation success rate
- Export format usage
- User feedback (print success/failure)
- Settings that get manually adjusted after generation
- Time from upload to export








