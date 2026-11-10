# Tasks & Todoist

Learn how to track tasks across your vault and sync them with Todoist.

Kokobrain scans every Markdown file in your vault for checkbox items and presents them in a single, unified Tasks View. You can filter and toggle them there, and a two-way sync keeps chosen tasks and their Todoist copies in step.

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

## Todoist Sync

Kokobrain keeps tasks in your notes and tasks in [Todoist](https://todoist.com) in sync, both ways. Each vault syncs one Todoist project and every project nested under it. A task created, completed or edited on one side shows up on the other after the next sync.

### Setup

1. Open **Settings** (`Cmd+,`, or **Open Settings** in the Command Palette) and select the **Todoist** section.
2. Enter your Todoist API token.
   - Find it at: [todoist.com/prefs/integrations](https://todoist.com/prefs/integrations) → **Developer** → **API token**.
   - The token is stored in plain text in this vault's `.kokobrain` folder, so exclude `.kokobrain` from any sync tool you use on the vault.
3. Press **Load projects** and pick the **Root project**. This vault syncs that project and every project under it, at any depth. With no root project, the sync stays off.
4. Turn on **Sync with Todoist**. Optionally turn on **Include Inbox** (in one vault only), set the **Vault context**, the **Sync folder** (default `Todoist`) and the **Sync interval**. See [Settings > Todoist](19-settings.md#todoist).
5. Run **Todoist: Check sync connection** from the Command Palette to test the token and the root project, then **Todoist: Sync now**.

![Todoist settings](screenshots/todoist-settings.png)

The first **Sync now** is a preview: when it would create tasks in Todoist, a dialog shows how many, and nothing is created until you confirm. Automatic syncs start only after that first manual sync. While the sync is on, the status bar shows when the last sync ran, or its error.

### Which tasks sync

- **Project notes.** Each Todoist project of the vault's tree gets one note in the sync folder, named after the project (for example `Todoist/Work.md`), with the project id in its frontmatter (`todoist_project`). Nested projects become notes side by side in the folder; the nesting is not shown. With **Include Inbox** on, the Inbox goes to `Todoist/Inbox.md`. Every open task line in a project note syncs with that project.
- **`#todoist` lines anywhere else.** A task line tagged `#todoist` in any other note syncs with the root project and stays in its note.
- **New notes.** A new note created directly in the sync folder becomes a new Todoist project under the root project, with its tasks.
- **Never synced:** the templates folder, `_system/`, `.view` files, task lines inside code blocks, indented (nested) task lines written in Kokobrain, and lines that carry a `🆔` of your own (one without the `td-` prefix). Closed lines are not created in Todoist.

### The `🆔 td-…` anchor

Every synced line ends with an anchor such as `🆔 td-6XGgmFVcrG5RRjVr` (a task that came from Todoist, named by its Todoist id) or `🆔 td-k3x9q2ab` (a task written in Kokobrain). The anchor is how the sync knows which Todoist task a line belongs to. A task written in Kokobrain also gets a last line in its Todoist description, `kokobrain:td-…`, so the pair can be found again from either side.

Do not edit, copy or delete the anchor:

- **Copying a line copies its anchor.** When two or more lines carry the same anchor, that task stops syncing (it is *frozen*, and the sync log says so) until only one line keeps it. To make a second task, write a new line without the anchor.
- **Changing the anchor** breaks the link: the old task detaches after 3 syncs, and the line is not created again. To have such a line created in Todoist as a new task, remove its `🆔` completely.
- **Removing a whole line** detaches its task (see [Deletions](#deletions)).

If the sync state is lost (a restored backup, a new machine), the next sync rebuilds the links from the anchors and the description lines and creates nothing.

### What syncs

| In the note | In Todoist | Both ways |
|-------------|------------|-----------|
| `[ ]` / `[x]` | Open / completed | Yes. `[x]`, `[X]` and `[-]` count as closed; `[/]`, `[?]`, `[!]` and `[>]` count as open |
| The task text | Task name | Yes |
| `📅 2026-03-31` | Due date | Yes. A due time set in Todoist is kept there |
| `🔺` / `⏫` / `🔼` | Priority P1 / P2 / P3 | Yes. `🔽`, `⏬` and no priority are P4 |
| `#tags` | Labels | Yes. A label becomes a tag only when its name is a valid tag; other labels stay in Todoist |
| Project note | Project | Yes, renames included |
| `##` heading in a project note | Section | Yes, renames from Todoist included |
| Moving a line to another heading or project note | Moving the task | Yes |

What does not sync: subtask nesting (a Todoist subtask comes in as its own line under its parent), comments, Todoist descriptions, reminders, deadlines, `⏳` scheduled and `🛫` start dates, and the order of tasks and sections. These stay on their own side. The `#todoist` tag, the **Default label** and the labels `Work` and `personal` are never written as tags and never removed from a Todoist task.

A task name over 500 characters, or text that would not read back the same, is not sent; the sync log says why. Text that sits in the middle of a line, such as a link or tag between words, is kept: a Todoist name change that would remove it is not written, and the sync log shows the conflict.

### Recurring tasks

Todoist owns the recurrence rule. A line created in Kokobrain with `🔁 every week` and a `📅` is sent with that rule and date; after that, the `🔁` text is never sent again, and editing it in the note changes nothing in Todoist. Completing a recurring task on either side rolls it to its next date: the line stays open with the new `📅`. A rule written in Todoist with `starting <date>` completes for good when it is closed from Kokobrain; the sync log notes it.

### Conflicts

When a field changed on both sides between two syncs, **Todoist wins**: the line gets the Todoist value, and the value from the note goes to the sync log.

### Deletions

Nothing is ever deleted on the other side. A synced task is *detached* instead: its line and its Todoist task both stay, and they stop syncing.

- A task deleted in Todoist, or moved out of the vault's tree, is detached; its line keeps its text and anchor.
- A synced line missing from the vault for 3 syncs in a row is detached; its Todoist task stays. A line that comes back before that keeps syncing.
- A synced line without `#todoist` moved into a note that is not a project note is detached; it is never moved in Todoist.
- A project deleted in Todoist, or moved out of the tree, detaches its note and its tasks. An archived project stops syncing its note until it is unarchived.
- A detached line is never created in Todoist again.

### When it runs

**Todoist: Sync now** runs a sync at once. After the first manual sync, syncs also run on their own: when the vault opens, every **Sync interval** minutes, when the window regains focus, and 5 seconds after you save a note with a synced line. Automatic syncs are at least 30 seconds apart.

### Safety brakes

The sync stops before it changes anything when the vault looks wrong:

- **Missing lines.** When fewer than half of the synced lines are found in the vault, the sync stops. An automatic sync just stops; **Sync now** asks, and a yes counts the missing lines so they detach over 3 syncs.
- **Large changes.** One sync closes or reopens at most 25 tasks, sends at most 50 edits, creates at most 25 tasks, projects and sections, and detaches at most 10 tasks without asking. Over a limit, **Sync now** asks first ("Cancel" changes nothing); an automatic sync leaves that kind of change out and shows a notice.
- **Vault switch.** Switching vaults during a sync stops it before its next write.

### The sync log

Run **Todoist: Show sync log** from the Command Palette to see what the sync did in this vault, newest first. The line at the top sums up the last sync cycle. Use **All**, **Cycles** and **Events** to narrow the list.

- A **cycle** row is one sync run. It says whether it was manual or automatic, what started it (manual, vault-open, interval, focus or after-save), the outcome (ok, cancelled, or the failure, such as `unreachable` or `invalid-token`), how long it took, what changed (notes created, tasks inserted, lines updated, tasks updated or created in Todoist, links detached), what it skipped for being over a cap, the commands it sent by type, and whether the sync token moved on. Automatic runs that change nothing share one row, which counts them ("5 cycles since ...").
- Every other row is an **event**: a conflict, a detached or frozen task, a skipped line, a command Todoist refused.

To see each command sent to Todoist and its answer, turn on **Settings > Troubleshooting > Save debug log to file**. The log file (in `~/Library/Logs/com.diegorv.kokobrain/`) then gets a `TODOIST` line for each pull, each command batch (command type, task anchor or note path, and uuid) and each answer per uuid. Neither the cycle rows nor these lines hold task text or note content.

---

## Next Steps

- [Canvas](11-canvas.md) — Visual note canvas
- [Keyboard Shortcuts](20-keyboard-shortcuts.md) — All shortcuts reference
