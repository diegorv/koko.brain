# Todoist Sync

Keep a Todoist project tree and the notes in your vault in step, in both directions.

**Open:** `Cmd+,` > **Todoist** section in Settings, then run **Todoist: Sync now** from the Command Palette.

---

## What it does

Each vault syncs one Todoist project and every project nested under it (the **Root project**). Every project of that tree becomes a note in a folder of your vault (the **Sync folder**, `Todoist` by default), and every open task of the project is a task line in that note. A task created, completed or edited on one side shows up on the other at the next sync.

The sync follows four rules you can rely on:

- **Todoist wins.** When a field changed on both sides between two syncs, the line gets the Todoist value. The value from the note goes to the [sync log](#the-sync-log).
- **Nothing is deleted on the other side.** A task or line that disappears on one side is *detached*: both copies stay and stop syncing. See [Deleting and detaching](#deleting-and-detaching).
- **Big or suspicious changes stop for a confirmation.** See [Safety limits](#safety-limits).
- **Your notes are patched, not rewritten.** The sync changes single parts of a line (the status box, the date, the priority emoji, a tag, the text) and keeps everything else on it.

### Words used on this page

- **Brain**: your Kokobrain vault. Log messages say "brain value" for the value from the note.
- **Sync** or **cycle**: one run of the sync, manual or automatic.
- **Anchor**: the `🆔 td-...` token at the end of a synced line that ties it to its Todoist task.
- **Detach**: the line and the Todoist task stop syncing; neither is deleted.
- **Line brake**: the stop that kicks in when most synced lines are missing from the vault.

### What syncs and what does not

| In the note | In Todoist | Direction |
|-------------|------------|-----------|
| `[ ]` / `[x]` status | Open / completed | Both ways. `[x]`, `[X]` and `[-]` count as closed; `[/]`, `[?]`, `[!]` and `[>]` count as open |
| The task text | Task name | Both ways |
| `📅 2026-03-31` | Due date | Both ways. A due time set in Todoist stays in Todoist |
| `🔁 every week` | Recurrence rule | Sent once, when a line is created. After that Todoist owns the rule |
| `🔺` `⏫` `🔼` | Priority P1 / P2 / P3 | Both ways. `🔽`, `⏬` and no emoji are P4 |
| `#tags` | Labels | Both ways. A label becomes a tag only when its name is a valid tag |
| A project note | A project | Both ways, renames included |
| A `##` heading in a project note | A section | Both ways, with limits. See [Moves and sections](#moves-and-sections) |
| Moving a line to another heading or project note | Moving the task | Both ways |
| A new task line, a new note in the sync folder | A new task, a new project | Notes to Todoist. See [Creating tasks from the brain](#creating-tasks-from-the-brain) |

Not synced, on either side:

- **Subtask nesting.** A Todoist subtask comes in as its own flat line right after its parent. An indented line written in Kokobrain is never created in Todoist.
- **Comments, reminders, deadlines**, and the order of tasks and sections.
- **The Todoist description.** Only a task created from Kokobrain gets one, a single `kokobrain:td-...` back-link line (see [The task line](#the-task-line)). Anything you write in a Todoist description never reaches the note.
- **The other emoji signifiers:** `⏳` scheduled, `🛫` start, `➕` created, `✅` done, `❌` cancelled, `⛔` depends on, `🏁` on completion. They stay on the line untouched and are never sent to Todoist. A Todoist task never produces them.
- **Deletions.** See [Deleting and detaching](#deleting-and-detaching).

---

## Before You Start

Check these first, because the first sync acts on what is already there:

- **Put everything you want synced under one Todoist project.** Drag existing projects under it in Todoist first. Projects outside the root tree are never read into notes.
- **Empty the sync folder, or pick a new one.** Every note already directly in it (a `README.md` included) becomes a new Todoist project.
- **Search the vault for `#todoist`.** Every open, top-level line with that tag is created in the root project.
- **Other task lines are never touched.** Lines outside project notes and without `#todoist` are not read, created or changed.
- **Coming from the old "Send to Todoist" button?** Tasks sent that way are not linked. Their Todoist copies arrive as new lines in the project notes, so delete the old lines.
- **The first-sync preview shows counts only**, not which lines. Review the points above before you press **Create**.

Then:

1. **Get an API token** at [todoist.com/prefs/integrations](https://todoist.com/prefs/integrations) (**Developer** > **API token**).
2. Open **Settings** > **Todoist** and paste it into **API token**.
3. Press **Load projects**, then pick the **Root project** (see below).
4. Turn on **Sync with Todoist**.
5. Optionally run **Todoist: Check sync connection**, then run **Todoist: Sync now**. The first sync is a preview, see [First sync](#first-sync).

### The root project tree

A Todoist account that separates areas of life usually has a tree such as:

```
Work
  Acme
    Q4 launch
  Internal
Personal
  Home
```

Choose `Work` as the root project in your work vault: the vault then syncs `Work`, `Acme`, `Q4 launch` and `Internal`, at any depth. A personal vault would choose `Personal`. The picker lists every live project except the Inbox, labelled by its path, for example `Work / Acme`. Archived and deleted projects, and anything under them, are left out. Until you press **Load projects** the picker lists only `None (sync off)`, and with no root project chosen the sync stays off.

> [!WARNING]
> Changing **Root project** or turning off **Include Inbox** later detaches every note and task of the old scope for good. Choose the root before the first sync.

### Settings

| Setting | What it does |
|---------|--------------|
| **API token** | Your personal Todoist token. It is stored in plain text, see [Privacy and data](#privacy-and-data). |
| **Default label** | "A Todoist label the sync never writes as a tag and never removes from a task. Leave empty for none." |
| **Sync with Todoist** | "Keep the root project's tasks and this vault's notes in sync both ways". Off by default. |
| **Root project** | "This vault syncs this project and every project nested under it. With none chosen, the sync stays off." |
| **Include Inbox** | "Also sync the Todoist Inbox. Turn it on in one vault only." The Inbox gets the note `Inbox.md` in the sync folder. It is not a choice in the picker, only this switch controls it. |
| **Vault context** | "A work vault sends new tasks with no context label, so the webhook adds Work. A personal vault sends them with the label personal." Options are **Work** (default) and **Personal**. |
| **Sync folder** | "Folder for the project notes, one note per Todoist project". Default `Todoist`. It must be a folder inside the vault: an absolute path, a path starting with `~`, a drive letter or a `..` segment is refused. |
| **Sync interval** | "Minutes between automatic syncs (at least 1)". Default `5`. A changed value applies from the next timer. |

The same settings are listed in [Settings > Todoist](19-settings.md#todoist).

### Work and personal vaults

**Vault context** only matters for tasks created from Kokobrain. In a **Personal** vault every new task is sent with the label `personal`. In a **Work** vault no context label is sent; the Settings text mentions "the webhook" because the author's own Todoist automation labels unlabelled tasks `Work`. Without such an automation, the task simply has no context label. The labels `work` and `personal` (and `todoist`, and your **Default label**) are never written as tags on a line and never removed from a Todoist task, whatever the context.

### Two vaults or two Macs

- The root trees of two vaults must not overlap: not `Work` in one vault and `Work / Acme` in another. Turn on **Include Inbox** in one vault only.
- Run the sync on one machine per vault. A second Mac whose vault has no `.kokobrain/` starts in rebuild mode and then races the first one.

### Checking the connection

**Todoist: Check sync connection** is read-only. It reads your projects and open tasks, counts the ones in the root tree (plus the Inbox when it is included), and shows a toast such as `Todoist connection OK: 12 projects, 87 open tasks (Inbox included).` It writes no note and no sync state, and it works with **Sync with Todoist** switched off. It refuses with one of the first four messages below, and can fail with the last one or with the Todoist errors under [Messages](#messages):

- `The vault is still indexing. Try again when it finishes.`
- `Add your Todoist API token in Settings > Todoist first.`
- `Choose a sync root project in Settings > Todoist first.`
- `A Todoist sync is already running.`
- `The sync root project was not found in Todoist. Choose it again in Settings > Todoist.`

---

## First Sync

The first **Todoist: Sync now** works as a preview. The first sync may create things in Todoist from notes and task lines your vault already has. When it would, a dialog titled **Todoist sync** asks first:

> This first Todoist sync would create 1 project, 2 sections and 3 tasks in Todoist from notes and task lines in the vault. Nothing is sent until you continue. Continue?

The counts are examples; zero counts are left out. The buttons are **Create** and **Cancel**.

- **Create** runs the sync. From then on the sync is no longer in preview mode.
- **Cancel** stops before anything is written: no anchor is added to any line, nothing is sent, and the next **Sync now** asks again. A cancel shows the toast `Todoist sync cancelled; nothing was changed.`

If there is nothing to create, no dialog appears and the first sync just completes. **Automatic syncs do nothing until the first manual sync has completed.**

> [!WARNING]
> When the sync state is empty (a new machine, a deleted `.kokobrain/kokobrain.db`) and either your vault already holds lines with a `🆔 td-...` anchor, or a Todoist task in the tree has a `kokobrain:td-...` line in its description, the sync runs in *rebuild mode*: it only pairs open lines with their Todoist tasks by anchor and creates nothing. The toast says `Todoist sync rebuilt N links from the vault; nothing was created.` (`1 link` for one), with a second sentence when lines were left unmatched.
>
> A rebuild does not count as the first sync: automatic syncs stay off until the next manual **Sync now** runs in normal mode (and shows the first-sync preview if it would create anything). If nothing pairs, every sync stays a rebuild. To get out, remove the `🆔 td-...` anchors that match nothing, and delete the `kokobrain:td-...` line from the description of each Todoist task that has no line in the vault. A task created from Kokobrain whose line is gone is never written back to a note; the log shows `unmatched` at every sync until you remove that description line.

When a sync finishes, a toast sums it up, for example `Todoist sync done: 3 notes created, 3 tasks added.` or `Todoist sync done: nothing new.` The parts it can list are notes created, tasks added, links paired, lines updated, headings written, tasks updated in Todoist, tasks created in Todoist, projects created in Todoist, sections created in Todoist and projects renamed.

---

## How Notes Map to Todoist

Each project of the tree has one **project note**. A note is a project note because its frontmatter says so:

```markdown
---
todoist_project: 6hxGCqmrqCMqj7mj
---
- [ ] Plan the launch 🔺 📅 2026-11-13 #deep 🆔 td-6XGgmFVcrG5RRjVr
```

- **The frontmatter decides, not the name or the folder.** You can rename or move a project note anywhere in the vault and its tasks keep syncing. Do not edit `todoist_project`. Two notes with the same `todoist_project` freeze that project, see [Troubleshooting](#troubleshooting).
- **Nesting is flat.** `Work`, `Acme` and `Q4 launch` become `Work.md`, `Acme.md` and `Q4 launch.md` side by side in the sync folder. The nesting is not shown, and an empty project still gets a note.
- **Inbox.** With **Include Inbox** on, the Inbox is `Inbox.md`, whatever its name in Todoist. It is never renamed.
- **File names.** A project name is turned into a file name by replacing `\ / : * ? " < > |` and control characters with `-`, collapsing runs of spaces, and trimming leading and trailing dots and spaces (an empty result is `Untitled`). A name that is already taken gets a number: `Plan.md`, `Plan 2.md`, `Plan 3.md`. For example the Todoist project `Q4: Launch` becomes `Q4- Launch.md`.
- **A new note is just the frontmatter and the open tasks.** No title, no heading. The sync never opens the note in a tab.

### Renames

- **Renamed in Todoist.** The note is renamed to match (wikilinks to it are updated and open tabs follow), in the folder it is in now. A case-only change (`Acme` to `acme`) does not rename the file.
- **Renamed in Kokobrain.** The file name without its extension becomes the project name in Todoist. Moving a note to another folder without renaming it changes nothing in Todoist.
- **Renamed on both sides** to different names: Todoist wins and the note is renamed to the Todoist name. The log keeps the name from the note.

### New notes become projects

Any note you create **directly in the sync folder** and that has no `todoist_project` is created in Todoist as a new project, as a child of the root project, whatever it contains. That includes an empty note and a `README.md` you put there. The project name is the file name. Keep other notes out of the sync folder, or put them in a subfolder: notes in subfolders never become projects.

The note's open task lines are created in the same sync. Its `##` headings do not become sections in that first sync, only in the next one. Todoist's answer is written back as `todoist_project` in the frontmatter; if the note is open in a tab, the id is put into the tab and your editor autosave writes it.

If the note is deleted from the vault, the project in Todoist is not touched, and the next sync creates a fresh empty note for it. Its old tasks are not written into the new note: they detach after 3 syncs. See [Deleting and detaching](#deleting-and-detaching).

### Projects that leave the tree

- **Archived** in Todoist: nothing is written either way and nothing is detached. Unarchiving resumes the same note.
- **Deleted** in Todoist, or **moved out** of the root tree: the note and its tasks are detached and kept. The sync log records it.
- **Moved into** the tree, or **created** in it: it gets a note with its tasks like any other project.

---

## The Task Line

A task that comes from Todoist is written like this:

```markdown
- [ ] Pay rent 🔺 📅 2026-12-01 🔁 every month #home 🆔 td-6XGgmFVcrG5RRjVr
```

The parts, in order, each only when the task has it: status box, text, priority emoji, `📅` due date, `🔁` recurrence rule, `#tags`, and the `🆔 td-...` anchor. Only open tasks are inserted. They go at the end of the project's note, or under the matching `##` heading. Subtasks arrive as flat lines.

A Todoist task whose name contains one of the signifier emoji (`📅 ⏳ 🛫 ➕ ✅ ❌ 🔺 ⏫ 🔼 🔽 ⏬ 🔁 🆔 ⛔ 🏁`) is not inserted, because such text could not be read back from a line. The sync log says `content-skipped`.

### The anchor

The anchor `🆔 td-...` is how the sync knows which Todoist task a line belongs to.

- A task that came from Todoist has `td-` plus its Todoist id, for example `🆔 td-6XGgmFVcrG5RRjVr`.
- A task you wrote in Kokobrain gets `td-` plus 8 random lowercase letters and digits, for example `🆔 td-k3j9x0ab`, before it is sent. The Todoist task gets a last description line `kokobrain:td-k3j9x0ab`, so the pair can be found again from either side after a lost response or lost sync state.
- A **block id** such as `^abc` that ends the line stays last, after the anchor, and is never part of the Todoist text.

> [!WARNING]
> Do not edit, copy or delete the anchor.

- **Copying a line copies its anchor.** When two or more lines carry the same anchor, that task is *frozen*: nothing is sent or written for it and the log says `Anchor occurs on more than one line; the link is frozen`. It unfreezes by itself when one line is left. To make a second task, write a new line without an anchor.
- **Editing the anchor text** breaks the link. The line no longer finds its task and is detached after 3 syncs in a row. It is not created again, because it still carries a `🆔`.
- **Deleting only the anchor** from a line makes it a new line: the next sync creates it in Todoist as a new task. The old Todoist task stays, so you may end up with two. See [Deleting and detaching](#deleting-and-detaching).
- **A `🆔` of your own** (one that does not start with `td-`) keeps the line out of the sync. It is never created in Todoist and the log says `the line carries a 🆔 that is not a sync anchor; it is not created in Todoist`.

---

## Field by Field

### Text

The text is what is left of the line after the dates, priority emoji, `🔁` text, `🆔` anchor, block id and `#tags` are taken out.

- **Todoist to note.** A change of the task name replaces the text of the line. If a tag, link (wikilink, Markdown link or bare URL) or signifier sits between the first and the last word of the text, for example `Buy #shop milk` or `Call [[Bob]] today`, the new name is not written. The line is left alone and the log says `description-conflict`. A tag at the very start or end of the text is kept: `- [ ] #todoist Call Bob` takes a new name `Call Bob Smith` and becomes `- [ ] #todoist Call Bob Smith`. A link counts as part of the text: at the start or end it is replaced together with the words.
- **Note to Todoist.** An edited text is sent as the new name. It is not sent, and the log says `content-not-pushed`, when it is over about 500 characters, empty, or when it would not read back the same: it contains a `#` anywhere (even `C#`), a signifier emoji, a line break, or two spaces in a row. Ordinary emoji and wikilinks are fine. The rest of the line still syncs.
- **Odd names from Todoist.** When a task is first inserted, a line break in its name becomes a space, and a name with `#`, a signifier or two spaces is written as it is but never sent back. A later rename in Todoist that holds a line break, `#`, a signifier or two spaces is not written: the line keeps its text and the log says `content-roundtrip`.

### Due date

- **Todoist to note.** Only the date part `YYYY-MM-DD` is written as `📅`. A time of day stays in Todoist and is kept when you later change the date in the note. A due date that is not in that form is left out of a new line, and an existing line keeps its `📅`; the log says `due-dropped`. Removing the due date in Todoist removes the `📅`.
- **Note to Todoist.** A changed `📅` is sent. Removing the `📅` from a line removes the due date in Todoist, except on a recurring task: there Todoist keeps its due, because removing it would drop the rule, and the log says `due-not-pushed`.

### Recurring tasks

Todoist owns the rule. A new line with `🔁 every week` and a `📅` is created with that rule and date. After that the `🔁` text is not sent again: editing it in the note changes nothing in Todoist, and the sync never rewrites or removes it. A task that comes from Todoist gets a `🔁` only when it is first inserted, and only for a repeating due date; a one-off due such as "tomorrow" is not written. A rule that holds a signifier or `#` is left out and the log says `recurrence-dropped`.

Completing a recurring task rolls it forward, see [Completion and statuses](#completion-and-statuses).

### Priority

| Line | Todoist | Coming from Todoist |
|------|---------|---------------------|
| `🔺` | P1 (API value 4) | writes `🔺` |
| `⏫` | P2 (3) | writes `⏫` |
| `🔼` | P3 (2) | writes `🔼` |
| `🔽`, `⏬` | P4 (1) | writes nothing |
| none | P4 (1) | |

The mapping is lossy: `🔽`, `⏬` and no emoji are all P4. They are compared as P4, so a line with `🔽` is kept as it is when Todoist says P4. Setting a priority in Todoist replaces the emoji on the line; removing the emoji sends P4.

### Tags and labels

- **Todoist to note.** A label becomes a `#tag` only when its name is letters (A-Z, a-z), digits, `_` and `-`, not starting with `-`. Labels with spaces, accents or other characters stay in Todoist and are kept whenever the sync updates the label list. Adding or removing a label in Todoist adds or removes the tag on the line.
- **Note to Todoist.** The tags of a line become labels. Tags are compared without regard to case.
- **Never synced as tags:** the labels `todoist`, `work`, `personal` and your **Default label**. They are not written to lines, not removed from Todoist tasks, and a tag with one of those names is not sent as a label. The **Default label** is not added to new tasks.
- In a **Personal** vault the label `personal` is added to tasks created from Kokobrain. See [Work and personal vaults](#work-and-personal-vaults).

Where a token is inserted into a line, it goes before the `🆔` anchor: a tag, `📅` or priority emoji you add in Todoist lands there.

---

## Completion and Statuses

Only **closed versus open** is synced.

| Box | State |
|-----|-------|
| `[x]`, `[X]`, `[-]` | Closed |
| `[ ]`, `[/]`, `[?]`, `[!]`, `[>]` | Open |

- **Closed in Todoist.** The line gets `[x]`, whatever open box it had (`[/]` becomes `[x]`). A line that is already closed keeps its box, so `[-]` stays `[-]`.
- **Reopened in Todoist.** A closed line gets `[ ]` (`[x]`, `[X]` and `[-]` all become `[ ]`). A line that is already open keeps its box, so `[/]` stays `[/]`.
- **Closed in the note.** Checking any open box to `x`, `X` or `-` closes the task in Todoist at the next sync. Changing between two open boxes (`[ ]` to `[/]`) or between two closed ones sends nothing, so `[/]`, `[?]`, `[!]` and `[>]` are never sent as completed.
- **Reopened in the note.** Changing a closed box to an open one reopens the task.

Until Todoist confirms a close or reopen, the line stays as you left it.

A checkbox clicked in the Tasks View is not a note save, so it does not start the 5-second after-save sync. It goes out at the next interval or focus sync, or with **Todoist: Sync now**.

### Recurring tasks

- **Checked in the note**, plain rule (`every day`, `every week`): Todoist rolls the task to its next date, and the line goes back to open with the new `📅`. `- [x] Water plants 🔁 every day 📅 2026-11-10 ...` becomes `- [ ] Water plants 🔁 every day 📅 2026-11-11 ...`.
- **Completed in Todoist**, plain rule: the task stays open and only the `📅` on the line moves to the new date.
- **Rules with `starting <date>`** (for example `every week starting 16 Nov 2026`), written in Todoist: closing the task completes it for good. Closed from the note, the line stays closed and the log says `Closing the recurring task completed it for good (Todoist rule "...")`. Closed in Todoist, it arrives as a normal close.
- **Dropped close.** If you close a recurring task in the note, but Todoist already closed an occurrence or moved the date since the last sync, the close is dropped: the line takes Todoist's state (open, new `📅`) and the log says `The brain close was dropped: the Todoist due moved since the last sync`. The same happens when Todoist applied your close but its answer was lost, and then the message says "dropped" although the close did happen. A non-recurring task you check in the note is closed even when its date moved in Todoist.

### Completed on both sides

If the status changed on both sides to different states, Todoist wins and the log says `Completion changed on both sides; Todoist wins. Brain value: closed` (or `open`). If both sides now agree, nothing is logged.

---

## Creating Tasks from the Brain

A task line you write is created in Todoist at the next sync when **all** of these hold:

1. It is **open**: not `[x]`, `[X]` or `[-]`. The boxes `[/]`, `[?]`, `[!]` and `[>]` are open and are created.
2. It is **top level**: no indent. One leading space still counts as top level; a tab or two spaces do not.
3. It has **no `🆔`** at all.
4. It sits **in one of these places**:
   - a **project note** of the vault's tree: the task is created in that project, and under the section whose `##` heading is above the line when that heading is linked to a section;
   - a **new note directly in the sync folder**, which becomes a project in the same sync;
   - **any other note, if the line has the tag `#todoist`**: the task is created in the **root project**, and the line stays in its note. A `#todoist` line inside a project note goes to that note's project instead. The tag is not sent as a label.
5. Its text passes the checks under [Text](#text): not empty, under about 500 characters, no `#`, no signifier emoji, no double spaces, no line break.
6. The note is in scope: not under `_system/` or `.kokobrain/`, not a `.view` file, not in the templates folder, and the line is not inside a code block.
7. The note is saved: a line you are still typing in an open tab is created after it is saved and indexed.

The anchor is written to the line first, then the task is sent, with its priority, labels, date and recurrence. A `🔁` rule with a `📅` is sent together; a `🔁` alone is sent as the rule.

If Todoist refuses a task with a client error, the line is detached and kept, and the log says `Todoist refused item_add: ...; the line is detached and kept (remove its 🆔 to create it again)`. Any other failure is retried at the next sync, with the same request, so a lost answer never makes a duplicate.

Lines that are skipped and why are written to the sync log as `create-skipped` and `orphan-anchor` rows, on **manual** syncs only. Run **Todoist: Sync now** and open the log to see them.

---

## Moves and Sections

### Sections

Only `##` (level 2) headings are sections. A `#` heading ends the current section, so lines below it and above the next `##` belong to no section. Headings deeper than `##` are ignored. Frontmatter and code blocks are skipped.

- **A new section in Todoist** appends `## Name` at the end of the project note. If the note already has exactly one heading with that text, the two are paired and nothing is written.
- **A section renamed in Todoist** renames the heading in place, and its tasks stay under it, when the old text is in the note once and the new text is not.
- **A section deleted or archived in Todoist** leaves the heading in the note and nothing is written.
- **A new `##` heading in a note** becomes a Todoist section only when the heading appears once in the note, has text, has at least one task line under it, and no section is linked to that text yet. A heading with no task under it is left alone. The tasks follow in the next sync: the first sync creates the section, the next one moves the tasks into it.
- **A new task under a heading that is already a section** is created directly in that section.
- **Renaming a heading in the note creates a new section** named like it. The old section stays in Todoist with its old name, the tasks move to the new one, and the log says `section-renamed`. It does not rename the old section.
- The order of sections and tasks is not synced.

Tasks of no section sit above the first `##` heading, and are tasks of the project root in Todoist.

### Moving lines

Only top-level, open task lines move, one at a time, and only when the move is clear:

- **Moved in the note** to another `##` heading, or above the first heading, moves the task to that section (or to the project root) in Todoist.
- **Moved to another project note** moves the task to that project, and to the section of the heading it is under.
- **Moved in Todoist** to another section or project moves the line to the matching heading or note, keeping its anchor and text.
- **Moved on both sides:** Todoist wins and the log says `The task moved on both sides; Todoist wins. Brain place: ...`.
- A move to a heading that has no section yet waits until the section exists.
- A subtask, a closed task and a frozen link never move.

A `#todoist` line outside a project note stays where it is when the task moves in Todoist; only the stored place follows.

Moves count toward the limit of 50 edits per sync.

---

## Deleting and Detaching

Nothing is ever deleted on the other side. A synced task is **detached** instead.

### What detaches a task

| Trigger | Log message ends with |
|---------|-----------------------|
| The task is deleted in Todoist | `Todoist task <id> was deleted in Todoist` |
| Its project is deleted in Todoist | `The project of Todoist task <id> was deleted in Todoist` |
| The task is moved to a project outside the vault's tree | `Todoist task <id> moved to a project outside the vault's tree` |
| The line is moved to a note that is not a project note and has no `#todoist` | `The line moved to a note out of sync scope (no project note and no #todoist); the task is not moved in Todoist` |
| The line is missing from the vault in 3 syncs in a row | `The line was not found in the vault in 3 syncs in a row` |

Every message ends with `; the link is detached and neither side is deleted`. A line that comes back before the third sync keeps syncing. A line moved into an excluded path (templates, `_system/`, `.view`) counts as missing. A project note whose project was deleted in Todoist or moved out of the tree is detached too, with its tasks, and the note is kept.

Closed lines stay linked as long as they are in the vault. Deleting many old `[x]` lines at once can therefore trip the [line brake](#the-line-brake).

**Deleting a project note** does not remove or stop the project: a new empty note appears at the next sync, and the old tasks detach after 3 syncs (or trip the line brake) and never come back to it. To stop syncing a project, archive it or move it out of the root tree in Todoist.

### What a detached line is

Nothing visible changes. The line keeps its text, status and `🆔` anchor; the Todoist task keeps its state. There is no marker in the note or in Todoist, only the `detach` row in the [sync log](#the-sync-log).

A detached line never syncs again and is never created in Todoist again, even if its task returns to the tree or the line returns to the vault. **There is no way to re-attach it.**

### Starting over with a line

To get a new Todoist task from a detached or orphaned line, remove its whole `🆔 td-...` token. The next sync creates it as a new task. The old Todoist task is not touched, so if it still exists you now have **two** tasks. Delete the one you do not want in Todoist.

---

## Conflicts

When a field changed on both sides since the last sync to different values, **Todoist wins**: the line is patched with the Todoist value, nothing is sent for that field, and a `conflict` row is written to the log:

`The <field> changed on both sides; Todoist wins. Brain value: <value>`

The field is `text`, `due date`, `priority` or `tags`. Completion has its own message, see above. When both sides reached the same value, nothing is logged. Conflict rows quote the value from the note, which can include task text.

---

## When It Runs

| Trigger | When |
|---------|------|
| `manual` | **Todoist: Sync now** |
| `vault-open` | Once, when the vault opens |
| `interval` | Every **Sync interval** minutes |
| `focus` | When the app window regains focus |
| `after-save` | 5 seconds after you save a note with at least one anchored task line. A new save inside the 5 seconds restarts the wait |

Rules for automatic syncs:

- **Idle until the first manual sync.** Automatic syncs do nothing, silently, until the first manual sync has completed.
- **One at a time.** A trigger that arrives during a sync is queued as one follow-up. **Sync now** during a sync waits for it and then runs, and its toast shows that run's result.
- **At least 30 seconds apart.** A trigger inside the 30 seconds is delayed, not dropped. **Sync now** ignores the gap.
- **Quiet skips.** Automatic syncs do not start when sync is off, when another vault is open, when the vault index is not ready, or after Todoist rejected the token (see below).
- **Rate limit.** After a Todoist rate limit, no automatic sync runs until the wait ends (the time Todoist gives, otherwise 60 seconds), and **Sync now** refuses with `Todoist rate limit reached. Try again in N second(s).`

A sync pulls from Todoist first, then writes to your notes, then sends your changes. Large batches go to Todoist in requests of at most 100 commands.

---

## Safety Limits

### Per-sync limits

| What | Limit | Counted as |
|------|-------|------------|
| Creates | 25 | new projects + new sections + new task lines |
| Close or reopen | 25 | closes + reopens together |
| Edits | 50 | edits and moves of existing tasks |
| Detaches | 10 | tasks to detach, for any reason |

Over a limit (more than the number):

- **Sync now** asks, with a dialog titled **Todoist sync** and the buttons **Sync** and **Cancel**. **Sync** runs the sync with that kind of change unlimited; **Cancel** stops with `Todoist sync cancelled; nothing was changed.` Several dialogs can come in one sync, in this order: detaches, close or reopen, edits, creates.
- **An automatic sync** never asks. It leaves that kind of change out, finishes, and shows a persistent notice. The same change is planned again at every sync, until a manual sync confirms it.

The dialog texts:

> This Todoist sync would create 1 project, 2 sections and 3 tasks in Todoist from new notes and task lines, more than 25 in one sync. Continue?

> This Todoist sync would close or reopen N tasks in Todoist, more than 25 in one sync. Continue?

> This Todoist sync would update N tasks in Todoist with edits made in the brain, more than 50 in one sync. Continue?

> This Todoist sync would detach N tasks deleted or moved on one side, more than 10 in one sync. Their lines and Todoist tasks are kept but stop syncing. Continue?

The notices from an automatic sync (they close with a button, and clear after a sync that skipped none of that kind):

- `Todoist automatic sync skipped creating N tasks from new task lines: more than 25 in one sync. Run "Todoist: Sync now" to confirm them.` (N counts projects, sections and tasks together.)
- `Todoist automatic sync skipped closing or reopening N tasks: more than 25 in one sync. Run "Todoist: Sync now" to confirm them.`
- `Todoist automatic sync skipped sending brain edits of N tasks: more than 50 in one sync. Run "Todoist: Sync now" to confirm them.`
- `Todoist automatic sync skipped detaching N deleted or moved tasks: more than 10 in one sync. Run "Todoist: Sync now" to confirm them.`

### The line brake

A scan that lost most of your lines (a folder moved away, a vault only half synced) must not look like you deleted them. When fewer than half of the synced task lines are found in the vault, the sync stops before it writes anything.

- **Sync now** shows: "Synced task lines missing from the vault: X of Y. If you deleted them, continue: after 3 syncs in a row without a line, its link is detached and its Todoist task is kept. If they should be there (a folder moved, a vault half synced), cancel and restore them first. Continue?" **Sync** runs the sync and counts a miss for every missing line; **Cancel** stops with `Todoist sync stopped: fewer than half of the synced task lines were found in the vault. Nothing was changed.`
- **An automatic sync** stops with a persistent notice: `Todoist automatic sync stopped: fewer than half of the synced task lines were found in the vault. Nothing was changed. If you deleted them, run "Todoist: Sync now" to confirm.` It counts no misses.

While you stay under the brake, the lines that you really deleted detach only through manual **Sync** confirmations, 3 syncs in a row.

### Other protections

- **Vault switch.** If you switch vaults during a sync, it stops before its next write with `The vault changed during the Todoist sync; nothing more was written.`
- **Open notes.** The sync writes into a note that is open in a tab without saving or reloading it. The active editor takes the change directly, kept out of the undo history, and for other tabs the editor's autosave writes it a moment later. If you edited that line meanwhile, the change is skipped and retried at the next sync.
- **Lost answers.** Every command to Todoist carries a stored id, so a request repeated after a lost answer is applied once.

---

## Status Bar

While **Sync with Todoist** is on, a chip on the right of the status bar shows the state:

| Text | Meaning |
|------|---------|
| `Todoist syncing` | A sync or a connection check is running |
| `Todoist synced HH:MM` | The last successful sync finished at that local time |
| `Todoist not synced yet` | No successful sync since the app started or the vault opened |
| `Todoist sync error` | The last run failed. Hover for the reason |

The time is kept in memory, so the chip reads `Todoist not synced yet` after every app start until the first sync succeeds. The error stays until the next run starts. A cancelled manual sync also shows `Todoist sync error` with `Todoist sync cancelled; nothing was changed.`

---

## The Sync Log

Run **Todoist: Show sync log** from the Command Palette. It lists the newest 100 rows, newest first. The line at the top reads `Last cycle YYYY-MM-DD HH:MM:` and sums up the newest cycle. **All**, **Cycles** and **Events** filter the list. The columns are time, kind, anchor and text. An empty log reads "No sync log entries yet."

The log lives in the vault's `.kokobrain/kokobrain.db` and keeps the newest 1000 rows.

### Cycle rows

One `cycle` row is written for every sync that started, also when it failed or was cancelled. A refusal (such as "The vault is still indexing"), the silent wait for the first sync and a vault switch write none. The row reads as parts joined by `;`:

1. `Manual` or `Automatic`, the trigger, `ok`, `cancelled` or `failed (<kind>)`, and the time it took.
2. What changed (notes created, tasks inserted, links paired, lines unmatched, lines updated, headings written, Todoist updates, tasks, projects and sections created, projects renamed, detached), or `nothing changed`. `rebuild` first when the sync was a rebuild.
3. `skipped over cap: ...` when a limit left something out.
4. `sent <type> N, ...` for the commands sent to Todoist, for example `sent item_close 2`.
5. `sync_token advanced` or `sync_token kept`. Kept means the next sync reads the same Todoist changes again; it happens after a stale write, after skipped detaches, when a Todoist edit hits a task whose close or reopen goes out in the same sync, and on every failed or cancelled sync.

For example: `Automatic (interval) ok in 812 ms; nothing changed; sync_token kept`.

Automatic syncs that change nothing share one row, which counts them (`5 cycles since ...`). The failure kinds are `invalid-token`, `rate-limit`, `unreachable`, `root-missing`, `lines-missing` and `error`. A cycle row never holds task text.

### Event rows

Every other row is an event:

| Kind | Meaning |
|------|---------|
| `conflict` | A field, the completion, a project name or a task's place changed on both sides; Todoist won. The message names the brain value |
| `close-dropped` | A close made in the note was dropped because the Todoist due moved |
| `pending-dropped` | A close or reopen waiting from an earlier sync was no longer wanted and was cleared |
| `recurring-completed` | Closing a recurring task completed it for good |
| `detach` | A task or project note was detached; both sides were kept |
| `frozen` | An anchor is on more than one line, so the task does not sync |
| `unmatched` | A Todoist task has no line, or an anchored line has no Todoist task (rebuild mode) |
| `anchor-conflict` | A Todoist task claims an anchor another task owns, or several tasks match one pending create; none is paired |
| `content-skipped` | A Todoist task name holds a signifier emoji, so it was not inserted |
| `anchor-mismatch` | The line built for a Todoist task would not read back with its anchor, so it was not inserted |
| `due-dropped` | A Todoist due date is not `YYYY-MM-DD` |
| `recurrence-dropped` | A recurrence text holds a signifier or `#`, so it was left out |
| `content-roundtrip` | A Todoist name would not read back from a line: inserted as it is but never pushed, or, on a rename, not written |
| `duplicate-project-note` | A project is named by more than one note; nothing is written to them |
| `description-conflict` | The line text cannot take the Todoist name (tag, link or signifier inside) |
| `content-not-pushed` | The note text was not sent to Todoist; the reason is in parentheses |
| `due-not-pushed` | A `📅` removed from a recurring task was not sent |
| `create-skipped` | A line was not created in Todoist, with the reason. Manual syncs only |
| `orphan-anchor` | A `🆔` has no link and no Todoist task. Remove it to create the task. Manual syncs only |
| `section-renamed` | A renamed heading was created as a new section |
| `stale` | A line or note changed since the scan, so a write was skipped and is retried at the next sync |
| `command-error` | Todoist refused a command with a client error: `Todoist refused <type>: <status>` |

Some event rows quote text from a line: `conflict`, `description-conflict`, `content-not-pushed` and `create-skipped`. Others carry note paths, section names or Todoist ids.

### Debug logging

For the exact commands the sync sends, use the debug log:

1. Open **Settings** > **Troubleshooting**.
2. Turn on **Save debug log to file** ("Write frontend debug logs to the system log directory"). **Debug mode** ("Log debug messages to the browser console") only prints to the developer tools of the app window.

The log is one file per session in `~/Library/Logs/com.diegorv.kokobrain/`, named by the session start time. The Todoist sync writes lines tagged `TODOIST` or `TODOIST-SYNC`: one for each sync (with its counts), each pull, each batch of commands (command type, task anchor or note path, and uuid) and each answer per uuid. These debug lines do not contain task text. Errors are logged there too while the switch is on, such as `sync failed:`, `sending commands failed:` and `loading projects failed:`. They carry the raw error, which can include note paths and, rarely, a whole task line. If you turned on **Error monitoring** in Settings > Sentry, these errors are also sent there.

---

## Troubleshooting

### Messages

| Message | What it means and what to do |
|---------|------------------------------|
| `The vault is still indexing. Try again when it finishes.` | Wait for the index. Automatic syncs skip silently |
| `Turn on Todoist sync in Settings > Todoist first.` | **Sync with Todoist** is off |
| `Add your Todoist API token in Settings > Todoist first.` | Paste the token |
| `Choose a sync root project in Settings > Todoist first.` | Press **Load projects** and pick one |
| `The Todoist sync folder must be a folder inside the vault. Fix it in Settings > Todoist.` | The **Sync folder** is absolute, starts with `~`, has a drive letter or a `..` |
| `A Todoist sync is already running.` | Wait for it. This also appears while **Check sync connection** runs |
| `The sync root project was not found in Todoist. Choose it again in Settings > Todoist.` | The root project was deleted or archived (renaming it is fine). Pick it again |
| `Todoist rejected the API token. Check it in Settings > Todoist.` | HTTP 401 or 403 |
| `Todoist rate limit reached. Try again later.` or `... Try again in N second(s).` | Wait. Automatic syncs retry after the wait |
| `Could not reach Todoist. Check your connection and try again.` | Network or Todoist error. The next sync tries again |
| `Todoist sync failed. Details are in the log.` | Turn on **Save debug log to file** and look for `sync failed:` |
| `Todoist sync stopped: fewer than half of the synced task lines were found in the vault. Nothing was changed.` | See below |

Automatic syncs show the same failures as persistent notices, for example `Todoist automatic sync stopped: the API token is invalid. Update it in Settings > Todoist.`, `Todoist rate limit reached. Automatic sync will retry later.`, `Could not reach Todoist. Automatic sync will retry later.` and `Todoist automatic sync failed. Details are in the log.` A notice clears after the next successful sync.

### A task does not appear in Todoist

Run **Todoist: Sync now**, open the sync log and look for a `create-skipped` row, then check:

- The line is open, top level (no indent) and has no `🆔` of its own.
- It is in a project note, or tagged `#todoist`, or in a new note directly in the sync folder.
- Its text has no `#`, no signifier emoji, no double space and is under about 500 characters.
- It is not in a code block, `_system/`, the templates folder or a `.view` file.
- The note is saved (not still being typed in a tab).
- The sync has not run its first manual sync yet, or the creates are over 25 and an automatic sync skipped them. Look for the notice, then run **Sync now**.
- The project note is not frozen by a second note with the same `todoist_project` (a `duplicate-project-note` row).

### I checked a task and nothing happened in Todoist

- The sync has not run yet. A Tasks View checkbox waits for the next interval or focus sync; run **Todoist: Sync now**.
- Automatic syncs are idle: before the first manual sync, or after a rejected token.
- The box is `[/]`, `[?]`, `[!]` or `[>]`: those are open, so nothing is sent.
- It is a recurring task: it rolled to its next date and the line went back to `[ ]` with a new `📅`. That is the expected result.
- The link is frozen (`frozen` row) or detached (`detach` row).
- More than 25 closes in one automatic sync: look for the notice and run **Sync now**.

### A task does not appear in the note

- It is closed in Todoist (only open tasks are inserted).
- It is in a project outside the root tree, or an archived project.
- Its name holds a signifier emoji (`content-skipped`).
- You are in rebuild mode (`Todoist sync rebuilt N links from the vault; nothing was created.`), see [First sync](#first-sync).
- It is in the Todoist **Inbox** (where Quick Add on the phone puts tasks by default) and **Include Inbox** is off.
- Automatic syncs are idle (before the first manual sync, or after a rejected token). Run **Todoist: Sync now**.
- Its project note is frozen by a second note with the same `todoist_project` (a `duplicate-project-note` row).

### A text change from Todoist does not show up

A tag, link or signifier sits in the middle of the line text. The line is kept and the log says `description-conflict`. Change the text in the note.

### A task is in Todoist twice

The usual cause: you removed the `🆔` from a line whose task still exists in Todoist, or from a detached line. The sync creates a new task and leaves the old one alone. Delete the one you do not want in Todoist. Also keep **Include Inbox** on in one vault only.

### Two lines share one anchor

You copied a line. That task is frozen until one line is left. Delete the `🆔 td-...` from the copy, or the copy itself.

### Two notes share one project

A copied project note carries the same `todoist_project`. That project is frozen: nothing syncs for it in either direction and each sync logs `duplicate-project-note`. Delete the copy. The project unfreezes by itself when one note carries the id.

### Invalid token (401)

The notice says the token is invalid and automatic syncs stop. Fix the token in Settings > Todoist. **Sync now** still runs with the old token, so you can see the real answer, but a successful manual sync does **not** turn automatic syncs back on: they restart when the token is changed, or when the vault is reopened or the app restarts.

### Rate limit

Todoist limits how fast the sync can call it. Wait for the time in the message. Without a time the wait is 60 seconds.

### The sync is stuck on "fewer than half of the synced task lines"

Fewer than half of the lines that the sync tracks were found. Check first that a folder was not moved or that the vault is complete (a sync tool may be mid-way). If you really deleted the lines, run **Todoist: Sync now** and choose **Sync** in the dialog: after 3 such syncs in a row their links detach. An automatic sync never confirms this, so it keeps stopping until you do.

### A note with Windows line endings (CRLF)

The sync does not write into a note that contains any `\r\n` line ending. The sync log shows a `stale` row with the note path and `crlfLineEndings`, nothing is written to that note, tasks you wrote there are not created, and the sync token is held back at each sync that has something to write to that note. Reading is not affected. Convert the note to Unix line endings (LF) with your editor. There is no setting for it.

### How to stop syncing

- **Everything:** turn off **Sync with Todoist**. Nothing is read or written. Edits made on both sides meanwhile are merged at the next sync, with the usual conflict rule.
- **One project:** archive it in Todoist (pauses it), or move it out of the root tree (detaches it).
- **One task:** move its line into a note that is not a project note and has no `#todoist` (detaches it).
- **Do not** remove `todoist_project` from a note in the sync folder: the note is then created as a new project.

### Starting over

Deleting `.kokobrain/kokobrain.db` drops the sync state; deleting the whole `.kokobrain/` folder also drops the settings, including the token and root project. Set Todoist up again, then run **Sync now**: it is a rebuild that pairs open lines with their tasks by anchor and creates nothing (closed lines stay unlinked). Run **Sync now** again for the normal first sync; automatic syncs stay off until then. If it keeps saying "rebuilt", see the warning under [First sync](#first-sync).

### A note is open in a tab

The sync still writes into it, without saving or reloading. If you edit the line at the same moment, the write is skipped and retried at the next sync. A `stale` row means just that.

---

## Privacy and Data

- **Where it connects.** Only to `api.todoist.com`, through the Todoist Sync API (`POST /api/v1/sync`), from the app's TypeScript side. While **Sync with Todoist** is off, only the buttons and commands you press call Todoist: **Load projects** and **Todoist: Check sync connection**, and only with a token.
- **What it receives.** At every sync, your account's active projects, sections and tasks: Todoist has no server-side filter. The app keeps only the root tree and drops the rest from memory.
- **What it sends.** Only for the tasks, projects and sections of the vault's tree: task text, due date and recurrence rule, priority, labels (your `#tags`, plus `personal` in a Personal vault), completion state, moves, project names (note file names), section names (`##` headings) and, on each new task, the description `kokobrain:td-...`. Never sent: note bodies, note paths, the vault path.
- **The token** is stored in plain text in the vault's `.kokobrain/settings.json`. Vault mods can read it (see [Vault Mods](28-mods.md)).
- **The sync state** (links between lines and tasks, the sync token, the project state and the sync log) is stored in the vault's `.kokobrain/kokobrain.db`. The log rows can quote task text, note paths and Todoist ids. Cycle rows never hold task text.

If you sync your vault with another tool, **exclude the `.kokobrain` folder**: it holds the token and the state of this machine.

---

## Known Limits

- **CRLF notes** are skipped, see [Troubleshooting](#a-note-with-windows-line-endings-crlf).
- **A rare duplicate project.** If a new note's project add is sent, the answer is lost, and you rename the note before the next sync, Todoist can end up with two projects, and the note's task lines detach.
- **Repeated events do not fold.** Automatic syncs that change nothing share one log row, but an event that is logged again at every sync is not merged, and can fill the 1000-row log.
- **A successful manual sync does not clear a rejected token.** Changing the token, reopening the vault or restarting the app does.
- **The Todoist description is not synced.** Only the `kokobrain:` back-link is written, once.
- **Priorities are lossy.** `🔽`, `⏬` and no emoji are all P4.
- **Subtasks are flat**, and indented lines in the note are not created.
- **There is no re-attach** for a detached line.
- **Closed lines stay linked** until you delete them, and a mass deletion trips the line brake.
- **The 500-character limit** counts characters in the sync's own way; how Todoist counts them is not verified, so treat it as "about 500".

---

## Next Steps

- [Tasks & Todoist](10-tasks-and-todoist.md) - the Tasks view, statuses and task metadata
- [Settings](19-settings.md#todoist) - all Todoist settings
- [Vault Mods](28-mods.md) - JavaScript mods in `_system/mods/`
