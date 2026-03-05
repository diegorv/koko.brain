---
title: Collection - Formulas e Campos Calculados
tags:
  - collection
  - exemplo
---

# Formulas e Campos Calculados

## 1. Campo calculado simples (remaining %)

```collection
filters: "progress != null"
formulas:
  remaining: "100 - progress"
views:
  - type: table
    name: Progress Tracker
    order:
      - file.name
      - progress
      - formula.remaining
      - status
properties:
  formula.remaining:
    displayName: Remaining %
```

## 2. Campo calculado condicional (status emoji)

```collection
formulas:
  statusLabel: "if(status == 'completed', 'Done', if(status == 'active', 'In Progress', if(status == 'planning', 'Planning', 'Backlog')))"
views:
  - type: table
    name: Status Labels
    order:
      - file.name
      - formula.statusLabel
      - priority
properties:
  formula.statusLabel:
    displayName: Status
```

## 3. Formula com prioridade numerica (para sort)

```collection
formulas:
  priorityScore: "if(priority == 'critical', 4, if(priority == 'high', 3, if(priority == 'medium', 2, 1)))"
views:
  - type: table
    name: By Priority Score
    order:
      - file.name
      - priority
      - formula.priorityScore
      - status
    sort:
      - column: formula.priorityScore
        direction: DESC
properties:
  formula.priorityScore:
    displayName: Score
```
