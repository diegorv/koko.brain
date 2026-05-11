---
type: dashboard
tags: [dashboard]
---

# Vault dashboard

A reusable dashboard that composes the new scripts in `__system/queryjs/`.
Open this note in Kokobrain to see everything render at once.

## Overview cards

```queryjs
kb.view("__system/queryjs/vault-overview-cards");
```

## Recent edits

```queryjs
kb.view("__system/queryjs/recent-edits-timeline");
```

## Projects

```queryjs
kb.view("__system/queryjs/project-status-cards");
```

```queryjs
kb.view("__system/queryjs/project-progress-bars");
```

## Tags

```queryjs
kb.view("__system/queryjs/vault-tag-cloud");
```

```queryjs
kb.view("__system/queryjs/tag-heatmap");
```

## Shortlist

```queryjs
kb.view("__system/queryjs/note-shortlist");
```
