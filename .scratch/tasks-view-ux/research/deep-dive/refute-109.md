# Refutation: Issue 109, task rows show clean text with date, priority, recurrence and tag chips

Ticket: `.scratch/open-itens/issues/109-row-chips.md`. Dossier: `dossier-109.md`. Read at HEAD `d2304ac9e`. Nothing was run (no vitest, cargo, e2e). VERIFIED = read in code at the cited `path:line`. INFERRED = reasoning, or a predecessor ticket that has not landed.

## Verdict

**Confidence: medium** that a fresh agent implements 109 correctly from the ticket text alone.

The core facts hold. Rust sends the metadata, and `fromV2` copies every field (`src/lib/features/tasks/tasks.service.ts:20-47`). The parser strips dates, priority, recurrence, ids and tags but not block ids (`src-tauri/src/vault/parsing.rs:1776-1878`). `formatDate` and `formatNow` exist (`src/lib/utils/date.ts:15-17`, `:42-44`). `@max-[84px]:` is in use (`src/lib/features/event-calendar/EventBlock.svelte:89`). The e2e mock fills only `dueDate` (`e2e/mocks/vault-index.ts:178-188`). The chip spec is concrete enough to code.

Five gaps would make the agent guess, or would let tests pass while the behavior is broken:

1. The acceptance criteria tell the agent to copy descriptions "from the pinned Rust outputs of `parse_task_metadata`". No such pins exist (Must-fix 1).
2. The view must pass `tags: false` on the raw-text path, but the ticket names nothing that tells the view which path a row is on. `taskDisplayText` returns only a string (Must-fix 2).
3. The criterion "on both paths" for `Call Ana 🆔 td-123 ^abc123` cannot reach the raw path with that input (Must-fix 3).
4. Two component tests pass vacuously with the current test helper, which sets `tags: []` and `description = text` (Must-fix 4).
5. The ticket names no DOM hook for chips. 110's `important` glyph also carries `text-destructive`, so a test that is not scoped to the chip can pass for the wrong reason (Must-fix 5).

## Must-fix edits

### M1. The "pinned Rust outputs" do not exist

- **Sentence to change** (acceptance criterion 2): "`taskDisplayText` with descriptions copied from the pinned Rust outputs of `parse_task_metadata` (the parser tests in `src-tauri/src/vault/parsing.rs`), not written by hand:"
- **Replacement:** "`taskDisplayText` with the descriptions `parse_task_metadata` returns at HEAD, traced from its pipeline (`parsing.rs`, `parse_task_metadata`) and listed here. No Rust test pins them, and this Issue adds none (frontend gate). Use these exact pairs, text -> description (tags): `Send invoice 📅 2026-11-03 ^abc123` -> `Send invoice ^abc123` ([]); `read [[Book#Chapter 2]]` -> `read [[Book 2]]` (['Chapter']); `see [doc](https://example.com/a#b)` -> `see [doc](https://example.com/a)` (['b']); `https://example.com/a#b` -> `https://example.com/a` (['b']); `#todo` -> `` (['todo']); `Call Ana 🆔 td-123 ^abc123` -> `Call Ana ^abc123` ([], id `td-123`); `Send invoice 📅 2026-11-03 ⏫ #work` -> `Send invoice` (['work'], dueDate `2026-11-03`, priority `high`). Issue 075 will change the Book row's description to the raw text. The raw-path expectation does not depend on the description, so the test stays valid after 075."
- **Evidence:**
  - The metadata tests at `src-tauri/src/vault/parsing.rs:3095-3255` cover only simple inputs. A grep for `Chapter`, `example.com/a#b` and `^abc123` across `src-tauri/src` and `src-tauri/tests` returns nothing.
  - Pipeline: date `parsing.rs:1781-1800`, priority `:1802-1810`, recurrence `:1812-1823`, ID `:1825-1833`, tags and whitespace collapse `:1864-1875`. Regexes: `ID_RE` `:1552-1554`, `TASK_TAG_RE` `:1579-1580`, `MULTI_SPACE_RE` `:1583`.
  - Issue 075 writes down today's Book output (`.scratch/open-itens/issues/075-task-tags-follow-note-tag-rule.md`, the second acceptance criterion: "today: tag `Chapter`, description `read [[Book 2]]`").

### M2. Name the raw-path predicate

