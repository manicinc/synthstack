## Scraping & Seeds (Printers/Filaments)

- **What runs**: Weekly GitHub Action `.github/workflows/scrape-catalog.yml` (manual dispatch available).
- **Outputs**: `packages/api-gateway/data/printers.json`, `printers.sqlite`, `filaments.json`, `filaments.sqlite`, plus `scripts/seed-printers.sql` (for PG seed).
- **How it’s used**: API uses `sql-storage-adapter` fallbacks (sqlite → JSON) when Directus/DB is unavailable.
- **Artifacts**: Each run uploads an artifact `scraped-catalog` with the files above. Download and drop them into `packages/api-gateway/data/` locally if you want the freshest seeds.
- **Dependencies**: Python 3.11; pip packages `requests`, `beautifulsoup4`, `lxml`, `tqdm`. JS deps installed via `pnpm install`.

### Run locally
```bash
pnpm install
python -m pip install --upgrade pip
pip install requests beautifulsoup4 lxml tqdm

# printers
python scripts/scrape-printers.py \
  --json packages/api-gateway/data/printers.json \
  --api-json packages/api-gateway/data/printers.json \
  --sqlite packages/api-gateway/data/printers.sqlite \
  --sql scripts/seed-printers.sql

# filaments
python scripts/build-filaments-sqlite.py \
  --json packages/api-gateway/data/filaments.json \
  --sqlite packages/api-gateway/data/filaments.sqlite
```

### Notes
- Workflow is artifact-only (no auto-commit) to avoid noisy PRs. If you want auto-commits/PRs, we can add a flag in the workflow.
- Respect licenses when adding future model sources; prefer CC0/CC-BY/CC-BY-SA and store attribution in the dataset.







