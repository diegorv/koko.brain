---
title: Collection - Projetos Ativos
tags:
  - collection
  - exemplo
---

# Projetos Ativos

Filtra apenas notas com status "active" e ordena por prioridade.

```collection
filters:
  and:
    - 'file.folder.endsWith("/collection-features")'
    - "status == 'active'"
views:
  - type: table
    name: Active Items
    order:
      - file.name
      - priority
      - assignee
      - progress
      - due
    sort:
      - column: priority
        direction: ASC
```
