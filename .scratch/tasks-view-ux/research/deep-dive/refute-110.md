# Refutation: Issue 110 (open rule, status glyphs, row hooks)

Read at HEAD `d2304ac9e`. Neither 108 nor 242 has landed, so anything about their output is inference from their ticket text (marked INFERRED). Everything else was read in code at the cited line (VERIFIED).

## Verdict

**Confidence: medium** that a fresh agent implements 110 correctly from the text alone.

Most of the ticket holds up against the code:

- The `checked` reads it names are the only ones in the view path (`src/lib/features/tasks/tasks.logic.ts:22`, `:40`, `:103`; `src/lib/features/tasks/TasksView.svelte:191`).
- All seven lucide icons exist and resolve through the `./icons/*` export (`node_modules/@lucide/svelte/dist/icons/circle-dot.svelte` and the other six; `node_modules/@lucide/svelte/package.json` exports, version 1.67.0).
- The pure-logic guard really rejects `@lucide/svelte` in a `.logic.ts` (`src/tests/lib/architecture/pure-logic.test.ts:43`, regex `(^|[/@-])svelte([/-]|$)`).
- The tone tokens exist (`src/app.css:22`, `:72-73`).
- `features/tasks` imports no other feature, so `event-calendar -> tasks` is acyclic (grep of `src/lib/features/tasks`, empty).
- `feature-cycle.test.ts` rewrites `featurePairs` without failing (`src/tests/lib/architecture/feature-cycle.test.ts:41-44`).

It falls short of high confidence for these reasons:

1. One factual claim is false. `[*]` is not a task in Rust at all.
2. One acceptance criterion calls `explainEmptyTasks` outside the contract Issue 108 defines. The obvious way to write that test can pass while stage 2 is still broken.
3. The count-line test, as written, cannot tell "open" from "total".
4. The fixture's "realistic metadata" contradicts the example aria-labels, because the label uses the raw `task.text`, which carries the signifiers.
5. The calendar criterion is green before and after the change, but the ticket says nothing about that, so an implementer who follows "test-first" literally may get stuck.
6. The e2e premise "the fixture tasks sit under no `#to-list` heading" may stop being true once 242 adds tagged headings to the fixture vault.

## Must-fix edits

### M1. The `[*]` claim is false for the real parser

- **Change:** "An unknown checkbox character such as `[*]` parses as `todo` with `checked: true`, so it becomes open; that follows B2."
- **To:** "`isTaskOpen` reads only `status`, never `checked`. Rust's task regex accepts only ` xX-/?!>` in the box, so a line like `- [*] foo` is not a task. `map_checkbox_char`'s fallback to `todo` is reachable only by direct calls. Only the e2e mock lists such a line, as `todo` with `checked: true`."
- **Change the AC:** "plus `[*]` parsed as `todo` with `checked: true` being open."
- **To:** "plus a task with `status: 'todo'` and `checked: true` is open (`checked` is ignored)."
- **Evidence:**
  - `src-tauri/src/vault/parsing.rs:1427` (`TASK_RE` class `[xX \-/?!>]`)
  - `src-tauri/src/vault/parsing.rs:1434` (`ORDERED_TASK_RE`, same class)
  - `src-tauri/src/vault/parsing.rs:1600` (`_ => TaskStatus::Todo`, reachable only from `parse_task_line` after the regex matched)
  - `e2e/mocks/vault-index.ts:45` (`\[(.)\]` accepts any character), `:181`, `:184`

### M2. The stage-2 AC calls `explainEmptyTasks` where 108 defines no result, and the natural assertion passes while broken

- **Change:** "`tasks.logic.test.ts`: `explainEmptyTasks` stage 2 with `[x]` and `[/]` tasks does not say every task is closed; with only `[x]` and `[-]` it says "All 2 tasks are closed"."
- **To:** "`tasks.logic.test.ts`, with `hideCompleted: true` and tasks built as Rust sends them. First case: one note with an `[x]` and a `[/]` task, `dateFilter: 'last7days'`. The result is the date stage: message "No open task is in a note edited in the last 7 days", action `{ kind: 'allTime', label: 'All time' }`. Second case: only `[x]` and `[-]` tasks. The message is "All 2 tasks are closed" and the action is `{ kind: 'showCompleted', label: 'Show closed' }`. Third case: a single `[x]` task gives "The only task is closed". Do not assert only that the message lacks the word "closed"."
- **Evidence:**
  - 108 defines stage 3 as "Otherwise the date filter" and says the view calls the function only when the filtered list is empty (`.scratch/open-itens/issues/108-mounted-list-and-rule-sentence.md`, part 3). With `[x]` + `[/]` and `dateFilter: 'all'` the list is not empty, so the result is undefined by contract (INFERRED: 108 has not landed).
  - Today's rule counts `[/]` as checked (`src/lib/features/tasks/tasks.logic.ts:40`). So an unchanged stage 2 returns "All 2 tasks are completed". That string contains no "closed", so a `not.toContain('closed')` test passes on broken code.

