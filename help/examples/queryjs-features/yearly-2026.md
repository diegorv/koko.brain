---
created: 2026-01-01
tags:
  - type/journal/yearly
---

# 2026

## Sleep Quality Heatmap

```queryjs
kb.view("Resources/help/examples/queryjs-features/__system/queryjs/yearly-sleep-heatmap")
```

## Exercise Heatmap

```queryjs
kb.view("Resources/help/examples/queryjs-features/__system/queryjs/yearly-exercise-heatmap")
```

## Overall Wellness Heatmap

```queryjs
kb.view("Resources/help/examples/queryjs-features/__system/queryjs/yearly-wellness-heatmap")
```

## Heatmap Calendar (inline)

```queryjs
const dailies = kb.pages('#type/journal/daily');

kb.ui.heatmapCalendar(
  dailies.map(p => {
    const dt = kb.tryDate(p.created);
    return {
      date: dt ? dt.toISODate() : '',
      intensity: kb.number(p.life_track_mood),
    };
  }).array(),
  {
    year: 2026,
    colors: {
      default: ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a'],
    },
    intensityScaleStart: 1,
    intensityScaleEnd: 5,
  }
)
```

## Sleep — Vertical Calendar

```queryjs
kb.view("Resources/help/examples/queryjs-features/__system/queryjs/yearly-sleep-vertical")
```

## Exercise — Vertical Calendar

```queryjs
kb.view("Resources/help/examples/queryjs-features/__system/queryjs/yearly-exercise-vertical")
```

## Yearly Calendar (inline)

```queryjs
const dailies = kb.pages('#type/journal/daily');

kb.ui.yearlyCalendar(
  dailies.map(p => {
    const dt = kb.tryDate(p.created);
    return {
      date: dt ? dt.toISODate() : '',
      intensity: kb.number(p.life_track_mood),
    };
  }).array(),
  {
    year: 2026,
    colors: {
      default: ['#fef3c7', '#fcd34d', '#f59e0b', '#d97706', '#92400e'],
    },
    intensityScaleStart: 1,
    intensityScaleEnd: 5,
  }
)
```
