---
title: Collection - Edge Cases
tags:
  - collection
  - exemplo
---

# Edge Cases

## 1. Filtro que nao retorna nada

```collection
filters: "file.hasTag('tag-que-nao-existe')"
views:
  - type: table
    name: Empty Result
    order:
      - file.name
      - status
```

## 2. View com filtro especifico da view (alem do global)

```collection
filters: "status != 'backlog'"
views:
  - type: table
    name: Active Non-Bugs
    filters: "!file.hasTag('bug')"
    order:
      - file.name
      - status
      - priority
```

## 3. Bloco collection vazio (deve mostrar erro)

```collection
```

## 4. YAML invalido (deve mostrar erro sem crashar)

```collection
views: not-an-array
```

## 5. View sem type (deve mostrar erro)

```collection
views:
  - name: Missing Type
    order:
      - file.name
```

## 6. Views vazio (deve mostrar erro)

```collection
views: []
```
