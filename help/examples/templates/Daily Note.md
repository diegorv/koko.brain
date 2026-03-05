---
created: <% tp.date.now("YYYY-MM-DDTHH:mm:ss") %>
year: <% year %>
tags:
  - type/journal/daily
---

# Journal Daily - <% tp.date.now("ddd DD MMM YYYY") %>

## Navigation
> ◀️ [[<% yesterdayPath %>|Yesterday]] | 🗓️ <% tp.date.now("ddd DD MMM YYYY") %> | [[<% tomorrowPath %>|Tomorrow]] ▶️
> 📆 [[<% weekPath %>|Week]] | 🗂️ [[<% monthPath %>|Month]] | 🧭 [[<% quarterPath %>|Quarter]] | 🏁 [[<% yearPath %>|Year]]

## Work stuff

### **🔥 Top Priorities (max. 3)**
1.
2.
3.

### **🧩 Operational Tasks #to-list**
- [ ]
### *Notes/Thoughts*
-
-----
## Meeting file list:
```queryjs
await dv.view("__system/queryjs/meeting-list")
```
-----
-----
# **Bullet Journal**
## **☀️ Morning Kickstart**
| Metric        | Rating                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sleep Quality | `INPUT[inlineSelect(option(1,😞 very bad), option(2,🙁 bad), option(3,😐 ok), option(4,🙂 good), option(5,😄 excellent)):life_track_sleep_quality]` |
| Energy        | `INPUT[inlineSelect(option(1,😞 exhausted), option(2,🙁 low), option(3,😐 ok), option(4,🙂 good), option(5,😄 high)):life_track_energy]`            |
| Mood          | `INPUT[inlineSelect(option(1,😞 very bad), option(2,🙁 bad), option(3,😐 neutral), option(4,🙂 good), option(5,😄 great)):life_track_mood]`         |
|               |                                                                                                                                                    |
## 🎯 Day's Intention
🧠 *Brain Dump* — Write everything that's on your mind (5 min)

🧭 *Intention* — What's your priority for today?

---
## **🌙 Evening Closure**

> *"Don't judge the day by what happened,
but by how you chose to act."*
### **🌙 Reflection**
What was under my control today — and how did I react?

What wasn't — and how did I react?

Were my judgments rational or impulsive?

Where did I waste energy on what I can't control?

### ❤️ **Self-compassion**
Where was I excessive, negligent, or reactive with myself?

What can I adjust tomorrow with more moderation and clarity?

### 🧭 **Direction**
If I repeated today for a year, would I be closer or further from who I want to be?

---
### **🌱 Body & Mind**
| Habit                    | Rating                                                                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 💧 Water Intake          | `INPUT[inlineSelect(option(1,😞 almost none), option(2,🙁 little), option(3,😐 ok), option(4,🙂 good), option(5,😄 excellent)):life_track_health_water]`                          |
| 🧘 Meditation / Presence | `INPUT[inlineSelect(option(1,😞 none), option(2,🙁 very little), option(3,😐 few minutes), option(4,🙂 good practice), option(5,😄 deep practice)):life_track_health_meditation]` |
| 🏃 Movement / Stretching | `INPUT[inlineSelect(option(1,😞 none), option(2,🙁 minimal), option(3,😐 light), option(4,🙂 moderate), option(5,😄 intense)):life_track_health_exercices]`                       |
## **🌅 Tomorrow**
Review priorities and schedule: `INPUT[inlineSelect(option(1,😞 no), option(5,😄 yes)):life_track_agenda_review]`

Brain dump of thoughts (5 min)
