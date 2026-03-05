# Periodic Notes & Calendar

Learn how to set up daily, weekly, monthly, quarterly, and yearly notes with automatic templates and calendar integration.

## What Are Periodic Notes?

Periodic notes are time-based notes -- one per day, week, month, quarter, or year. They are automatically named and placed in folders based on configurable date formats, making it easy to maintain a consistent structure over time.

Periodic notes are great for:

- **Daily journaling** -- capture thoughts, tasks, and events each day
- **Weekly reviews** -- reflect on the past week and plan the next one
- **Monthly planning** -- set goals and track progress across the month
- **Quarterly goals** -- define higher-level objectives and review outcomes

Each note can be created from a template with pre-filled content, so you never start from a blank page.

## The Calendar Panel

The calendar panel is located in the right sidebar. Toggle it with **Cmd+B**.

It displays a monthly calendar grid where you can navigate between months and years, create periodic notes, and see which days already have a daily note.

**Dot indicators**: Small dots appear below days that have an existing daily note, giving you a quick visual overview of your journaling activity.

![Calendar panel](screenshots/calendar.png)

### Interactions

| Click target | What happens |
|---|---|
| A day cell | Opens or creates the daily note for that date |
| Week number (left column) | Opens or creates the weekly note for that week |
| Month name (header) | Opens or creates the monthly note |
| Quarter badge (Q1-Q4) | Opens or creates the quarterly note |
| ◀ / ▶ arrows | Navigate to previous/next month |
| Year arrows | Navigate to previous/next year |

### Selected Date

When you click a day, a panel below the calendar shows:

- A **"Daily note"** button to open or create that day's note
- A list of files created or modified on that date

This makes the calendar a useful tool not just for periodic notes, but for browsing your vault's activity by date.

## Configuration

Open **Settings → Periodic Notes** to customize how periodic notes are generated.

### Base Folder

The root folder inside your vault where all periodic notes are stored.

Example: `_notes`

All periodic notes will be created under this folder, with subfolders determined by the format string.

### Per Period Type (Daily, Weekly, Monthly, Quarterly)

Each period type has its own settings:

| Setting | Description | Example |
|---|---|---|
| **Format** | A dayjs format string that determines the folder structure and filename | `YYYY/MM-MMM/_journal-day-DD-MM-YYYY` |
| **Template** | Path to a template file used when creating the note | `_templates/daily.md` |

### Daily-Only Settings

- **Auto-open**: Automatically opens today's daily note when the vault loads. Useful if daily journaling is the first thing you do.
- **Auto-pin**: Pins the daily note tab so it cannot be accidentally closed. The pinned tab stays at the left edge of your tab bar.

## Understanding Format Strings

