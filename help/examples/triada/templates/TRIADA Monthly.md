---
created: <% tp.date.now("YYYY-MM-DDTHH:mm:ss") %>
year: <% year %>
tags:
  - type/journal/monthly
---

# <% tp.date.now("MMMM YYYY") %>

> ◀️ [[<% prevMonthPath %>|Prev Month]] | [[<% nextMonthPath %>|Next Month]] ▶️
> 🧭 [[<% quarterPath %>|Quarter]]

## This quarter's three
```queryjs
kb.view('__system/queryjs/triada-parent-outcomes', { unit: 'quarter', parentTag: 'type/journal/quarterly', parentLabel: 'Quarter' })
```

## Monthly outcomes
> _Three outcomes for the month, each one a step toward the quarter. Past tense._

- [ ] I have  #outcome
- [ ] I have  #outcome
- [ ] I have  #outcome

---

# Monthly reflection (MR)

## Weeks
```queryjs
kb.view('__system/queryjs/triada-rollup', { unit: 'month', childTag: 'type/journal/weekly', childLabel: 'Week' })
```

## Three wins
1.
2.
3.

## What I learned

## What changes next month


---

## Weeks
<% weeklyLinksTable %>
