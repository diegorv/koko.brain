---
tags: [meeting, product, review]
date: 2025-01-14
---

# Product Review: Dashboard Analytics Feature

## Attendees
Ana (PM), Diego (Eng Lead), Jorge (Design), Carla (Data), Roberto (QA)

## Demo summary
Jorge walked through the new analytics dashboard. It includes:
- Real-time visitor count with sparkline charts
- Conversion funnel visualization (visit → signup → purchase)
- Cohort retention heatmap
- Export to CSV functionality

## Feedback

### What looks great
- The retention heatmap is intuitive and visually compelling
- Loading states and empty states are well-handled
- Mobile responsive layout works surprisingly well for data-heavy screens

### Concerns raised
- **Performance**: Carla flagged that the cohort query takes 12 seconds on large datasets. Need to add pre-aggregation or caching.
- **Accessibility**: Color-only encoding on the heatmap won't work for colorblind users. Add numeric labels.
- **Scope**: Real-time visitor count requires WebSocket infrastructure we don't have yet. Can we defer to v2?

## Decisions
1. Ship v1 without real-time — use polling every 60 seconds instead
2. Add numeric labels to all visualizations for accessibility
3. Carla will create a materialized view for cohort data to fix performance
4. Target release: Sprint 15 (Feb 3)

## Open questions
- Should we gate this behind a premium plan or make it available to all users?
- How do we handle data for accounts with 1M+ events?
