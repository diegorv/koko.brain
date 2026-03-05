---
title: Collection - Todos os Itens
tags:
  - collection
  - exemplo
---

# Todos os Itens (Sem Filtro)

Lista todas as notas do vault com informacoes basicas.

```collection
views:
  - type: table
    name: All Notes
    order:
      - file.name
      - status
      - priority
      - tags
```
