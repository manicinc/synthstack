# 3D Model Scraping & Profile Building Plan

## Overview

This document outlines the strategy for crawling, scraping, and building profiles from popular open-source 3D model platforms with permissive licenses. The goal is to automatically analyze models, link them, and build optimized print profiles.

---

## Phase 1: Target Platforms

### Primary Sources (CC/MIT/Public Domain)

1. **Thingiverse** (thingiverse.com)
   - Largest collection of user-created 3D models
   - API available (limited)
   - Licenses: CC, public domain, custom
   - Priority: HIGH

2. **Printables** (printables.com)
   - Prusa's platform, high-quality models
   - Good API support
   - Licenses: CC-BY, CC-BY-SA, GNU GPL
   - Priority: HIGH

3. **MyMiniFactory** (myminifactory.com)
   - Curated models, guaranteed printable
   - API available
   - Many free models under permissive licenses
   - Priority: MEDIUM

4. **Cults3D** (cults3d.com)
   - Large free section
   - Many CC-licensed models
   - Priority: MEDIUM

5. **Thangs** (thangs.com)
   - Growing platform with geometric search
   - API available
   - Priority: MEDIUM

6. **GrabCAD** (grabcad.com)
   - Engineering/mechanical models
   - CAD formats (need conversion)
   - Priority: LOW

### License Requirements

Only scrape models with:
- CC0 (Public Domain)
- CC-BY (Attribution)
- CC-BY-SA (Attribution-ShareAlike)
- MIT License
- GNU GPL/LGPL
- Apache 2.0

**NEVER scrape:**
- CC-NC (Non-Commercial)
- Proprietary licenses
- Models without clear licensing

---

## Phase 2: Data Model

### Model Profile Schema

```typescript
interface ScrapedModel {
  // Identifiers
  id: string;
  sourceId: string;           // Original ID from platform
  sourcePlatform: string;     // "thingiverse" | "printables" | etc.
  sourceUrl: string;
  
  // Metadata
  name: string;
  description: string;
  author: string;
  authorUrl: string;
  license: string;
  licenseUrl: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Files
  files: ModelFile[];
  thumbnailUrl: string;
  thumbnails: string[];        // Downloaded locally
  
  // Categories
  category: string;
  tags: string[];
  
  // Stats (from source)
  downloads: number;
  likes: number;
  makes: number;
  comments: number;
  
  // Analysis (our computed data)
  analysis?: ModelAnalysis;
  
  // Print Settings
  recommendedSettings?: PrintSettings[];
  communitySettings?: PrintSettings[];
  
  // Storage
  localPath?: string;          // If downloaded
  r2Url?: string;              // If stored in Cloudflare R2
  fileSize: number;
  fileHash: string;            // SHA256 for deduplication
}

interface ModelFile {
  id: string;
  filename: string;
  format: "stl" | "obj" | "3mf" | "step";
  url: string;
  localPath?: string;
  r2Url?: string;
  fileSize: number;
  hash: string;
}

interface ModelAnalysis {
  // Geometry
  dimensions: { x: number; y: number; z: number };
  volume: number;              // cm³
  surfaceArea: number;         // cm²
  triangleCount: number;
  vertexCount: number;
  
  // Complexity
  complexity: "low" | "medium" | "high" | "extreme";
  hasOverhangs: boolean;
  maxOverhangAngle: number;
  hasThinWalls: boolean;
  minWallThickness: number;
  hasBridges: boolean;
  maxBridgeLength: number;
  hasIslands: boolean;
  
  // Print Requirements
  requiresSupports: boolean;
  supportDifficulty: "none" | "easy" | "moderate" | "difficult";
  suggestedOrientation: { x: number; y: number; z: number };
  estimatedPrintTime: number;  // minutes at default settings
  estimatedFilamentUsage: number; // grams
  
  // Recommendations
  recommendedNozzle: number[];
  recommendedLayerHeight: number[];
  recommendedInfill: number;
  recommendedMaterial: string[];
}
```

---

## Phase 3: Scraping Infrastructure

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Scheduler     │────▶│   Worker Pool    │────▶│   Storage       │
│   (Redis)       │     │   (Bull Queue)   │     │   (R2/Local)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   Scrapers       │
                        │   - Thingiverse  │
                        │   - Printables   │
                        │   - etc.         │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   Analyzer       │
                        │   (ML Service)   │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   Database       │
                        │   (PostgreSQL)   │
                        └──────────────────┘