Format strings use [dayjs tokens](https://day.js.org/docs/en/display/format) to generate file paths. The format determines both the folder hierarchy and the filename.

### Available Tokens

| Token | Output | Example |
|---|---|---|
| `YYYY` | 4-digit year | `2026` |
| `YY` | 2-digit year | `26` |
| `MM` | Month (zero-padded) | `02` |
| `MMM` | Month abbreviation | `Feb` |
| `MMMM` | Month full name | `February` |
| `DD` | Day (zero-padded) | `17` |
| `WW` | ISO week number | `07` |
| `Q` | Quarter | `1` |
| `ddd` | Day of week abbreviation | `Mon` |
| `dddd` | Day of week full | `Monday` |

### Example: Format to Path

Given the following configuration:

- **Base folder**: `_notes`
- **Format**: `YYYY/MM-MMM/journal-DD-MM-YYYY`
- **Date**: February 17, 2026

The resulting path is:

```
_notes/2026/02-Feb/journal-17-02-2026.md
```

The `/` characters in the format string create subfolders automatically. Kokobrain will create any missing folders in the path when the note is first generated.

## Template Variables

When a periodic note is created from a template, special variables are replaced with values based on the note's date. Variables use the `<% variable %>` syntax.

### Common Variables (All Period Types)

These variables are available in every periodic note template:

| Variable | Value | Example |
|---|---|---|
| `<% year %>` | 4-digit year | `2026` |
| `<% month %>` | Zero-padded month | `02` |
| `<% monthName %>` | Full month name | `February` |
| `<% week %>` | ISO week number | `07` |
| `<% quarter %>` | Quarter number | `1` |
| `<% yearPath %>` | Wikilink path to the yearly note | `_notes/2026/2026` |

### Daily Note Variables

| Variable | Value |
|---|---|
| `<% yesterdayPath %>` | Wikilink path to yesterday's daily note |
| `<% tomorrowPath %>` | Wikilink path to tomorrow's daily note |
| `<% weekPath %>` | Wikilink path to this week's weekly note |
| `<% monthPath %>` | Wikilink path to this month's monthly note |
| `<% quarterPath %>` | Wikilink path to this quarter's quarterly note |

### Weekly Note Variables

| Variable | Value |
|---|---|
| `<% prevWeekPath %>` | Wikilink path to last week's note |
| `<% nextWeekPath %>` | Wikilink path to next week's note |
| `<% monthPath %>` | Wikilink path to this month's monthly note |
| `<% quarterPath %>` | Wikilink path to this quarter's quarterly note |
| `<% dailyLinksTable %>` | Markdown table with wikilinks to each day (Mon--Sun) |

### Monthly Note Variables

| Variable | Value |
|---|---|
| `<% prevMonthPath %>` | Wikilink path to last month's note |
| `<% nextMonthPath %>` | Wikilink path to next month's note |
| `<% quarterPath %>` | Wikilink path to this quarter's quarterly note |
| `<% weeklyLinksTable %>` | Markdown table with wikilinks to each week |

### Quarterly Note Variables

| Variable | Value |
|---|---|
| `<% prevQuarterPath %>` | Wikilink path to last quarter's note |
| `<% nextQuarterPath %>` | Wikilink path to next quarter's note |
| `<% monthlyLinksTable %>` | Markdown table with wikilinks to each month in the quarter |

### Yearly Note Variables

| Variable | Value |
|---|---|
| `<% prevYearPath %>` | Wikilink path to last year's note |
| `<% nextYearPath %>` | Wikilink path to next year's note |
| `<% quarterlyLinksTable %>` | Markdown table with wikilinks to each quarter (Q1--Q4) |

## Example Daily Template

Here is a practical template for daily notes. Save it as `_templates/daily.md` in your vault:

```markdown
---
date: <% tp.date.now("YYYY-MM-DD") %>
tags: [daily]
---

# <% tp.file.title %>

◀ [[<% yesterdayPath %>|Yesterday]] | [[<% tomorrowPath %>|Tomorrow]] ▶ | [[<% weekPath %>|Week]]

## Tasks
- [ ]

## Notes


## Journal

```

This template creates a note with navigation links to the previous and next day, a link to the weekly note, and sections for tasks, notes, and free-form journaling.

## Example Weekly Template

Save this as `_templates/weekly.md` in your vault:

```markdown
---
date: <% tp.date.now("YYYY-MM-DD") %>
tags: [weekly]
---

# Week <% week %>, <% year %>

◀ [[<% prevWeekPath %>|Previous Week]] | [[<% nextWeekPath %>|Next Week]] ▶ | [[<% monthPath %>|Month]]

## Days
<% dailyLinksTable %>

## Weekly Review


## Goals for Next Week

```

The `<% dailyLinksTable %>` variable generates a markdown table with wikilinks to each day of the week (Monday through Sunday), making it easy to navigate to individual daily notes.

## Wikilink Detection

Kokobrain automatically detects when you click a wikilink that matches a periodic note pattern. Instead of creating a regular note, it creates the periodic note for the matching date using the correct template.

For example, clicking `[[_notes/2026/02-Feb/journal-18-02-2026]]` in any note will create a daily note for February 18, 2026 using your configured daily template -- even if that note does not exist yet.

This means the navigation links in your templates (like the "Yesterday" and "Tomorrow" links in the daily template above) work seamlessly: clicking them always creates properly templated notes.

## Next Steps

- [Quick Notes & Templates](09-quick-notes-and-templates.md) -- Other ways to create structured notes
- [Sidebar Panels](07-sidebar-panels.md) -- Calendar panel and properties
