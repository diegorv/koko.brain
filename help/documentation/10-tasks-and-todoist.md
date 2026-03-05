# Tasks & Todoist

Learn how to track tasks across your vault and sync with Todoist.

Kokobrain scans every Markdown file in your vault for checkbox items and presents them in a single, unified Tasks View. You can filter, toggle, and even push tasks to Todoist without leaving the app.

---

## Tasks View

Open the Tasks View with **Cmd+Shift+T**, or search for **"Toggle Tasks View"** in the Command Palette.

The Tasks View is a *virtual tab* — it is not a file on disk. Instead, it is generated on the fly by scanning every `.md` file in your vault for checkbox lines (`- [ ]`, `- [x]`, and other statuses). Tasks are grouped by their source file and sorted by file modification date, so the most recently edited notes appear first.

![Tasks View with grouped tasks](screenshots/tasks-view.png)

---

## Writing Tasks in Your Notes

Tasks are standard Markdown checkboxes. Write them anywhere in any note:

```markdown
- [ ] Buy groceries
- [ ] Review the quarterly report
- [x] Send email to team
```

There is no special syntax required — any line that starts with `- [ ]` or `- [x]` (including the extended statuses below) will be picked up automatically.

---

## Task Statuses

Kokobrain supports extended task statuses beyond the standard `[ ]` and `[x]`:

| Syntax   | Status      | Meaning                        |
|----------|-------------|--------------------------------|
| `- [ ]`  | Todo        | Pending task                   |
| `- [x]`  | Done        | Completed task                 |
| `- [/]`  | In Progress | Currently being worked on      |
| `- [-]`  | Cancelled   | No longer needed               |
| `- [?]`  | Question    | Needs clarification            |
| `- [>]`  | Forwarded   | Delegated or moved elsewhere   |
| `- [!]`  | Important   | High priority marker           |

---

## Task Metadata (Emoji Signifiers)

You can add structured metadata to tasks using emoji signifiers, following the Obsidian Tasks plugin convention.

### Dates

| Emoji | Meaning        | Example                                      |
|-------|----------------|----------------------------------------------|
| 📅    | Due date       | `- [ ] Finish report 📅 2026-02-20`          |
| ⏳    | Scheduled date | `- [ ] Start research ⏳ 2026-02-18`         |
| 🛫    | Start date     | `- [ ] Begin project 🛫 2026-02-15`          |
| ➕    | Created date   | `- [ ] New task ➕ 2026-02-01`               |
| ✅    | Done date      | `- [x] Old task ✅ 2026-02-10`               |
| ❌    | Cancelled date | `- [-] Dropped task ❌ 2026-02-12`           |

### Priority

| Emoji | Priority |
|-------|----------|
| 🔺    | Highest  |
| 🔼    | High     |
| 🔽    | Low      |
| ⏬    | Lowest   |

### Other metadata

| Emoji | Meaning                  | Example            |
|-------|--------------------------|--------------------|
| 🔁    | Recurrence               | `🔁 every week`    |
| 🆔    | Task ID                  | `🆔 task-001`      |
| ⛔    | Depends on (task ID)     | `⛔ task-001`      |
| 🏁    | Action on completion     | `🏁 archive`       |

### Example task with metadata

```markdown
- [ ] Submit quarterly report 📅 2026-03-31 🔼 ➕ 2026-02-17 🔁 every quarter
```

This single line tells you that the task is due on March 31, is high priority, was created on February 17, and recurs every quarter.

---

## Filters

The Tasks View toolbar provides several filters to help you focus on what matters:

| Filter             | Options                              | Description                        |
|--------------------|--------------------------------------|------------------------------------|
| **Date**           | All Time / Last 7 Days / Last 30 Days | Filter tasks by date              |
| **Hide completed** | Toggle                               | Hide `- [x]` done tasks           |
| **Section filter** | Text input                           | Filter by source file name         |

Combine filters to narrow down your view. For example, toggle **Hide completed** on and set the date range to **Last 7 Days** to see only recent, unfinished tasks.

---

## Interacting with Tasks

- **Click a checkbox** — toggles the task status in the actual file. The change is written directly to the `.md` file on disk, so you will see the update the next time you open that note.
- **Click a file name** — opens that file in the editor, scrolled to the task's location. This lets you quickly jump to the surrounding context of any task.

---

## Todoist Integration

Kokobrain can sync tasks with [Todoist](https://todoist.com), a popular task management app.

### Setup

1. Go to **Settings** (gear icon in the sidebar) and select the **Todoist** section.
2. Enter your Todoist API token.
   - Find it at: [todoist.com/prefs/integrations](https://todoist.com/prefs/integrations) → **Developer** → **API token**.
3. Once configured, the Tasks View shows Todoist sync features.

![Todoist API token in settings](screenshots/todoist-settings.png)

### Features

- **Sync button** in the Tasks View toolbar refreshes task status from Todoist.
- **Cloud icon** on tasks shows their Todoist sync status.
- **Send to Todoist**: Click the Todoist icon on any vault task to send it to your Todoist inbox.

> [!NOTE]
> The Todoist sync is triggered manually (not real-time). Press the sync button to fetch the latest status from Todoist.

> [!WARNING]
> Completing a task in Kokobrain does not automatically complete it in Todoist, and vice versa. Use the sync button to update statuses.

---

## Next Steps

- [Canvas](11-canvas.md) — Visual note canvas
- [Keyboard Shortcuts](20-keyboard-shortcuts.md) — All shortcuts reference
