# Directus Flows for Node-RED Integration

This directory contains Directus Flow definitions that enable bi-directional communication between Directus and Node-RED.

## Overview

These flows serve as event triggers that notify Node-RED when specific events occur in Directus. Each flow sends a webhook to the API Gateway's Node-RED endpoints.

## Available Flows

### Event-Based Triggers

| Flow | Event | Description |
|------|-------|-------------|
| On Project Created | `items.create` on `projects` | Triggers when a new project is created |
| On Project Updated | `items.update` on `projects` | Triggers when a project is updated |
| On User Registered | `items.create` on `directus_users` | Triggers when a new user registers |
| On Subscription Changed | `items.create/update` on `subscriptions` | Triggers when subscription status changes |
| On Invoice Created | `items.create` on `invoices` | Triggers when a new invoice is generated |
| On Comment Added | `items.create` on `conversation_messages` | Triggers when a comment is posted |

### Schedule-Based Triggers

| Flow | Schedule | Description |
|------|----------|-------------|
| Scheduled Daily | `0 6 * * *` (6 AM UTC) | Daily trigger for batch operations |
| Scheduled Hourly | `0 * * * *` (every hour) | Hourly trigger for recurring tasks |

## Configuration

### Environment Variables Required

Add these to your Directus `.env`:

```env
API_GATEWAY_URL=http://localhost:3001
NODERED_INTERNAL_TOKEN=your-secure-internal-token
```

### Import Flows

To import these flows into Directus:

1. Go to **Settings > Flows**
2. Click **Import**
3. Select `nodered-triggers.json`
4. Review and activate desired flows

### Manual Import via API

```bash
# Using Directus API
curl -X POST "http://localhost:8055/flows" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @nodered-triggers.json
```

## Node-RED Endpoints

These flows send webhooks to the following Node-RED HTTP-in endpoints:

- `POST /api/wf/directus/project-created`
- `POST /api/wf/directus/project-updated`
- `POST /api/wf/directus/user-registered`
- `POST /api/wf/directus/subscription-changed`
- `POST /api/wf/directus/invoice-created`
- `POST /api/wf/directus/comment-added`
- `POST /api/wf/directus/daily-schedule`
- `POST /api/wf/directus/hourly-schedule`

## Security

All webhook requests include:

1. **Authorization Header**: Bearer token for authentication
2. **Event Payload**: Full event data from Directus

The `NODERED_INTERNAL_TOKEN` should be:
- A long, random string (32+ characters)
- Stored securely in environment variables
- Validated by Node-RED's HTTP-in nodes

## Creating Custom Triggers

To add a new trigger:

1. Create a new Directus Flow
2. Set trigger type (event or schedule)
3. Add HTTP Request operation to call Node-RED
4. Include proper authorization headers
5. Format the payload as needed

Example minimal flow operation:

```json
{
  "type": "request",
  "options": {
    "url": "{{$env.API_GATEWAY_URL}}/api/wf/directus/custom-event",
    "method": "POST",
    "headers": [
      {
        "header": "Authorization",
        "value": "Bearer {{$env.NODERED_INTERNAL_TOKEN}}"
      }
    ],
    "body": "{{$last}}"
  }
}
```


