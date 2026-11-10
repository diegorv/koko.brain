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
| ⏫    | High     |
| 🔼    | Medium   |
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
| **Date**           | All time / Last 7 days / Last 30 days | Filter tasks by date              |
| **Hide completed** | Toggle                               | Hide `- [x]` done tasks           |
| **Section filter** | Text input                           | Filter by heading/section tag (e.g. `#to-list`). Default: `#to-list` |

Combine filters to narrow down your view. For example, toggle **Hide completed** on and set the date range to **Last 7 days** to see only recent, unfinished tasks.

---

## Interacting with Tasks

- **Click a checkbox** — toggles the task status in the actual file. The change is written directly to the `.md` file on disk, so you will see the update the next time you open that note.
- **Click a task's text**: opens its note with the cursor on the task's line. Clicking the text never changes the task; only the checkbox does. Selecting part of the text to copy it does nothing.
- **Click a file name** — opens that file in the editor. This lets you quickly jump to the surrounding context of any task.

---

## Todoist Integration

Kokobrain can sync tasks with [Todoist](https://todoist.com), a popular task management app.

### Setup

1. Open **Settings** (`Cmd+,`, or **Open Settings** in the Command Palette) and select the **Todoist** section.
2. Enter your Todoist API token.
   - Find it at: [todoist.com/prefs/integrations](https://todoist.com/prefs/integrations) → **Developer** → **API token**.
   - The token is stored in plain text in this vault's `.kokobrain` folder, so exclude `.kokobrain` from any sync tool you use on the vault.
3. Once configured, the Tasks View shows Todoist sync features.

![Todoist API token in settings](screenshots/todoist-settings.png)

### Features

- **Sync button** in the Tasks View toolbar refreshes task status from Todoist.
- **Cloud icon** on tasks shows their Todoist sync status.
- **Send to Todoist**: Click the Send icon on any vault task to send it. A popover lets you select the **project**, **section**, and **priority** before sending.
- **Completion indicator**: Tasks that have been completed in Todoist show a check mark badge.

> [!NOTE]
> The Todoist sync is triggered manually (not real-time). Press the sync button to fetch the latest status from Todoist.

> [!WARNING]
> Completing a task in Kokobrain does not automatically complete it in Todoist, and vice versa. Use the sync button to update statuses.

### Troubleshooting the sync

Run **Todoist: Show sync log** from the Command Palette to see what the sync did in this vault, newest first. The line at the top sums up the last sync cycle. Use **All**, **Cycles** and **Events** to narrow the list.

- A **cycle** row is one sync run. It says whether it was manual or automatic, what started it (manual, vault-open, interval, focus or after-save), the outcome (ok, cancelled, or the failure, such as `unreachable` or `invalid-token`), how long it took, what changed (notes created, tasks inserted, lines updated, tasks updated or created in Todoist, links detached), what it skipped for being over a cap, the commands it sent by type, and whether the sync token moved on. Automatic runs that change nothing share one row, which counts them ("5 cycles since ...").
- Every other row is an **event**: a conflict, a detached or frozen task, a skipped line, a command Todoist refused.

To see each command sent to Todoist and its answer, turn on **Settings > Troubleshooting > Save debug log to file**. The log file (in `~/Library/Logs/com.diegorv.kokobrain/`) then gets a `TODOIST` line for each pull, each command batch (command type, task anchor or note path, and uuid) and each answer per uuid. Neither the cycle rows nor these lines hold task text or note content.

---

## Next Steps

- [Canvas](11-canvas.md) — Visual note canvas
- [Keyboard Shortcuts](20-keyboard-shortcuts.md) — All shortcuts reference
