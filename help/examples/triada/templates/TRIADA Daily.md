---
created: <% tp.date.now("YYYY-MM-DDTHH:mm:ss") %>
year: <% year %>
moved: none
tags:
  - type/journal/daily
---

# <% tp.date.now("ddd DD MMM YYYY") %>

> ◀️ [[<% yesterdayPath %>|Yesterday]] | [[<% tomorrowPath %>|Tomorrow]] ▶️
> 📆 [[<% weekPath %>|Week]] | 🗂️ [[<% monthPath %>|Month]] | 🧭 [[<% quarterPath %>|Quarter]]

**Why not move today?** `INPUT[inlineSelect(option(none,—), option(walk,🚶 walk), option(run,🏃 run), option(gym,🏋️ gym), option(yoga,🧘 yoga), option(other,✨ other)):moved]`

## Three outcomes
> _Past tense, as if already done: "I have shipped X". Three, not five._

- [ ] I have  #outcome
- [ ] I have  #outcome
- [ ] I have  #outcome

## This week's three
```queryjs
kb.view('__system/queryjs/triada-parent-outcomes', { unit: 'week', parentTag: 'type/journal/weekly', parentLabel: 'Week' })
```

## Pulled from the inbox
> _One item at a time, while the three stay in view._

- [ ]

## Journal

