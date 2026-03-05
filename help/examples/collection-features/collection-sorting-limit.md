---
title: Collection - Sorting e Limit
tags:
  - collection
  - exemplo
---

# Sorting e Limit

## 1. Sort simples (por nome A-Z)

```collection
views:
  - type: table
    name: Alphabetical
    order:
      - file.name
      - status
      - priority
    sort:
      - column: file.name
        direction: ASC
```

## 2. Sort multiplo (status ASC, priority DESC)

```collection
views:
  - type: table
    name: Status + Priority
    order:
      - file.name
      - status
      - priority
      - progress
    sort:
      - column: status
        direction: ASC
      - column: priority
        direction: DESC
```

## 3. Limit (top 3 por progress)

```collection
views:
  - type: table
    name: Top 3 Progress
    order:
      - file.name
      - progress
      - status
    sort:
      - column: progress
        direction: DESC
    limit: 3
```

## 4. Limit com filtro (2 bugs mais recentes)

```collection
filters: "file.hasTag('bug')"
views:
  - type: table
    name: Latest Bugs
    order:
      - file.name
      - priority
      - assignee
      - status
    sort:
      - column: file.mtime
        direction: DESC
    limit: 2
```
