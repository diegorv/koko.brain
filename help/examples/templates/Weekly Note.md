---
created: <% tp.date.now("YYYY-MM-DDTHH:mm:ss") %>
year: <% year %>
tags:
  - type/journal/weekly
---
# Weekly Journal - <% tp.date.now("[Week] WW · YYYY") %>

## Navigation

> ◀️ [[<% prevWeekPath %>|Prev Week]] | 🗓️ <% tp.date.now("[Week] WW · YYYY") %> | [[<% nextWeekPath %>|Next Week]] ▶️
> 🗂️ [[<% monthPath %>|Month]] | 🧭 [[<% quarterPath %>|Quarter]] | 🏁 [[<% yearPath %>|Year]]

---

# New week
## Week Planning

### Focus Areas
> _3 main priorities for the week

1. **Personal:**
2. **Work:**
3. **Growth:**

### Brain dump of thoughts (5 min)


---
# Weekly review

## Charts

### Wellness
```queryjs
dv.view("_system/queryjs/weekly-wellness-chart")
```

### Habits
```queryjs
dv.view("_system/queryjs/weekly-habits-chart")
```

## Life Check-in

### Life Satisfaction
> _How did I FEEL in each area this week? (1-5)_

| Area                      | Rating                                                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health & Energy           | `INPUT[inlineSelect(option(1,😞 drained), option(2,🙁 low), option(3,😐 ok), option(4,🙂 good), option(5,😄 energized)):satisfaction_health]`                            |
| Finances                  | `INPUT[inlineSelect(option(1,😞 critical), option(2,🙁 tight), option(3,😐 stable), option(4,🙂 comfortable), option(5,😄 thriving)):satisfaction_finances]`             |
| Work & Productivity       | `INPUT[inlineSelect(option(1,😞 stuck), option(2,🙁 struggling), option(3,😐 ok), option(4,🙂 productive), option(5,😄 excellent)):satisfaction_work]`                   |
| Learning & Growth         | `INPUT[inlineSelect(option(1,😞 stagnant), option(2,🙁 little), option(3,😐 ok), option(4,🙂 growing), option(5,😄 flourishing)):satisfaction_growth]`                   |
| Intimate Relationship     | `INPUT[inlineSelect(option(1,😞 distant), option(2,🙁 difficult), option(3,😐 ok), option(4,🙂 good), option(5,😄 excellent)):satisfaction_partner]`                     |
| Family & Friends          | `INPUT[inlineSelect(option(1,😞 disconnected), option(2,🙁 little contact), option(3,😐 ok), option(4,🙂 connected), option(5,😄 very close)):satisfaction_social]`      |
| Fun & Recreation          | `INPUT[inlineSelect(option(1,😞 none), option(2,🙁 little), option(3,😐 ok), option(4,🙂 good), option(5,😄 plenty)):satisfaction_fun]`                                  |
| Purpose & Meaning         | `INPUT[inlineSelect(option(1,😞 lost), option(2,🙁 unclear), option(3,😐 ok), option(4,🙂 aligned), option(5,😄 fulfilled)):satisfaction_purpose]`                       |

## Weekly Practices
> _What did I DO this week? Rate each practice (1-5)_

| Practice                                | Pillar      | Rating                                                                                                                                              |
| --------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exercising / going to the gym           | Body        | `INPUT[inlineSelect(option(1,😞 skipped), option(2,🙁 weak), option(3,😐 ok), option(4,🙂 good), option(5,😄 excellent)):practice_exercise]`            |
| Eating healthy                          | Body        | `INPUT[inlineSelect(option(1,😞 poor), option(2,🙁 weak), option(3,😐 ok), option(4,🙂 good), option(5,😄 excellent)):practice_eating]`                 |
| Quality sleep                           | Body        | `INPUT[inlineSelect(option(1,😞 bad), option(2,🙁 poor), option(3,😐 ok), option(4,🙂 good), option(5,😄 excellent)):practice_sleep]`                   |
| Journaling and reflecting               | Mind        | `INPUT[inlineSelect(option(1,😞 skipped), option(2,🙁 weak), option(3,😐 ok), option(4,🙂 good), option(5,😄 excellent)):practice_journaling]`          |
| High quality inputs (books, podcasts)   | Mind        | `INPUT[inlineSelect(option(1,😞 none), option(2,🙁 little), option(3,😐 ok), option(4,🙂 good), option(5,😄 excellent)):practice_inputs]`               |
| Focusing on high-return tasks           | Mind        | `INPUT[inlineSelect(option(1,😞 scattered), option(2,🙁 distracted), option(3,😐 ok), option(4,🙂 focused), option(5,😄 laser)):practice_focus]`        |
| Being present / meditation / unplugging | Spirit      | `INPUT[inlineSelect(option(1,😞 skipped), option(2,🙁 weak), option(3,😐 ok), option(4,🙂 good), option(5,😄 excellent)):practice_presence]`            |
| Quality time with important people      | Connections | `INPUT[inlineSelect(option(1,😞 none), option(2,🙁 little), option(3,😐 ok), option(4,🙂 good), option(5,😄 excellent)):practice_relationships]`        |
| Progress on personal projects           | Purpose     | `INPUT[inlineSelect(option(1,😞 none), option(2,🙁 little), option(3,😐 ok), option(4,🙂 good), option(5,😄 excellent)):practice_projects]`             |
| Time outdoors / nature                  | Well-being  | `INPUT[inlineSelect(option(1,😞 none), option(2,🙁 little), option(3,😐 ok), option(4,🙂 good), option(5,😄 excellent)):practice_outdoors]`             |

---

## Weekly Reflection

### Wins & Accomplishments


### Key Learnings
> _What breakthrough realizations did I have? How can I apply them?_

### Challenges & Improvements
> _What didn't go so well? How can I improve?_

### Priorities for Next Week
> _Did I focus on the best stuff? What should change?_


---

## Weekly Maintenance

- [ ] Schedule calendar and week focus
- [ ] Prepare tasks, habits, meetings for the week
- [ ] Do a 5-minute favor for someone
- [ ] Clean Desktop and Downloads
- [ ] Sort and clear files, apps, notes
- [ ] Clean room/house

---

## Notes


---

## Daily Notes

<% dailyLinksTable %>