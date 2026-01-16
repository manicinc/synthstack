# SynthStack Edition Matrix (Community vs PRO)

This is a practical “what do I actually get” comparison between the **Community** distribution and the **PRO** distribution.

## Licensing & Access

| Item | Community | PRO |
|------|-----------|-----|
| Source access | Public repo | Private repo (license holders) |
| License | Community License (modified MIT, non‑commercial) | Commercial license |
| Best for | Learning, evaluation, prototypes | Commercial use + advanced AI modules |

## Feature Matrix (Build-Time / Self-Hosted)

| Module | Community | PRO |
|--------|-----------|-----|
| Core platform (CMS, projects, billing scaffolding, portal) | ✅ | ✅ |
| Basic Copilot surfaces | ✅ | ✅ |
| Copilot RAG | ❌ | ✅ |
| AI Agents | ❌ | ✅ |
| Referral system | ❌ | ✅ |

## How Editions Are Selected

SynthStack uses **environment flags** for the self-hosted build:

| Flag | LITE / Community | PRO |
|------|------------------|-----|
| `ENABLE_COPILOT` | `true` | `true` |
| `ENABLE_COPILOT_RAG` | `false` | `true` |
| `ENABLE_AI_AGENTS` | `false` | `true` |
| `ENABLE_REFERRALS` | `false` | `true` |
| `VITE_ENABLE_COPILOT` | `true` | `true` |
| `VITE_ENABLE_COPILOT_RAG` | `false` | `true` |
| `VITE_ENABLE_AI_AGENTS` | `false` | `true` |
| `VITE_ENABLE_REFERRALS` | `false` | `true` |

## Environment Templates (Recommended)

Templates are safe to commit (`*.example`). Your real configs are gitignored (`.env`, `.env.lite`, `.env.pro`).

| Location | LITE template | PRO template |
|----------|---------------|--------------|
| Repo root | `.env.lite.example` | `.env.pro.example` |
| Web app | `apps/web/.env.lite.example` | `apps/web/.env.pro.example` |
| Production deploy | `deploy/.env.example` | `deploy/.env.example` |

## Setup Wizards (Public-Friendly)

Both editions include:

- `/setup/branding` — exports `config.json` for consistent branding.
- `/setup/env` — exports `.env` files rendered from the repo templates.

