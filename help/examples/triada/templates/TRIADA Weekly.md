---
created: <% tp.date.now("YYYY-MM-DDTHH:mm:ss") %>
year: <% year %>
tags:
  - type/journal/weekly
---

# Week <% week %> · <% year %>

> ◀️ [[<% prevWeekPath %>|Prev Week]] | [[<% nextWeekPath %>|Next Week]] ▶️
> 🗂️ [[<% monthPath %>|Month]] | 🧭 [[<% quarterPath %>|Quarter]]

## This month's three
```queryjs
kb.view('__system/queryjs/triada-parent-outcomes', { unit: 'month', parentTag: 'type/journal/monthly', parentLabel: 'Month' })
```

## Weekly outcomes (WO)
> _Three outcomes that, by Friday, move the month forward. Past tense._

- [ ] I have  #outcome
- [ ] I have  #outcome
- [ ] I have  #outcome

---

# Friday reflection (FR)
> _Friday evening or Saturday morning, once the week has settled._

## The week in numbers
```queryjs
kb.view('__system/queryjs/triada-rollup', { unit: 'week', childTag: 'type/journal/daily', childLabel: 'Day' })
```

## Movement
```queryjs
kb.view('__system/queryjs/triada-moved')
```

## Three wins
1.
2.
3.

## Three things to improve
1.
2.
3.

## Re-read the week
> _Which outcomes gave you a jolt on re-reading? Which left you flat? A flat one was probably not yours. Rewrite or drop it._


## Weekly review (GTD)
- [ ] Empty the inbox: process every #inbox item (do, schedule, delegate, drop)
- [ ] Run a mind sweep if the head feels full
- [ ] Carry, rewrite or drop each outcome that was not shipped
- [ ] Write next week's three outcomes

## Inbox
```queryjs
kb.view('__system/queryjs/triada-inbox')
```

---

## Days
<% dailyLinksTable %>
