---
title: Bug - Login Timeout
status: active
priority: critical
tags:
  - bug
  - backend
  - auth
assignee: Diego
progress: 40
due: 2026-02-20
created: 2026-02-10
---

# Bug: Login Timeout

Usuarios reportando timeout no login apos update do OAuth provider.

## Investigacao
- Token refresh esta falhando silenciosamente
- Retry logic nao implementada no client