- **Sentence to change** (Text bullet 2): "It returns the raw `task.text` instead when ..."
- **Replacement:** "A pure exported `usesRawTaskText(task: Pick<TaskItem, 'text' | 'metadata'>): boolean` in `tasks.logic.ts` is true when ... (the conditions below). `taskDisplayText` returns the raw `task.text` exactly when it is true, and the view passes `{ tags: !usesRawTaskText(task) }` to `taskChips`. Both functions take `Pick<TaskItem, 'text' | 'metadata'>`, so Issue 111's `TaskRow` and Issue 239's search pass rows unchanged."
- **Evidence:** the ticket's Chips bullet requires "`tags: false` on the raw-text path", but `taskDisplayText(task)` returns a string. Comparing its result with `metadata.description` does not identify the path, because both paths strip trailing ids. Issue 239 calls `taskDisplayText` on rows (`239-tasks-priority-search-reset-narrow.md`, the Search bullet), and Issue 111's `TaskRow` is a `TaskItem` plus extra fields (`111-quick-filters.md`, the `TaskRow` bullet).

### M3. The "both paths" anchor case cannot reach the raw path

- **Sentence to change** (acceptance criterion 2): "and the anchor and block id removed from `Call Ana 🆔 td-123 ^abc123` on both paths."
- **Replacement:**
  - "Description path: text `Call Ana 🆔 td-123 ^abc123` with description `Call Ana ^abc123` returns `Call Ana`. Rust already removed the anchor, so only the block id strip runs.
  - Raw path: text `Call [[Ana#Phone]] 🆔 td-123 ^abc123` with description `Call [[Ana]] ^abc123` and tags `['Phone']` returns `Call [[Ana#Phone]]`. The block id goes first, then the anchor.
  - Also on the raw path: a text that ends with the anchor and no block id (`Call [[Ana#Phone]] 🆔 td-123`) returns `Call [[Ana#Phone]]`."
- **Evidence:** `ID_RE` (`parsing.rs:1552-1554`) runs at `:1825-1833` and removes `🆔 td-123` from the description, so the description path never holds the anchor. The text `Call Ana 🆔 td-123 ^abc123` has no wikilink heading, no `#` in a URL and a non-empty description, so the ticket's own rule sends it down the description path only.

### M4. Two component guards pass vacuously

- **Sentence to change** (acceptance criterion 3): "A task `read [[Book#Chapter 2]]` shows no `#Chapter` chip."
- **Replacement:** "A task `read [[Book#Chapter 2]]` with the metadata Rust sends for it (`{ description: 'read [[Book 2]]', tags: ['Chapter'] }`) renders the wikilink `Book#Chapter 2`, which opens `Book`, and shows no `#Chapter` chip. With `tags: []` the assertion passes even when `tags: false` is ignored."
- **Sentence to change** (acceptance criterion 4): "The toggle still sends the raw `task.text` and status as `expectedText` and `expectedStatus`."
- **Replacement:** "With the Send-invoice task, whose display text differs from its raw text, the toggle still sends `expectedText: 'Send invoice 📅 2026-11-03 ⏫ #work'` and `expectedStatus: 'todo'`. The existing toggle test uses a task whose description equals its text, so it cannot catch a swap."
- **Also spell out** in acceptance criterion 3 the Send-invoice metadata: `{ description: 'Send invoice', dueDate: '2026-11-03', priority: 'high', tags: ['work'] }`.
- **Evidence:** the test helper builds `metadata: { description: text, tags }` with `tags = []` by default (`src/tests/lib/features/tasks/TasksView.test.ts:34-48`). The existing toggle test uses `Ship feature A` (`:112-125`). Today the view renders `parseTaskTextSegments(task.text)` and no chips (`src/lib/features/tasks/TasksView.svelte:194`), so the Book test passes before and after a broken implementation unless the metadata carries the false tag.

### M5. Chips need test hooks

- **Sentence to add** (Chips bullet, after the chip shape): "Each chip renders with `data-task-chip="<kind>"`, and an overdue due chip also carries `data-overdue`. Tests and the e2e spec find chips through these hooks, never by position or by color class alone."
- **Change acceptance criterion 3** to read: "a due chip (`[data-task-chip="due"]`) with label `Nov 3`, whose `svg` carries `text-destructive` and whose label does not".
- **Evidence:**
  - Issue 110 makes "hooks, not position" the rule for row parts (`110-open-closed-rule.md`, "Row test hooks and one fixture"). Its glyph table gives `important` the tone `text-destructive`, so `[data-task-row] .text-destructive` is not a chip-specific assertion.
  - The 109 e2e criterion compares "the chip's top" with "the text's bottom" but names no selector for the chip.
  - The ticket also requires the overdue label in `text-foreground` (Chips bullet), and nothing tests that today.

## Should-fix edits

### S1. Widen the raw-path detection, or name the known holes

