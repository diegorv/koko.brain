---
tags: [engineering, standards, api]
date: 2025-01-09
---

# API Design Guidelines

## Naming conventions
- Use plural nouns for resources: `/users`, `/orders`, `/products`
- Use kebab-case for multi-word paths: `/order-items`, `/user-profiles`
- Avoid verbs in URLs — the HTTP method IS the verb

## HTTP methods
| Method | Purpose | Idempotent? |
|--------|---------|-------------|
| GET | Retrieve a resource | Yes |
| POST | Create a new resource | No |
| PUT | Replace a resource entirely | Yes |
| PATCH | Partially update a resource | No |
| DELETE | Remove a resource | Yes |

## Response format
Always return JSON with consistent structure:
```json
{
  "data": { ... },
  "meta": { "page": 1, "totalPages": 5 },
  "errors": []
}
```

## Error handling
Use standard HTTP status codes:
- `400` — Bad request (validation failure)
- `401` — Not authenticated
- `403` — Authenticated but not authorized
- `404` — Resource not found
- `409` — Conflict (e.g., duplicate email)
- `422` — Unprocessable entity (semantic validation)
- `429` — Rate limited
- `500` — Internal server error (our fault, never intentional)

## Pagination
Use cursor-based pagination for large datasets:
```
GET /users?cursor=abc123&limit=20
```

## Versioning
Prefix all routes with version: `/v1/users`. Never break existing contracts. Deprecate with 6-month notice period.

## Authentication
All endpoints require Bearer token except:
- `POST /v1/auth/login`
- `POST /v1/auth/register`
- `GET /v1/health`
