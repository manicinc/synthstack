# Tech Stack

SynthStack is a TypeScript-first SaaS platform built as a monorepo. It ships a modern web UI, a production-ready API layer, a CMS for content, and optional AI/ML services.

## Frontend

- **Vue 3 + Quasar** (`apps/web`) for a fast, cross-platform UI foundation
- **TypeScript + Vite** for DX, type-safety, and builds
- **Pinia** stores for client state
- **Vue Router** for app + docs routing

## Backend

- **Node.js + TypeScript**
- **Fastify API Gateway** (`packages/api-gateway`) exposing REST endpoints under `/api/v1`
- **PostgreSQL** (optionally with **pgvector**) for relational + vector workloads
- **Redis** for cache, queues, and background coordination

## CMS & Content

- **Directus** (`services/directus`) for admin UI, content collections, and visual editing

## AI / ML

SynthStack supports multiple backends depending on your needs:

- **TypeScript-first ML service**: recommended when you want a single-language codebase and lighter dependencies
- **Python ML services (FastAPI / Django)**: recommended when you need heavier ML dependencies or Python-native tooling
- **Vector search (Qdrant)**: used for semantic search / RAG when enabled

## DevOps & Deployment

- **Docker Compose** is the default operational story for local dev and self-hosting
- **Production compose** lives at `deploy/docker-compose.yml`

## Repo Layout (high-level)

- `apps/web` — frontend app + in-app docs UI
- `packages/api-gateway` — REST API, auth, billing, docs API
- `services/*` — infra services (e.g., Directus)

## Editions

- **LITE (Community Edition)**: core platform
- **PRO (Commercial Edition)**: adds advanced features like Copilot, Referrals, and additional automation

See `docs/VERSIONS.md` for edition-specific details.