### M3. The count-line test cannot tell open from total

- **Change:** "the count line reads "1 open in 1 note" for one open task."
- **To:** "With hide-closed off and two notes, one holding a todo and a done task and the other an in-progress task, the count line reads "2 open in 2 notes". With one open task in one note it reads "1 open in 1 note"."
- **Evidence:** with one todo task, `stats.total` and `stats.pending` are both 1 (`src/lib/features/tasks/tasks.logic.ts:107-111`). So an implementation that prints `stats.total` with the new words passes the ticket's test. The view computes `stats` over `filteredGroups` (`src/lib/features/tasks/TasksView.svelte:54`).

### M4. "Realistic metadata" contradicts the example labels

- **Add after** "One shared fixture builder in `src/tests/lib/features/tasks/` with realistic metadata (due, scheduled, priority, recurrence, tags) and all seven statuses...":
- **Text to add:** "As in Rust, `text` is the raw line text that carries the signifiers the metadata comes from (for example `text: 'Send invoice 📅 2026-11-20 ⏫ #work'`, `metadata.description: 'Send invoice'`). Label tests build the expected string from the fixture's `text`. The two example labels below use tasks whose text has no signifiers. Every task in a group needs its own `lineNumber`, because the rows are keyed by it."
- **Evidence:**
  - `src-tauri/src/vault/parsing.rs:1646` (`text: raw_text.to_string()`) and `:1652` (`metadata: parse_task_metadata(raw_text)`)
  - `src-tauri/src/vault/task.rs:23-24` ("Raw task text")
  - Row keys: `src/lib/features/tasks/TasksView.svelte:169` (`(task.lineNumber)`)
  - The ticket also says the aria-label `<text>` is the raw `task.text` until 109.

### M5. Say that the calendar AC is a regression guard, and complete it

- **Change:** "The calendar chip test (or a new one next to `src/tests/lib/features/event-calendar/EventTaskLane.test.ts`) still shows done and cancelled as closed and the rest as open."
- **To:** "Regression guard, green before and after (the chip already applies the rule locally): `EventTaskLane.test.ts`'s open case also covers `todo`, `question` and `forwarded`, and the done and cancelled cases stay. Run it, and run `src/tests/lib/architecture/feature-cycle.test.ts`, after the chip edit. Commit the rewritten `feature-cycle-baseline.json`. That test never fails on a missing pair, so `git status` is the check."
- **Evidence:**
  - `src/lib/features/event-calendar/EventTaskChip.svelte:18` (local `closed = done || cancelled`)
  - `src/tests/lib/features/event-calendar/EventTaskLane.test.ts:94-107` (open case covers only in-progress and important)
  - `src/tests/lib/architecture/feature-cycle.test.ts:41-44` (writes the file, never fails)

## Should-fix edits

### S1. Name the fixture file

- **Change:** "One shared fixture builder in `src/tests/lib/features/tasks/`".
- **To:** "One shared fixture builder, `src/tests/lib/features/tasks/tasks.fixture.ts` (a `.ts`, not `.test.ts`, so vitest does not collect it), returning `FileTaskGroupV2` groups with `modifiedAt` in seconds".
- **Evidence:**
  - `docs/TESTING.md:31` says shared fixtures live in `src/tests/fixtures/`, so the agent may hesitate. Feature-local helpers already exist (`src/tests/lib/core/markdown-editor/test-helpers.ts`).
  - `vitest.config.ts:16` (`include: ['src/tests/**/*.test.ts']`)
  - `src/lib/features/tasks/tasks.service.ts:20-24` (V2 is seconds, multiplied by 1000)

### S2. The closed-parent AC must use Rust-shaped data

- **Change:** "A closed parent with an open in-progress child stays visible."
- **To:** "`tasks.logic.test.ts`: a `done` parent (indent 0) with an `in-progress` child (indent 1), both built with `checked: true`, is kept, child included, by `filterCompletedTasks`. Fails today."
- **Evidence:** `src/lib/features/tasks/tasks.logic.ts:22`. A child built with `checked: false` through the existing `makeTask` (`src/tests/lib/features/tasks/tasks.logic.test.ts:12-20`) passes today.

### S3. Pin the component-level headline bug and the strike in both directions

- **Add to the `TasksView.test.ts` AC:** "With hide-closed on (the default), the in-progress row is listed and the done row is not. With hide-closed off, the done and cancelled rows' `[data-task-text]` have `line-through` and the in-progress row's does not. The per-status label test runs with `tasksStore.setHideCompleted(false)`."
- **Evidence:**
  - `src/lib/features/tasks/tasks.store.svelte.ts:10` (`hideCompleted` defaults to true)
  - `src/lib/features/tasks/TasksView.svelte:48-50`
  - An implementation that drops the strike entirely passes "in-progress is not struck through".