- **Problem:** `parseTaskTextSegments` makes a `link` segment only for an absolute, safe URL. `[doc](notes/a.md#sec)` and `[doc](#sec)` stay plain text (`src/lib/features/tasks/tasks.logic.ts:142-148`), and `/\S+:\/\/\S*#/` does not match them. Rust still strips their `#sec` (`parsing.rs:1579-1580`, `:1873`), which leaves `[doc](notes/a.md)` in the description plus a false `#sec` chip. The same happens for `#` inside a link label (`[#work notes](https://x.com)`), for a mid-word `#` (`page#section`) and for `#` inside inline code.
- **Option A, simplest:** replace the three link conditions with one test on the raw text, `/\S#[A-Za-z0-9_]/`, meaning a `#` directly after a non-space character, plus the empty-description test. A real tag starts after whitespace or at the start of the line, and Issue 075 states that a mid-word `#` will not be a tag (`075-...md`, the side-effects bullet). This catches every case above, plus `[[Book#Chapter 2]]` and `https://example.com/a#b`.
- **Option B:** keep the ticket's list and add "a `link` or wikilink segment whose `label`, `url` or `display` contains `#`" and "a markdown link `](...#...)` that stays text". Add a test for `see [doc](notes/a.md#sec)` either way.

### S2. Make the strip regexes match real lines

- **Sentence to change:** "On both paths it removes, in this order, a trailing block id (` \^[A-Za-z0-9-]+$`) and then a trailing Todoist anchor (` 🆔️? td-\S+`)"
- **Replacement:** "On both paths it trims trailing whitespace, then removes a trailing block id (`/\s\^[A-Za-z0-9-]+$/`), then a trailing Todoist anchor (`/\s🆔️?\s*td-\S+$/u`), and trims again. The raw-text path is also taken when the description is empty after this stripping, so a `- [ ] #todo ^abc` row (description `^abc`) shows `#todo`."
- **Evidence:**
  - Task lines are split on `'\n'` only (`parsing.rs:1696`), and `TASK_RE` captures `(.*)$` (`:1427`), so the raw text of a CRLF note ends in `\r`. The ticket's `$`-anchored block id regex then never matches on the raw path. The description is trimmed (`:1875`).
  - The ticket's anchor regex has no `$` even though the text says "trailing".
  - The Todoist token is `🆔 td-…` (`src/lib/features/todoist-sync/anchor.logic.ts:55-57`), and the parser accepts an optional space after the emoji (`:18`).

### S3. Export the stripping for Issue 241

- **Sentence to add:** "The trailing strip is its own export, `stripTaskTrailers(text: string): string`, which `taskDisplayText` calls. Issue 241's Copy task text reuses it."
- **Evidence:** Issue 241 says Copy task text uses "the raw `task.text` without its trailing block id and Todoist anchor (Issue 109's stripping)" (`241-tasks-row-status-menu-with-undo.md`, the menu items bullet).

### S4. Say where `today` is read before rows exist

- **Sentence to change:** "The view reads `today` from `formatNow('YYYY-MM-DD')` (`#lib/utils/date.js`) when the rows are rebuilt"
- **Replacement:** "The view keeps `today` in a `$derived` that reads `tasksStore.fileTaskGroups` and returns `formatNow('YYYY-MM-DD')`, so it is re-read on every refetch. No store getter is added. Issue 111 moves the read into `visibleRows`."
- **Evidence:** at HEAD the view's only derived value over the groups is `filteredGroups` (`TasksView.svelte:46-52`). Rows arrive in Issue 111, and Issue 238 reads today "when the store's `visibleRows` derived runs" (`238-...md`, the `applyQuickFilters` bullet).

### S5. Chip type size

- **Problem:** the ticket says chips are `text-xs`. The app's chrome type scale assigns chips and badges to `text-label` (11px) (`src/app.css:76-88`), and the research synthesis says "Chips at `text-label`" (`.scratch/tasks-view-ux/research/synthesis.md:132`).
- **Fix:** change "Chips are `text-xs`" to "Chips are `text-label`", or record that `text-xs` was chosen on purpose. This is visible to the owner, so the reviewer should confirm.

### S6. Overdue tone on closed rows

- **Problem:** `overdue` depends only on `dueDate < today`. A done or cancelled task with a past due date shows a red calendar icon next to struck-through text whenever closed tasks are shown (Issue 110's toggle off, or Issue 111's Show closed or Show all).
- **Fix:** either add "`taskChips` takes `{ tags, open }` and sets `overdue` only when `open` (`isTaskOpen(status)`)", or add one line accepting the tone on closed rows. The ticket currently says neither.

### S7. Test the circle label

- **Sentence to add** (acceptance criterion 3): "The circle's `aria-label` reads `Mark task as done: Send invoice (todo)`."
- **Evidence:** the ticket's "The circle's label" bullet has no matching criterion. The label format comes from Issue 110 (`110-...md`, the `aria-label` bullet).

### S8. Fixture follow-through

