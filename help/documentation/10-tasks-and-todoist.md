# Tasks & Todoist

Learn how to track tasks across your vault and sync them with Todoist.

Kokobrain collects the checkbox items in your notes and presents them in a single, unified Tasks View. By default it lists only the tasks under a heading containing `#to-list`; **Clear** next to the sentence above the list shows every task in the vault. You can filter and toggle them there, and a two-way sync keeps chosen tasks and their Todoist copies in step.

---

## Tasks View

Open the Tasks View with **Cmd+Shift+T**, or search for **"Toggle Tasks View"** in the Command Palette.

The Tasks View is a *virtual tab*: it is not a file on disk. It is built on the fly from the checkbox lines (`- [ ]`, `- [x]`, and other statuses) in your notes, limited by the [sources](#sources) and the filters below. With the default source card, only tasks under a heading containing `#to-list` are listed. By default tasks are grouped by their source file, and the notes are listed in path order, with numbers compared as numbers (`note 9` comes before `note 10`). Under the Note grouping, ticking a task does not move its note; under the other groupings a ticked task can move to another group, for example to Done under the Status grouping when done tasks are shown.

The **Display** menu at the end of the toolbar changes the grouping: **Note** (the default), **Folder**, **Due date** (Overdue, Today, Tomorrow, This week, Later, No date), **Priority** or **Status**. Under any grouping other than Note, each group's header shows its row count, and its tasks are listed flat, sorted by due date (undated last), then priority, then note path and line. A task nested under another task shows its parent's text in a small line above it.

A sentence above the list says which tasks it shows, for example "Open tasks under headings containing #to-list". When the list is empty, the view names the filter that emptied it (no note the sources match, every matching note excluded, no task with the chosen status, or no task that matches the Due, Priority, Tag or Search filter) and offers a button that lifts it: **Edit sources**, **Edit excludes** (both open the Sources panel), **Show all**, or **Reset Due filter**, **Reset Priority filter**, **Reset Tag filter** or **Reset Search filter**. Each of those last four resets only its own filter and leaves the others as they are. The toolbar counts the tasks and the notes listed, for example "2 open in 2 notes", or "3 tasks in 2 notes" when the Status menu is set to something other than Open.

![Tasks View with grouped tasks](screenshots/tasks-view.png)

---

## Writing Tasks in Your Notes

Tasks are standard Markdown checkboxes. Write them anywhere in any note:

```markdown
- [ ] Buy groceries
- [ ] Review the quarterly report
- [x] Send email to team
```

There is no special syntax required: any line that starts with `- [ ]` or `- [x]` (including the extended statuses below) is a task. With the default source card, the Tasks View lists it only when it sits under a heading containing `#to-list`, for example `## Today #to-list`.

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

## Sources

The sources decide which notes and headings supply tasks, before the filters run. The sentence above the list says what they are, for example "Open tasks under headings containing #to-list, except archived notes, type definitions, templates, the system folder". **Edit**, after the sentence, opens the Sources panel between the sentence and the list; every change applies at once.

- **Cards**: a task is listed when it matches any card. **Add card** adds an empty card, which matches every note until it holds a clause; **Remove card** deletes one.
- **Clauses**: inside a card, a task must match every clause. **Add clause** picks one of five kinds, and **Remove clause** deletes it. A clause with an empty value does nothing, so a new clause never empties the list.
  - **Folder**: the note is in this vault folder or a folder under it, for example `Projects`.
  - **Type**: the note's type is this one, whatever the case.
  - **Note tag**: the note carries this tag or one nested under it (`#work` also matches `#work/client`).
  - **Heading**: the task sits under a heading, at any depth. **Tag** keeps headings carrying the tag as a whole tag (`#to-list` matches `## Inbox #to-list` and `#to-list/today`, not `#to-listing`); **Contains** keeps headings whose text contains the value with a `#` in front, part of a longer tag included (`to-list` also matches `#to-listing`). The `#` is optional in both modes, and case does not matter.
  - **Property**: a property in the note's frontmatter, for example key `status`, **is** `active`. Pick the operator in the dropdown: **is** (the value, or one item of a list, equals the text), **is not** (the opposite of **is**, so a note without the property also matches), **contains** (the value, or one item of a list, contains the text) or **exists** (the property is there and not empty; it hides the value field). The key must match the property name exactly, case included; the value ignores case. A property that holds nested fields never matches **is** or **contains**.
- **Not**: a folder, type or note tag clause with **Not** on matches the notes the clause would not.
- **Excludes**: tasks from these notes are never listed, whatever the cards say. Four switches are on by default: **Archived notes**, **Type definitions**, **Templates folder** and **System folder** (the two folders set in Settings > Files & Folders). Below them, add folders, notes (by their path in the vault, for example `Inbox/Scratch.md`), note tags and types to leave out, and remove each one with its x button.
- **Clear**, after the sentence, removes every card: the list shows every note's tasks, and the excludes still apply.

Group headers make rules from what is on screen. Hover over a header, or move focus into it, to show its actions:

- **Only this folder**, on a folder group under **Group by: Folder**: lists only the tasks of that folder and its subfolders. With no card, it adds a card holding the folder; with cards, it adds the folder to every card, so each card still applies and none lists tasks from outside the folder.
- **Hide this folder**, on a folder group: adds the folder to the excluded folders, which hides that folder and its subfolders.
- **Hide this note**, on a note group under **Group by: Note**: adds the note to the excluded notes.

The Vault root group has no actions. Nothing is added twice, and the sentence above the list changes at once.

When the list is empty because of the sources, the empty state offers **Edit sources**; when every matching note is excluded, **Edit excludes**, which opens the panel on its first switch.

Only the cards that hold one Heading clause in Tag mode are remembered for each vault after a restart, as their tags. Other cards and the excludes last until you close the app; saved views will keep them. After **Clear**, the next start shows the `#to-list` card again.

---

## Filters

The row under the Tasks View toolbar holds several filters to help you focus on what matters:

| Filter             | Options                              | Description                        |
|--------------------|--------------------------------------|------------------------------------|
| **Status**         | Open / Closed / All, or any of the seven statuses | **Open** (the default) lists todo, in progress, question, important and forwarded tasks; **Closed** lists done (`- [x]`) and cancelled (`- [-]`) tasks; **All** lists every task. Below them, tick one or more statuses (todo, in progress, question, important, forwarded, done, cancelled) to list only those; picking Open, Closed or All clears them. A task that does not match stays, dimmed, when a task nested under it matches |
| **Due**            | Any / Overdue / Today / Next 7 days / No date, then Note edited in the last 7 days / Note edited in the last 30 days | **Any** (the default) lists every task. **Overdue**, **Today** and **Next 7 days** read the task's due date (the 📅 signifier): before today, today, or from today through the seventh day after it, both included. **No date** lists tasks with no due date; among the due date options, an undated task matches only **No date**. The two **Note edited** options read the note's modification date instead, not a task date, and keep every task of a note modified in that period. The Due menu does not look at the status: combine it with the Status menu |
| **Priority**       | highest / high / medium / no priority / low / lowest | Tick one or more levels to list tasks with any of them; none ticked lists every task. **no priority** lists tasks without a priority signifier |
| **Tag**            | One item per task tag in the list   | Tick one or more tags to list tasks carrying any of them; none ticked lists every task. A tag also matches the tags nested under it: `#work` lists tasks tagged `#work` and `#work/client`, not `#workshop`. Case does not matter |

Combine filters to narrow down your view. For example, keep **Status** on **Open** and set **Due** to **Overdue** to see only unfinished tasks past their due date.

The **Search tasks** box in the toolbar lists the tasks whose text or note title contains what you type, as you type, whatever the case. It does not search tags or dates: use the Tag menu for tags.

**Reset filters**, at the end of the filter row, shows while the Status, Due, Priority, Tag or search filter is changed, and puts all of them back to their defaults. It leaves the sources and excludes as they are.

In a pane narrower than 560 px, the Status, Due, Priority and Tag menus fold into one **Filters (n)** menu, where n counts how many of the four are changed.

---

## Interacting with Tasks

- **Click a checkbox** — toggles the task status in the actual file. The change is written directly to the `.md` file on disk, so you will see the update the next time you open that note. For a task synced with Todoist, the change goes out at the next interval or focus sync, or with **Todoist: Sync now**: a Tasks View click is not a note save, so it does not start the after-save sync.
- **Click a task's text**: opens its note with the cursor on the task's line. Clicking the text never changes the task; only the checkbox does. Selecting part of the text to copy it does nothing.
- **Click a note's title**: each note's header shows its icon, title, folder and how many of its tasks are open, for example "2 of 3 open" (every task of the note counts, whatever the filters hide). Clicking the title opens the note in the editor, and hovering over it shows when the note was last modified.
- **Collapse a group**: the chevron at the start of each group's header (a note, a folder, a due date, a priority or a status) hides that group's tasks; its header and count stay. A collapsed group stays collapsed while you switch tabs and come back, but not across restarts, and each grouping keeps its own: collapsing Overdue under Due date leaves the Note grouping as it was.
- **Long groups**: a group shows its first 50 tasks, then a **Show N more** button that shows the rest. The list goes back to 50 the next time the Tasks View opens.
- **Task menu**: the **...** button at the end of each task row opens its menu, and so does a right click anywhere on the row, `Shift+F10` or the Menu key. **Open at line** opens the note with the cursor on the task's line. **Copy task text** copies the task's line as written, dates, priority and tags included, without its block id (`^abc`) or Todoist anchor (`🆔 td-...`). The four statuses below set the task to **Todo**, **In progress**, **Done** or **Cancelled**; the current one is checked. A question, important or forwarded task shows none checked, and picking one of the four replaces that status.
- **Due and Priority in the task menu**: **Due** sets the task's due date (the 📅 signifier) to **Today**, **Tomorrow** or **In a week** (seven days after today); **Pick a date** opens a dialog with a date field, filled with the current due date, where **Save** writes the date and **Cancel** changes nothing. **Clear**, shown only when the task has a due date, removes it. **Priority** sets **Highest**, **High**, **Medium**, **None**, **Low** or **Lowest**; the current one is checked, and **None** removes the priority signifier. Only the due date or priority signifier changes: the text, the other dates, tags, the Todoist anchor and a block id stay where they are. A due date change can move the task to another group under **Group by: Due date**, or out of the list under a **Due** filter. On a note with Windows line endings (CRLF), a due or priority change fails with an error and the note is left as it was.

### Undo a menu change

A status, due date or priority set from the task menu shows a message ("Task marked ...", "Due set to ...", "Due cleared", "Priority set to ...") with an **Undo** button, which puts back what the task had before. Undo covers only the last change made from the menu: the message goes away when you make another change (from the menu, a checkbox or `Space`) or switch vaults, and Undo then has nothing to undo. A checkbox click or `Space` shows no Undo. A task written as `[X]` comes back as `[x]`, and a task with a status character Kokobrain does not know comes back as `[ ]`.

For a task synced with Todoist, a change between an open status (Todo, In progress) and a closed one (Done, Cancelled) reaches Todoist at the next sync, as a completion or a reopen. Undo before that sync leaves the line as it was at the last sync, so nothing is sent; Undo after it sends the opposite change. A change between two open or two closed statuses does not reach Todoist. As with a checkbox click, a menu change is not a note save and does not start the after-save sync.

On a synced task, a due date change from the menu reaches Todoist at the next sync, and so does a priority change among **Highest**, **High** and **Medium**. **Low**, **Lowest** and **None** all map to Todoist's lowest priority (priority 1), so a change between them sends nothing. Undo after a sync sends a second change. **Clear** on a recurring synced task removes the due date from the line but not in Todoist, which keeps its due date so the recurrence is not lost.

### Keyboard

Only one task row is in the Tab order at a time. Opening the Tasks View puts focus on the task you were last on, or on the first task, unless you were typing in a field. The keys below work while a task row has focus, not while you type in the search box or a field of the Sources panel:

| Key | Action |
|-----|--------|
| `Down` / `Up` | Next / previous task, across notes |
| `Home` / `End` | First / last task |
| `Space` | Toggle the task, as a click on its checkbox does |
| `Enter` | Open the note at the task's line, as a click on its text does |
| `Shift+F10` / Menu key | Open the task menu, as a click on its **...** button does |

`Tab` from a task walks its checkbox, links and **...** button, then goes on to the next group's chevron, the next note's title and the group's actions. Closing the task menu puts focus back on the task. When the focused task leaves the list (you completed it under the Open filter, or a refresh removed it), focus moves to the next task, or to the one before when it was the last. The place is kept when you switch tabs and come back. `Down` and `Up` skip the tasks of a collapsed group; when the task you were on is hidden by a collapse or by the 50-task limit, the next task shown takes its place in the Tab order, or the last one shown when none follows.

In the Command Palette, **Tasks: Show all statuses** sets the Status filter to All, and **Tasks: Show open only** sets it back to Open; either one opens the Tasks View. `/` opens Search in the rail (the vault search), not the Tasks View's search box.

---

## Todoist Sync

Kokobrain keeps tasks in your notes and tasks in [Todoist](https://todoist.com) in sync, both ways. Each vault syncs one Todoist project and every project nested under it: every project becomes a note in the sync folder (`Todoist` by default), and the open tasks of the project are the task lines of that note.

- **Set up:** in **Settings** > **Todoist**, paste your API token, press **Load projects**, pick the **Root project** and turn on **Sync with Todoist**. See [Settings > Todoist](19-settings.md#todoist).
- **Run:** **Todoist: Sync now** from the Command Palette. The first sync is a preview that asks before it creates anything in Todoist. Automatic syncs start after it.
- **Synced:** status, task text, due date, priority, tags, projects and sections; a recurrence rule is sent once, when a task is created. Todoist wins when both sides changed a field.
- **Labels and tags:** a Todoist label becomes a `#tag` on the line only when its name is a valid tag: it starts with a letter (accented letters included) or `_`, and the rest is letters, digits, `_`, `-` and `/`, for example `work`, `über` or `area/home`. Other labels, such as `2026` or `two words`, stay only in Todoist: they are never written to the line and never removed from the task.
- **Anchor:** a synced line ends with a `🆔 td-...` anchor. Do not edit, copy or delete it.
- **Deletions:** nothing is deleted on the other side. A task that disappears on one side is detached and both copies stay.
- **Diagnose:** **Todoist: Check sync connection** tests the token and the root project, and **Todoist: Show sync log** shows what each sync did.

The complete guide is [Todoist Sync](29-todoist-sync.md).

---

## Next Steps

- [Todoist Sync](29-todoist-sync.md) — The complete two-way sync guide
- [Canvas](11-canvas.md) — Visual note canvas
- [Keyboard Shortcuts](20-keyboard-shortcuts.md) — All shortcuts reference
