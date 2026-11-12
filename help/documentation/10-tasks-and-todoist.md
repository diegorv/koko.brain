# Tasks & Todoist

Learn how to track tasks across your vault and sync them with Todoist.

Kokobrain collects the checkbox items in your notes and presents them in a single, unified Tasks View. By default it lists only the tasks under a heading containing `#to-list`; clear the section filter to list every task in the vault. You can filter and toggle them there, and a two-way sync keeps chosen tasks and their Todoist copies in step.

---

## Tasks View

Open the Tasks View with **Cmd+Shift+T**, or search for **"Toggle Tasks View"** in the Command Palette.

The Tasks View is a *virtual tab*: it is not a file on disk. It is built on the fly from the checkbox lines (`- [ ]`, `- [x]`, and other statuses) in your notes, limited by the filters below. With the default section filter, only tasks under a heading containing `#to-list` are listed. Tasks are grouped by their source file, and the notes are listed in path order, with numbers compared as numbers (`note 9` comes before `note 10`). Ticking a task does not move its note.

A sentence above the list says which tasks it shows, for example "Open tasks under headings containing #to-list". When the list is empty, the view names the filter that emptied it (no task under the section tag, every task closed, or no recent note) and offers a button that lifts it: **Clear tag**, **Show closed** or **All time**. The line under it counts the open tasks and the notes listed, for example "2 open in 2 notes".

![Tasks View with grouped tasks](screenshots/tasks-view.png)

---

## Writing Tasks in Your Notes

Tasks are standard Markdown checkboxes. Write them anywhere in any note:

```markdown
- [ ] Buy groceries
- [ ] Review the quarterly report
- [x] Send email to team
```

There is no special syntax required: any line that starts with `- [ ]` or `- [x]` (including the extended statuses below) is a task. With the default section filter, the Tasks View lists it only when it sits under a heading containing `#to-list`, for example `## Today #to-list`.

---

## Task Statuses

Kokobrain supports extended task statuses beyond the standard `[ ]` and `[x]`:

| Syntax   | Status      | Meaning                        | Circle in the Tasks View |
|----------|-------------|--------------------------------|--------------------------|
| `- [ ]`  | Todo        | Pending task                   | Open circle              |
| `- [x]`  | Done        | Completed task                 | Check                    |
| `- [/]`  | In Progress | Currently being worked on      | Circle with a dot        |
| `- [-]`  | Cancelled   | No longer needed               | Minus                    |
| `- [?]`  | Question    | Needs clarification            | Question mark            |
| `- [>]`  | Forwarded   | Delegated or moved elsewhere   | Arrow                    |
| `- [!]`  | Important   | High priority marker           | Alert                    |

Done and cancelled tasks are *closed*; every other status is *open*. The Tasks View strikes through only closed tasks. Each task's circle shows its status, and the circle's accessible name ends with the status word, for example "Mark task as done: Draft plan (in progress)". Hover the circle to see the word.

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

With Todoist sync on, `🆔 td-...` is also the sync anchor, and a line that carries a `🆔` of your own (one that does not start with `td-`) is kept out of the sync. See [Todoist Sync](29-todoist-sync.md#the-task-line).

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
| **Date**           | All time / Last 7 days / Last 30 days | Keep tasks from notes modified in that period (the note's modification date, not a task date) |
| **Hide closed**    | Toggle                               | Hide done (`- [x]`) and cancelled (`- [-]`) tasks. In progress, question, important and forwarded tasks stay listed |
| **Section filter** | Text input                           | Keep tasks under a heading containing this tag (e.g. `#to-list`; the `#` is optional). Takes several tags, separated by spaces or commas (e.g. `#to-list #work`), and lists a task when its heading contains any of them. Default: `#to-list`. Empty: every task in the vault |

Combine filters to narrow down your view. For example, toggle **Hide closed** on and set the date range to **Last 7 days** to see only recent, unfinished tasks.

---

## Interacting with Tasks

- **Click a checkbox** — toggles the task status in the actual file. The change is written directly to the `.md` file on disk, so you will see the update the next time you open that note. For a task synced with Todoist, the change goes out at the next interval or focus sync, or with **Todoist: Sync now**: a Tasks View click is not a note save, so it does not start the after-save sync.
- **Click a task's text**: opens its note with the cursor on the task's line. Clicking the text never changes the task; only the checkbox does. Selecting part of the text to copy it does nothing.
- **Click a file name** — opens that file in the editor. This lets you quickly jump to the surrounding context of any task.

---

## Todoist Sync

Kokobrain keeps tasks in your notes and tasks in [Todoist](https://todoist.com) in sync, both ways. Each vault syncs one Todoist project and every project nested under it: every project becomes a note in the sync folder (`Todoist` by default), and the open tasks of the project are the task lines of that note.

- **Set up:** in **Settings** > **Todoist**, paste your API token, press **Load projects**, pick the **Root project** and turn on **Sync with Todoist**. See [Settings > Todoist](19-settings.md#todoist).
- **Run:** **Todoist: Sync now** from the Command Palette. The first sync is a preview that asks before it creates anything in Todoist. Automatic syncs start after it.
- **Synced:** status, task text, due date, priority, tags, projects and sections; a recurrence rule is sent once, when a task is created. Todoist wins when both sides changed a field.
- **Anchor:** a synced line ends with a `🆔 td-...` anchor. Do not edit, copy or delete it.
- **Deletions:** nothing is deleted on the other side. A task that disappears on one side is detached and both copies stay.
- **Diagnose:** **Todoist: Check sync connection** tests the token and the root project, and **Todoist: Show sync log** shows what each sync did.

The complete guide is [Todoist Sync](29-todoist-sync.md).

---

## Next Steps

- [Todoist Sync](29-todoist-sync.md) — The complete two-way sync guide
- [Canvas](11-canvas.md) — Visual note canvas
- [Keyboard Shortcuts](20-keyboard-shortcuts.md) — All shortcuts reference
