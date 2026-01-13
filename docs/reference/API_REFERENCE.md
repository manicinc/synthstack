# API Reference

This is the entry point for SynthStack’s API documentation.

## Base URL

- **REST API**: `/api/v1`
- **Swagger / OpenAPI UI**: `http(s)://<api-host>/docs`

## Authentication

Most authenticated routes require a bearer token:

```bash
Authorization: Bearer <token>
```

## Where to start

- **Quick endpoint + workflow examples**: `docs/reference/API_QUICK_REFERENCE.md`
- **Full endpoint list and schemas**: open the Swagger UI (`/docs`) while the API Gateway is running

## Common areas

- **Auth / Users**: session + user routes (see Swagger UI)
- **Projects / Portal**: project data, members, and activity
- **Billing**: Stripe integration and webhooks
- **Generation**: text + image generation (`/api/v1/generation/*`)

