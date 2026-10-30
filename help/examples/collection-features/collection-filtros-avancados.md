---
title: Collection - Filtros Avancados
tags:
  - collection
  - exemplo
---

# Filtros Avancados

## 1. Filtro com tag especifica (frontend)

```collection
filters:
  and:
    - 'file.folder.endsWith("/collection-features")'
    - "file.hasTag('frontend')"
views:
  - type: table
    name: Frontend Items
    order:
      - file.name
      - status
      - priority
      - assignee
```

## 2. Filtro AND composto (objetos)

```collection
filters:
  and:
    - 'file.folder.endsWith("/collection-features")'
    - "status == 'active'"
    - "priority == 'high'"
views:
  - type: table
    name: High Priority Active
    order:
      - file.name
      - assignee
      - progress
      - due
```

## 3. Filtro OR (bugs ou tasks)

```collection
filters:
  and:
    - 'file.folder.endsWith("/collection-features")'
  or:
    - "file.hasTag('bug')"
    - "file.hasTag('task')"
views:
  - type: table
    name: Bugs & Tasks
    order:
      - file.name
      - status
      - priority
      - assignee
    sort:
      - column: status
        direction: ASC
```

## 4. Filtro NOT (excluir pessoal)

```collection
filters:
  and:
    - 'file.folder.endsWith("/collection-features")'
  not:
    - "file.hasTag('pessoal')"
views:
  - type: table
    name: Work Items Only
    order:
      - file.name
      - status
      - tags
```

## 5. Filtro com expressao (progress > 50)

```collection
filters:
  and:
    - 'file.folder.endsWith("/collection-features")'
    - "progress > 50"
views:
  - type: table
    name: More Than Half Done
    order:
      - file.name
      - progress
      - status
```
