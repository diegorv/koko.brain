---
title: Collection - Todos os Itens
tags:
  - collection
  - exemplo
---

# Todos os Itens (Apenas Filtro de Pasta)

Lists every note in this example folder with basic info. The folder filter keeps it from listing the whole vault when the folder is copied into another vault.

```collection
filters: 'file.folder.endsWith("/collection-features")'
views:
  - type: table
    name: All Notes
    order:
      - file.name
      - status
      - priority
      - tags
```
