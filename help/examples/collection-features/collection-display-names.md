---
title: Collection - Display Names e Colunas Custom
tags:
  - collection
  - exemplo
---

# Display Names e Colunas Custom

## 1. Renomear colunas com displayName

```collection
views:
  - type: table
    name: Custom Columns
    order:
      - file.name
      - status
      - assignee
      - progress
      - due
properties:
  file.name:
    displayName: Note
  assignee:
    displayName: Owner
  progress:
    displayName: "Progress (%)"
  due:
    displayName: Deadline
```

## 2. Apenas metadados de arquivo

```collection
views:
  - type: table
    name: File Metadata
    order:
      - file.name
      - file.folder
      - file.ext
      - file.size
properties:
  file.name:
    displayName: File
  file.folder:
    displayName: Folder
  file.ext:
    displayName: Extension
  file.size:
    displayName: Size (bytes)
```