```

### Tech Stack

- **Scraper**: Playwright (headless browser) + Cheerio (HTML parsing)
- **Queue**: Bull (Redis-backed job queue)
- **Storage**:
  - Local: `/data/models/` (development)
  - Production: Cloudflare R2 + cloud object storage backup
- **Analysis**: Python ML service with trimesh/numpy
- **Database**: PostgreSQL with pgvector for similarity search

### Rate Limiting

Platform-specific limits:
- Thingiverse: 300 req/15min (with API key)
- Printables: 100 req/min
- Others: 30 req/min (be respectful)

---

## Phase 4: Scraping Process

### 1. Discovery Phase

```typescript
// Example: Thingiverse category crawler
async function discoverModels(category: string) {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  
  let pageNum = 1;
  let hasMore = true;
  
  while (hasMore) {
    await page.goto(
      `https://www.thingiverse.com/search?type=things&category=${category}&page=${pageNum}`
    );
    
    const models = await page.$$eval('.thing-card', cards => 
      cards.map(card => ({
        id: card.dataset.thingId,
        url: card.querySelector('a')?.href,
        title: card.querySelector('.title')?.textContent
      }))
    );
    
    for (const model of models) {
      await queue.add('scrape-model', { 
        platform: 'thingiverse', 
        ...model 
      });
    }
    
    hasMore = models.length > 0;
    pageNum++;
    await sleep(randomDelay(2000, 5000));
  }
}
```

### 2. Detail Scraping

```typescript
async function scrapeModelDetails(job: Job) {
  const { platform, url } = job.data;
  
  // Get full model details
  const details = await scrapers[platform].getModelDetails(url);
  
  // Check license
  if (!isPermissiveLicense(details.license)) {
    return { skipped: true, reason: 'license' };
  }
  
  // Download files
  const files = await downloadFiles(details.files);
  
  // Store in database
  await db.models.create({
    ...details,
    files,
    status: 'pending_analysis'
  });
  
  // Queue for analysis
  await queue.add('analyze-model', { modelId: details.id });
}
```

### 3. Analysis Phase

```python
# ML service analyzes geometry
def analyze_model(stl_path: str) -> dict:
    mesh = trimesh.load(stl_path)
    
    # Basic geometry
    analysis = {
        'dimensions': mesh.bounding_box.extents.tolist(),
        'volume': mesh.volume / 1000,  # cm³
        'surface_area': mesh.area / 100,  # cm²
        'triangle_count': len(mesh.faces),
        'vertex_count': len(mesh.vertices),
    }
    
    # Overhang detection
    normals = mesh.face_normals
    down = np.array([0, 0, -1])
    angles = np.arccos(np.clip(np.dot(normals, down), -1, 1))
    overhang_faces = angles < np.radians(45)
    
    analysis['has_overhangs'] = overhang_faces.any()
    analysis['max_overhang_angle'] = np.degrees(angles.min())
    
    # Thin wall detection
    # ... (implement with ray casting)
    
    # Complexity score
    analysis['complexity'] = calculate_complexity(
        analysis['triangle_count'],
        analysis['has_overhangs'],
        analysis['has_thin_walls']
    )
    
    return analysis
