# Troubleshooting

## Docker/Compose issues

### Containers won’t start

```bash
docker compose ps
docker compose logs -f --tail=200
```

### “Port already in use”

Stop the conflicting process or change the mapped ports in your compose file.

```bash
lsof -i :3000
```

## API issues

### 401 Unauthorized

Most API routes require a bearer token. Ensure the frontend is sending:

```bash
Authorization: Bearer <token>
```

### 404 on feature routes

Feature-gated modules can be disabled in either backend or frontend. Check:

- Backend env: `ENABLE_COPILOT`, `ENABLE_REFERRALS`
- Frontend env: `VITE_ENABLE_COPILOT`, `VITE_ENABLE_REFERRALS`

See `docs/VERSIONS.md` for edition differences.

## Local dev gotchas

### `pnpm install` errors

```bash
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Database connection errors

Confirm Postgres is healthy and your `DATABASE_URL` matches the running container.