### S4. Keep the action kind

- **Add after** "with the action label "Show closed"":
- **Text to add:** "The action keeps `kind: 'showCompleted'`; only its label changes. Issue 108's component test that clicks "Show completed" now clicks "Show closed"."
- **Evidence:** `.scratch/open-itens/issues/111-quick-filters.md:30` ("the `showCompleted` action kind, which leaves the action type") expects the kind to survive 110.

### S5. The e2e premise may be stale after 242

- **Change:** "The section-tag clearing steps stay: the fixture tasks sit under no `#to-list` heading."
- **To:** "The section-tag clearing steps stay: `Ship feature A`, `Draft RFC` and the other tasks these tests use sit under no tagged heading, even after Issue 242 adds tagged headings to the fixture vault."
- **Evidence:**
  - `e2e/fixtures/test-vault.ts:105-108` (`## Tasks`, untagged)
  - 242's last AC: "add a second tagged heading to the fixture vault if none exists". None exists today, so 242 adds tagged sections (INFERRED).

### S6. Help doc: "shows the seven glyphs" is not actionable in Markdown

- **Change:** "and shows the seven glyphs (PRD A12)".
- **To:** "and adds a column to the Task Statuses table that names each status's circle in words (open circle, circle with a dot, check, minus, question mark, alert, arrow), plus that the circle's accessible name ends with the status word (PRD A12). The Filters row is renamed to **Hide closed**."
- **Evidence:** `help/documentation/10-tasks-and-todoist.md:37-45` (status table) and `:102` (`**Hide completed** ... Hide `- [x]` done tasks`).

### S7. Stale comment in the view

- **Add:** "The comment above the row ("The circle follows what a click writes, not `task.checked`...") changes to say the glyph follows the status."
- **Evidence:** `src/lib/features/tasks/TasksView.svelte:170`; CLAUDE.md section 8 of the global rules ("update or delete the comments it made wrong").

### S8. Make the "no positional selector" AC checkable

- **Add:** "Check: `grep -nE "svg circle|data-task-row\] (span|button)|aria-label=\"Mark task as (not )?done\"\]" src/tests/lib/features/tasks/` returns nothing."
- **Evidence:** today's hits at `src/tests/lib/features/tasks/TasksView.test.ts:96`, `:117` (exact old label, which breaks with the new label), `:133`, `:145`, `:157`.

### S9. Hover tint

- **Add:** "The circle's color is the `tone` class only; the old `group-hover:text-primary/80` on the todo circle goes."
- **Evidence:** `src/lib/features/tasks/TasksView.svelte:183`. Without this line, an agent either keeps the old tint alongside the tone or asks.

## Dossier errors

1. **Section 4 item 2 recommends a test that passes on broken code.** It suggests `expect(result.message).not.toContain('closed')`. An unchanged stage 2 returns "All 2 tasks are completed" for `[x]` + `[/]` (both `checked`), which passes. See M2.
2. **The count-line AC row in section 2** proposes "one open task: `1 open in 1 note`" and does not notice that `total` equals `pending` in that case. See M3.
3. **Section 2's fixture API** (`taskV2(text, status, overrides)` with "realistic metadata") and the ticket's example labels are listed together without the conflict. If the realistic metadata sits in `text`, the labels no longer read `Mark task as done: Draft plan (in progress)`. See M4.
4. **Section 1.2** calls `TasksView.test.ts:117` a positional selector. It is an exact `aria-label` attribute selector. It still has to change, but because the label text changes, not because it is positional.
5. **Section 5 risk 2** implies the old e2e circle locator stops matching. Playwright's non-exact `name` is a case-insensitive substring match, so `{ name: 'Mark task as done' }` would still match the new label (and not "Mark task as not done..."). Switching to `/^Mark task as done/` is fine, but it is not required for correctness. The duplicate-name risk it describes is real only for non-exact names that are substrings of the circle's new label.
6. **Headline 0.1, the e2e mock regex.** The dossier quotes `TASK_LINE_RE` correctly. Note that its bullet class is `[-*]` only, so it lists `- [*] foo` but not `+ [*] foo`. This has no product impact.
7. The dossier's other line citations that I checked match HEAD:
   - `TasksView.svelte:114`, `:144-146`, `:171`, `:177-187`, `:191`
   - `tasks.logic.ts:22`, `:40`, `:103`
   - `parsing.rs:1427`, `:1434`, `:1600`, `:1649`, `:1666`
   - `e2e/specs/tasks-view.spec.ts:22`, `:33`, `:44`, `:49`, `:57`, `:47`, `:54`
   - `EventTaskLane.test.ts:74-103`
   - `tasks.service.ts:8`, `:152`
   - `docs/TESTING.md:31`