```

---

## Phase 5: Profile Generation

### Automatic Settings Recommendation

Based on model analysis:

```typescript
function generateRecommendedSettings(analysis: ModelAnalysis) {
  const settings: Partial<PrintSettings> = {};
  
  // Layer height based on detail level
  if (analysis.complexity === 'low') {
    settings.layerHeight = 0.2;
  } else if (analysis.complexity === 'medium') {
    settings.layerHeight = 0.15;
  } else {
    settings.layerHeight = 0.1;
  }
  
  // Supports
  if (analysis.requiresSupports) {
    settings.supportEnabled = true;
    settings.supportType = analysis.supportDifficulty === 'difficult' 
      ? 'tree' 
      : 'normal';
  }
  
  // Infill based on strength requirements
  settings.infillDensity = analysis.hasIslands ? 30 : 15;
  
  // Material recommendations
  settings.recommendedMaterials = [];
  if (analysis.maxOverhangAngle > 60) {
    settings.recommendedMaterials.push('PETG', 'ABS'); // Better bridging
  } else {
    settings.recommendedMaterials.push('PLA');
  }
  
  return settings;
}
```

---

## Phase 6: Storage Strategy

### File Storage

1. **Development**: Local filesystem
   ```
   /data/models/
   ├── thingiverse/
   │   ├── 12345/
   │   │   ├── model.stl
   │   │   ├── thumb.jpg
   │   │   └── metadata.json
   │   └── ...
   └── printables/
       └── ...
   ```

2. **Production**: Cloudflare R2
   - Primary storage for all model files
   - CDN for thumbnails
   - Backup to cloud object storage (S3-compatible)

### Database Schema

```sql
-- Models table
CREATE TABLE scraped_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_platform VARCHAR(50) NOT NULL,
  source_id VARCHAR(100) NOT NULL,
  source_url TEXT NOT NULL,
  
  name VARCHAR(500) NOT NULL,
  description TEXT,
  author VARCHAR(200),
  license VARCHAR(50) NOT NULL,
  
  category VARCHAR(100),
  tags TEXT[],
  
  downloads INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  
  file_hash VARCHAR(64),  -- SHA256
  file_size BIGINT,
  r2_url TEXT,
  local_path TEXT,
  
  analysis JSONB,
  recommended_settings JSONB,
  
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source_platform, source_id)
);

-- Vector embeddings for similarity search
CREATE TABLE model_embeddings (
  model_id UUID REFERENCES scraped_models(id),
  embedding vector(512),
  PRIMARY KEY(model_id)
);

CREATE INDEX ON model_embeddings USING ivfflat (embedding vector_cosine_ops);
```

---

## Phase 7: Legal & Ethical Considerations

### Requirements

1. **License Verification**
   - Only scrape CC/MIT/GPL licensed content
   - Store license info with each model
   - Attribute authors properly

2. **robots.txt Compliance**
   - Respect disallow rules
   - Implement crawl delays

3. **Rate Limiting**
   - Never DoS a platform
   - Spread requests over time
   - Use exponential backoff on errors

4. **Terms of Service**
   - Review each platform's ToS
   - Some may prohibit scraping even public content
   - Prioritize platforms with explicit API support

5. **Attribution**
   - Always link back to original source
   - Display author names prominently
   - Never claim ownership of scraped content

---

## Phase 8: Implementation Timeline

### Week 1-2: Infrastructure
- [ ] Set up scraper service
- [ ] Implement Bull queue
- [ ] Create database schema
- [ ] Set up R2 storage

### Week 3-4: Scrapers
- [ ] Thingiverse scraper
- [ ] Printables scraper
- [ ] License detection
- [ ] File download/storage

### Week 5-6: Analysis
- [ ] Deploy ML analysis service
- [ ] Implement geometry analysis
- [ ] Complexity scoring
- [ ] Support detection

### Week 7-8: Integration
- [ ] Profile generation
- [ ] API endpoints
- [ ] Frontend integration
- [ ] Search & filtering

### Week 9+: Expansion
- [ ] Additional platforms
- [ ] Similarity search
- [ ] Community features
- [ ] Automated profile testing

---

## API Endpoints

```typescript
// Scraped models API
GET /api/models/scraped
GET /api/models/scraped/:id
GET /api/models/scraped/:id/analysis
GET /api/models/scraped/:id/settings
GET /api/models/scraped/search?q=...
GET /api/models/scraped/similar/:id

// Admin/scraping control
POST /api/admin/scrape/start
POST /api/admin/scrape/stop
GET /api/admin/scrape/status
```

---

## Metrics & Monitoring

Track:
- Models scraped per platform
- Success/failure rates
- Analysis queue depth
- Storage usage
- API response times
- License distribution

Dashboard: Grafana + Prometheus

---

## Future Enhancements

1. **AI-Powered Search**
   - Text-to-3D search using CLIP embeddings
   - Similar model recommendations

2. **Automated Testing**
   - Virtual print simulation
   - Setting validation

3. **Community Feedback Loop**
   - User success/failure reports
   - Continuous setting improvement

4. **Multi-Language Support**
   - Translate model descriptions
   - Support international platforms








