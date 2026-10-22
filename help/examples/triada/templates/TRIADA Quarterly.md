---
created: <% tp.date.now("YYYY-MM-DDTHH:mm:ss") %>
year: <% year %>
tags:
  - type/journal/quarterly
---

# Q<% quarter %> <% year %> · the 12-week year

> ◀️ [[<% prevQuarterPath %>|Prev Quarter]] | [[<% nextQuarterPath %>|Next Quarter]] ▶️

## Yearly outcomes (for these 12 weeks)
> _The quarter is the year. Three outcomes you can point at in 12 weeks and say "I shipped that". A closer outcome is a better outcome._

- [ ] I have  #outcome
- [ ] I have  #outcome
- [ ] I have  #outcome

---

# Yearly reflection (YR)

## Months
```queryjs
kb.view('__system/queryjs/triada-rollup', { unit: 'quarter', childTag: 'type/journal/monthly', childLabel: 'Month' })
```

## Weeks
```queryjs
kb.view('__system/queryjs/triada-rollup', { unit: 'quarter', childTag: 'type/journal/weekly', childLabel: 'Week' })
```

## What I shipped

## What I would not repeat

## What the next 12 weeks are about


---

## Months
<% monthlyLinksTable %>
