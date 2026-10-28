# TRIADA in Kokobrain

A setup for the [TRIADA](https://maxclax.com/triada) method: three outcomes at every level (day, week, month, quarter), built on Agile Results (Rule of Three), The 12 Week Year (the quarter is the year) and the GTD inbox + weekly review.

## Files

| File | Purpose |
|------|---------|
| `templates/TRIADA Daily.md` | Three daily outcomes, the week's three in view, "why not move" select, journal |
| `templates/TRIADA Weekly.md` | Weekly outcomes (WO), Friday reflection (FR) with rollups, GTD weekly review, inbox |
| `templates/TRIADA Monthly.md` | Monthly outcomes, monthly reflection (MR) over the weeks |
| `templates/TRIADA Quarterly.md` | The 12-week year: three yearly outcomes, yearly reflection (YR) |
| `templates/TRIADA Mind Sweep.md` | GTD mind sweep, every item captured as an `#inbox` task |
| `__system/queryjs/triada-rollup.js` | Child periods inside the current period and how many outcomes shipped |
| `__system/queryjs/triada-parent-outcomes.js` | The three outcomes of the period above, kept in view |
| `__system/queryjs/triada-moved.js` | Days with movement this week vs last week |
| `__system/queryjs/triada-inbox.js` | Open `#inbox` tasks across the vault |
| `__system/queryjs/_shared-triada.js` | Helpers shared by the scripts |

## Conventions

- **Outcome** = a task tagged `#outcome`, written in the past tense: `- [ ] I have shipped the beta #outcome`.
- **Inbox item** = a task tagged `#inbox`. Quick Capture into any note works; process them in the weekly review.
- **Period notes** are found by their `type/journal/*` tag and `created` date, both written by the templates.
- **Movement** is the `moved` property on the daily note (`none` means no movement).

## Setup

1. Copy `templates/` into your templates folder and `__system/queryjs/` to `__system/queryjs/` at the vault root. If you use another folder, update the `kb.view('__system/queryjs/...')` paths in the templates and in the scripts.
2. **Settings → Periodic Notes**: point Daily, Weekly, Monthly and Quarterly at the four TRIADA templates.
3. Optional: run a 12-week cycle with a full year instead by adding a yearly note; the method treats the quarter as the year.

## Rhythm

| When | Where | What |
|------|-------|------|
| Every morning | Daily note | Write three outcomes. Pull one inbox item at a time. |
| Monday | Weekly note | Write three weekly outcomes under the month's three. |
| Friday evening | Weekly note, FR | Read the rollup, three wins, three improvements, empty the inbox. |
| Month end | Monthly note, MR | Read the week rollup, decide what changes. |
| Quarter end | Quarterly note, YR | Read month and week rollups, set the next 12 weeks. |
| When the head is full | Mind Sweep | Dump everything as `#inbox`. |

Missed a day? Open the next one. No streaks.