- **Sentence to add:** "Extend Issue 110's shared fixture builder in `src/tests/lib/features/tasks/` with `text` and `metadata` overrides if it lacks them. Any 110 label assertion whose fixture text carries signifiers now reads the display text: update it on purpose, do not loosen it."
- **Evidence:** Issue 110 requires that fixture to carry "realistic metadata (due, scheduled, priority, recurrence, tags)" (`110-...md`, "Row test hooks and one fixture"), and its labels use the raw text "until Issue 109".

### S9. E2E asserts rendered content

- **Sentence to change:** "A viewport test at 500 px width with a `📅` task asserts the chip's top is at or below the text's bottom."
- **Replacement:** "A viewport test at 500 px width, with `test.use({ clockTime: '2026-11-05T12:00:00' })`, writes a `- [ ] Pay rent 📅 2026-11-03` note in the test. It asserts that `[data-task-chip="due"]` reads `Nov 3`, then that the chip's top is at or below the bottom of `[data-task-text]`."
- **Evidence:** the e2e fixture has an opt-in page clock (`e2e/fixtures/test-vault.ts:162-176`). CLAUDE.md rule 8 asks e2e tests to assert on rendered content, not only on layout boxes.

### S10. `taskChips` options default

- **Fix:** state the signature: `taskChips(metadata: TaskMetadata, today: string, options: { tags: boolean } = { tags: true })`. Today the reader has to infer the default from "`tags: false` on the raw-text path".

### S11. Contrast wording

- **Problem:** "about 3.4:1 on the default card" is correct for the default dark theme. I computed 3.43:1 for `--destructive` `oklch(0.628 0.225 25)` on `#2a2e3d`, and 3.94:1 on the light theme's white. After Issue 108 the surface is `bg-editor-bg`, not the card (`108-...md`, "The view's root drops `bg-card`"), though the values are equal (`src/app.css:155`, `:187`, `:216`, `:251`).
- **Fix:** say "on the editor background". The decision itself does not change.

### S12. Invalid dates (low)

- **Problem:** Rust accepts any `\d{4}-\d{2}-\d{2}` (`parsing.rs:1495-1500`), and dayjs rolls an invalid date such as `2026-02-30` forward to Mar 2 (`node_modules/dayjs/esm/index.js:85-95`, which calls the native `Date` constructor). The chip label then disagrees with its title.
- **Fix:** add one line, either accepting this or showing the raw string when the formatted date does not round-trip.

## Dossier errors found

1. **E2E clock (dossier section 2 AC4).** The dossier says "Do not assert the label text: the e2e clock is real". That is wrong: the fixture has an opt-in `clockTime` option that installs a page clock (`e2e/fixtures/test-vault.ts:162-176`).
2. **Raw-path example (dossier AC2, last table row).** For `Call [[Book#Ch]] 🆔 td-123 ^abc123` the dossier gives the Rust description `Call [[Book Ch]] ^abc123`. `TASK_TAG_RE` removes `#Ch`, so the description is `Call [[Book]] ^abc123` (`parsing.rs:1579-1580`, `:1873-1874`).
3. **Chip size (dossier A3).** "The ticket wins" over `text-label` misses that `src/app.css:80-81` names chips and badges as `text-label`. This is a convention conflict, not a ticket-over-synthesis call.
4. **Container width (dossier risk 2).** The dossier says a 500 px viewport might still give "a container wider than 560 (a collapsed sidebar)". That cannot happen: the container cannot be wider than the viewport. The precondition assertion is harmless but rests on a wrong reason.
5. **Fake timers (dossier risk 10 and AC3).** The dossier marks fake `Date` with `vi.waitFor` as unverified. It is safe: vitest 5.1.0's `waitFor` takes `setTimeout` and `setInterval` from `getSafeTimers()` (`node_modules/vitest/dist/chunks/index.CZzC1gGg.js:6974`), and `toFake: ['Date']` leaves those timers real. Precedent: `src/tests/lib/core/settings/settings.service.test.ts:374`.
6. **dayjs parsing (dossier section 1.3).** The dossier marks local-time parsing of date-only strings as INFERRED. It is VERIFIED: `REGEX_PARSE` is followed by `new Date(y, m, d)` in local time (`node_modules/dayjs/esm/index.js:85-95`, dayjs 1.11.23).
7. **Missed: CRLF raw text.** On the raw path the text keeps a trailing `\r` (`parsing.rs:1427`, `:1696`), which breaks the `$`-anchored strips (S2).
8. **Missed: Issue 241 dependency.** Issue 241 depends on 109's stripping as a reusable piece (S3).
9. **Missed: vacuous guards.** The dossier lists the Book and toggle tests as "green today, regression guards" but does not say that, with `tags: []` or with description equal to text, they also stay green under a broken implementation (M4).
10. **Missed partial corroboration (finding 1).** The dossier's "nothing is pinned" is right for Rust tests, but Issue 075's ticket text records today's Book output, which backs up the hand-traced value.
