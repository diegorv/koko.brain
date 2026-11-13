# Dossier: Issue 109, task rows show clean text with date, priority, recurrence and tag chips

Ticket: `.scratch/open-itens/issues/109-row-chips.md` (Blocked by 236). Read at HEAD `d2304ac9e` (main). Nothing was run; red/green claims come from reading code. Tabs for indentation everywhere (CLAUDE.md).

Legend: VERIFIED = read in code at the cited `path:line` at HEAD. INFERRED = derived from a predecessor ticket or dossier (108, 242, 110, 234, 236) that has not landed at HEAD. Re-read the landed files before editing (step 0).

---

## 0. Headline findings (read first)

1. **The ticket's "pinned Rust outputs" do not exist.** The AC says to copy `taskDisplayText` descriptions "from the pinned Rust outputs of `parse_task_metadata` (the parser tests in `src-tauri/src/vault/parsing.rs`)". VERIFIED: the metadata tests (`parsing.rs:3095-3255`) cover only simple inputs. `grep` for `Chapter`, `^abc`, `example.com/a#b`, `Book#` in `parsing.rs` and `src-tauri/tests` finds nothing relevant. None of the six strings in section 2 AC2 is pinned. Hand-derived values below (from `TASK_TAG_RE` `parsing.rs:1579-1580`, `ID_RE` `:1552-1554`, `DATE_REGEXES` `:1509`, `MULTI_SPACE_RE` `:1583`, and the pipeline `:1776-1878`) are INFERENCE, not executed. Pick one and say so in the delivery: (a) derive and comment the provenance in the test, or (b) pin the same six inputs in a Rust test in `parsing.rs` (a Rust edit, no DTO change; it turns the gate into "Both": `cargo test` too, throttled to one cargo build). Most likely intended: (b) is what "pinned" means, but the ticket gate says frontend only. Ask or choose (a) plus a comment; do not silently write unverified strings as if they were copied.
2. **The raw-text fallback has a hole the ticket does not name.** `parseTaskTextSegments` (`tasks.logic.ts:130-161`) only makes a `link` segment for an absolute, safe URL (`:144`); any other `[label](url)` stays plain text (`:147`). So `[doc](#anchor)` and `[doc](notes/a.md#sec)` are not "a link whose url contains #", and not a bare URL (`/\S+:\/\/\S*#/` needs `://`). Rust still strips their `#anchor` (`TASK_TAG_RE` reads a `#` anywhere, `parsing.rs:1873`), leaving `[doc]()` / `[doc](notes/a.md)` in the description and a false tag chip. Same for `#` glued to a word (`page#section`) and `#` inside inline code. Ticket-literal behavior ships these broken. Suggested single broader test (optional, an ambiguity to confirm): fall back to raw when the raw text matches `/\S#[A-Za-z0-9_]/` (any `#word` glued to a non-space), in addition to the ticket's checks. A real tag starts after whitespace or line start, so it never trips this. Without it, at least add the relative-link case to the ticket's list.
3. **The view cannot know the "raw-text path" from `taskDisplayText(task): string` alone**, yet it must pass `tags: false` to `taskChips` on that path. The ticket names no second function. Export a small pure predicate (suggest `usesRawTaskText(task): boolean`) that `taskDisplayText` also calls. Section 4 A1.
4. **No pinned Rust output exists for the `^abc123` block id**: the Rust parser has no block-id handling at all (grep `block id|BLOCK_ID|\^abc` in `parsing.rs` is empty). VERIFIED the ticket's statement "it does not remove a trailing block id".
5. **The Todoist anchor never reaches the description on the default path.** `ID_RE` is `🆔\s*(\S+)` (`parsing.rs:1552-1554`) and runs in `parse_task_metadata` (`:1825-1832`), so `🆔 td-123` is removed from the description and lands in `metadata.id`. The "trailing Todoist anchor" strip matters only on the raw-text path (and as a harmless guard on the description path). The ticket's AC "the anchor and block id removed from `Call Ana 🆔 td-123 ^abc123` on both paths" is satisfiable, but on the description path the input to feed is Rust's output `Call Ana ^abc123`, not the raw line.
6. **A recurrence swallows a trailing block id from the description**: `RECURRENCE_RE` is `🔁\s*(.+?)(?:\s*(?:alts)|$)` (`:1532-1548`), so `🔁 every week ^abc123` gives `recurrence.text = "every week ^abc123"` and the whole span, `^abc123` included, is removed from the text (`:1813-1822`). The ticket already handles the chip side (strip ` ^id`). Consequence: such a task's description has no block id at all.
7. **Closed tasks show the red overdue icon** unless the view suppresses it: `taskChips(metadata, today, { tags })` takes no status (ticket signature), and `overdue` is purely `dueDate < today`. A done or cancelled task with a past due date (visible when the closed filter is off, Issues 110/111) is struck through next to a red calendar icon. Ticket-literal; flag it to the owner as a follow-up rather than add a parameter now (section 4 A9).
8. **Overdue label contrast claim ("about 3.4:1") is not verified here.** `--destructive` is `oklch(0.628 0.225 25)` in both themes (`src/app.css:167`, `:228`). Not computed; the ticket decision (icon tone only) does not depend on it.
9. **No new feature-pair or layer edge.** 109 imports only `#lib/utils/date.js` into `tasks.logic.ts`, and `@lucide/svelte/icons/calendar` into the view. `feature-cycle-baseline.json` needs no change (110 adds `event-calendar -> tasks`, 236 adds `tasks -> file-icons`, INFERRED).

---

## 1. Code map

### 1.1 Files 109 edits

| File | HEAD location | State after predecessors (INFERRED) | 109 change |
|---|---|---|---|
| `src/lib/features/tasks/tasks.logic.ts` | 161 lines; imports `isSafeUrl` and types `:1-2`; `parseTaskTextSegments` `:130-161`; `TaskTextSegment` `:117-120` | 108 added `describeTaskRule`, `explainEmptyTasks`; 242 `parseSectionTags`; 110 swapped `checked` for `isTaskOpen` (imports `./task-status.logic`) | Add `TaskChip` type, `taskDisplayText`, `taskChips`, the raw-path predicate, small private regex constants. New imports: `formatDate` from `#lib/utils/date.js` (group 2) and `TaskMetadata` type from `./task-metadata.types`. Keep it pure (`pure-logic.test.ts` walks the import graph; `utils/date.ts` imports only dayjs, so it is allowed; `.logic.ts` files already do this, e.g. `file-history.logic.ts`). |
| `src/lib/features/tasks/TasksView.svelte` | root `<div class="flex h-full flex-col bg-card">` `:90`; row `:172-214`; circle `:177-187` (aria-label `:179`); text span `:190-213` (`parseTaskTextSegments(task.text)` `:194`); imports `:2-16` | root without `bg-card` (108); circle/text hooks `data-task-toggle`, `data-task-status`, `data-task-text`, glyph, `aria-label` with raw `task.text` (110); header, 24px hit area, local `formatDate` deleted and `formatDate` imported from `#lib/utils/date.js` (236) | Root gets `@container`. Row text renders from `taskDisplayText`. Add a chips container after the text. Circle `aria-label` uses `taskDisplayText`. Compute `today`. New imports: `Calendar` icon, `formatNow` (merge into 236's `#lib/utils/date.js` import), `taskChips`, `taskDisplayText`, raw-path predicate. |
| `src/tests/lib/features/tasks/tasks.logic.test.ts` | 268 lines; import block `:1-8`; `makeTask` `:12-20` (description = text) | gains suites from 108/242/110 | New `describe('taskChips')`, `describe('taskDisplayText')`. |
| `src/tests/lib/features/tasks/TasksView.test.ts` | `group()` `:34-48`; two describes `:54`, `:191` | 110 replaced `group()` with a shared fixture in `src/tests/lib/features/tasks/` (proposed name `tasks.fixture.ts`, dossier-110 section 2) and moved selectors to `data-task-toggle` / `data-task-text` | New describe with fake Date (chips, clean text, raw fallback, toggle sends raw text). Needs the fixture to accept `text` and `metadata` overrides (see step 0). |
| `e2e/specs/tasks-view.spec.ts` | 137 lines; Links test `:89-112` shows the in-test note pattern | 242 added a two-tags test; 110 removed `waitForTimeout` | One narrow-viewport test. |

### 1.2 Things 109 does NOT touch (verified)

- Rust: `parse_task_metadata` (`parsing.rs:1776`), `TaskMetadata` (`vault/task.rs`, ts-rs output `src/lib/contracts/generated/TaskMetadata.ts`). The parser defect (tags inside links) is Issue 075 (`.scratch/open-itens/issues/075-task-tags-follow-note-tag-rule.md`); the fallback must stay harmless after it.
- IPC: `tasks.service.ts` `fromV2` already copies every metadata field (`tasks.service.ts:31-45`), so `dueDate`, `scheduledDate`, `startDate`, `priority`, `recurrence`, `tags` reach the view. No service change.
- `toggleTask` keeps sending raw `task.text` as `expectedText` and `task.status` as `expectedStatus` (`tasks.service.ts:150-152`), which is what the Rust guard compares. 109 must not touch this. No store change; the `today` value lives in the view (no new store getter, so no ADR-0034 test obligation).
- `handleTextClick` (`TasksView.svelte:65-69`) and the wikilink/link rendering keep working on the new text source.
- Calendar: `event-calendar-tasks.logic.ts:59` already uses `task.metadata.description || task.text` for its own chips. Not touched.

### 1.3 Value sources and helpers

- `formatDate(date, format)` = `dayjs(date).format(format)` (`src/lib/utils/date.ts:42-44`); `formatNow(format)` (`:15-17`). dayjs parses a date-only string as local time, so `formatDate('2026-11-03', 'MMM D')` gives `Nov 3` in any timezone (INFERRED from dayjs behavior; confirm in the red run).
- Icon: `@lucide/svelte/icons/calendar` exists (`node_modules/@lucide/svelte/dist/icons/calendar.svelte`). The Icon component appends the `class` prop to the svg class list (`node_modules/@lucide/svelte/dist/Icon.svelte`), so `svg.classList.contains('text-destructive')` works in jsdom.
- Container query syntax in use: `EventBlock.svelte:75` (`@container`), `:89` (`@max-[84px]:px-1`), `RailNoteList.svelte:717,725` (`@max-[12rem]:hidden`). Tailwind 4.3.4 (`package.json`).
- Tokens: `--color-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-destructive` (`src/app.css:10,18,19,22`). Pill precedent: `TrashSection.svelte:68` (`rounded-full bg-muted px-2 py-0.5 text-label text-muted-foreground`).
- The e2e mock's task parser fills only `description` (date stripped), `dueDate`, `tags: []` (`e2e/mocks/vault-index.ts:179-189`).
- `pane-toolbar.test.ts` is unaffected (109 does not touch the toolbar).
- `container-type: inline-size` (what `@container` sets) applies layout containment, so fixed-position descendants anchor to the root. 109 has no popups. Later Issues (239, 241, 111 dropdown menus) are safe because `dropdown-menu-content.svelte:18` wraps its content in a Portal. VERIFIED for dropdown-menu; popover not checked.

---

## 2. Acceptance criteria to tests

Gate: frontend only, `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` (the row markup the spec reads changes). Serial, one heavy job at a time (owner's memory policy).

### AC1. `taskChips` (tasks.logic.test.ts)

Shape: pure calls with `today = '2026-11-05'`, `toEqual` on the whole array. Cases:
- due `2026-11-03` -> `[{ kind: 'due', label: 'Nov 3', title: 'Overdue, due 2026-11-03', overdue: true }]`.
- due `2026-11-05` and `2026-11-20` -> label `Nov 5` / `Nov 20`, `title: 'Due 2026-11-05'`, **no `overdue` key** (the type is `overdue?`; `toEqual` treats a missing key and `undefined` alike but not `false`, so return nothing, not `false`).
- due `2027-01-15` -> label `Jan 15, 2027`; a past-year due (`2025-12-30`, overdue) -> `Dec 30, 2025`.
- scheduled `2026-11-03` -> `Scheduled Nov 3`; start -> `Starts Nov 3`; both with the year rule (`Scheduled Jan 15, 2027`).
- each priority via `it.each`: `highest|high|medium|low|lowest` label equals the word; `none` and absent -> no priority chip.
- recurrence `{ text: 'every week ^abc123' }` -> label `every week`; `every week` unchanged; recurrence with a hyphenated id `^abc-1` stripped.
- two tags `['work','home']` -> `#work`, `#home` in that order; `{ tags: false }` -> none.
- order with everything set: due, scheduled, start, priority, recurrence, tags.
- only `{ description: 'x', tags: [] }` -> `[]`.

Red before the change: yes, but as "export missing" (`taskChips is not a function`). Acceptable for pure TDD (vitest does not type-check). The overdue/year/order cases become meaningful only after the function exists, so also run them against a deliberately naive first draft if you want a real assertion-red.

### AC2. `taskDisplayText` (tasks.logic.test.ts)

Inputs (text -> Rust metadata.description), all INFERRED, see finding 1:

| raw `text` | Rust `description` (derived) | expected `taskDisplayText` |
|---|---|---|
| `Send invoice 📅 2026-11-03 ^abc123` | `Send invoice ^abc123` | `Send invoice` |
| `read [[Book#Chapter 2]]` | `read [[Book 2]]` | raw `read [[Book#Chapter 2]]` (wikilink heading) |
| `see [doc](https://example.com/a#b)` | `see [doc](https://example.com/a)` | raw (link url has `#`) |
| `https://example.com/a#b` | `https://example.com/a` | raw (bare URL with `#`) |
| `#todo` | `` (empty) | raw `#todo` |
| `Call Ana 🆔 td-123 ^abc123` | `Call Ana ^abc123` | `Call Ana` |
| raw path with anchor and block id, for example text `Call [[Book#Ch]] 🆔 td-123 ^abc123` | any (`Call [[Book Ch]] ^abc123`) | `Call [[Book#Ch]]` (block id removed first, then the anchor) |

Also: a plain text with no signifier returns the description unchanged; `^` inside a word is not stripped (`a^b`); the block id strip is end-anchored (`x ^abc def` stays).
Also pin the predicate (raw vs description) on the same inputs.

Order matters (ticket): block id first, then anchor, because a synced line can end `🆔 td-x ^abc`.

Red before: export missing. The raw-path cases are the ones a naive "always use description" implementation fails (that is the real red for the fallback).

### AC3. `TasksView.test.ts` chips and clean text (jsdom, real stores)

Shape, with the fixture from 110 (builder must accept `text` and `metadata` overrides, step 0):
- `vi.useFakeTimers({ toFake: ['Date'] })` and `vi.setSystemTime(new Date('2026-11-05T12:00:00'))` in `beforeEach`, `vi.useRealTimers()` in `afterEach`. Precedent: `settings.service.test.ts:374` uses `toFake: ['Date']`. `vi.waitFor` takes its timers from real globals, but confirm in the first run that a faked `Date` does not stall it (INFERRED OK, not run).
- Task text `Send invoice 📅 2026-11-03 ⏫ #work`, metadata `{ description: 'Send invoice', dueDate: '2026-11-03', priority: 'high', tags: ['work'] }` (derived from the pipeline `parsing.rs:1781-1875`; INFERRED). Assert: the text hook's `textContent.trim()` is `Send invoice`; chips found by hook, not position: due chip label `Nov 3`, its `svg` has class `text-destructive`, its label element does not (it has `text-foreground`); a priority chip `high`; a tag chip `#work`; the row's `textContent` contains neither `📅` nor `⏫`. Chip order in the DOM: due, priority, tag.
- Raw fallback: text `read [[Book#Chapter 2]]`, metadata `{ description: 'read [[Book 2]]', tags: ['Chapter'] }`: the wikilink button reads `Book#Chapter 2`, no `#Chapter` chip, and `onOpenWikilink` is called with `Book` when clicked (the existing wikilink test pattern, `TasksView.test.ts:176-188`).
- Toggle regression: with the Send-invoice task, click the circle; `toggle_task_status` args contain `expectedText: 'Send invoice 📅 2026-11-03 ⏫ #work'` (raw), `expectedStatus: 'todo'`. Plus circle `aria-label` ends with display text, not raw (`Mark task as done: Send invoice (todo)`, 110 format).
- A task with no metadata fields renders no chips container (no empty wrapper).
- A dated-in-another-year task shows the year in the chip.

Red before: the Send-invoice test fails today (raw text with emoji renders; no chips). The raw-fallback test and the toggle-sends-raw test are **green today** and green after: they are regression guards, and the fallback one is only red against a naive implementation. Say so in the delivery; do not claim failing-first for them.

### AC4. e2e (narrow pane)

Add to `e2e/specs/tasks-view.spec.ts`: write a note in-test like the Links test (`:90-96`): `- [ ] Pay rent 📅 2026-11-03` via `__e2e.fs.writeFile` and `vaultIndex.update`; `page.setViewportSize({ width: 500, height: 800 })`; open Tasks; clear the section tag as the other tests do; find the row with `hasText: 'Pay rent'`; take bounding boxes of `[data-task-text]` and `[data-task-chip="due"]` (hooks introduced here); assert `chip.y >= text.y + text.height - 1`. Do not assert the label text: the e2e clock is real, so `Nov 3` vs `Nov 3, 2026` depends on the current year. Optional second assertion at 1400 wide: chip top is above the text bottom (trails on the same line). The wikilink/URL e2e test keeps passing: its text has no `#`, so `taskDisplayText` returns the mock's `description`, which equals the text (`vault-index.ts:186`).

Fails today: no `[data-task-chip]` exists. The e2e run is also the only place the container-query behavior is exercised (jsdom does not evaluate it).

### Existing tests that change

- `TasksView.test.ts` 110-era tests that assert the circle `aria-label` with the raw text: if the fixture text carries signifiers while its description does not, the label changes to the display text. Grep `Mark task as` in `src/tests/lib/features/tasks/` and `e2e/` after 110 lands and fix any such assertion. With description == text (the current helper, `TasksView.test.ts:45`) nothing changes.
- `tasks.logic.test.ts` and the Todoist describe (`:226-233`, `[data-task-row] a` must be null) keep passing: chips are not anchors.

---

## 3. Implementation plan (one context window)

0. **Re-read after 108, 242, 110, 234, 236 landed**: `TasksView.svelte` (row block, imports), the shared fixture file, `TasksView.test.ts`, `e2e/specs/tasks-view.spec.ts`, `tasks.logic.ts` exports. Confirm the exact hook names (`data-task-toggle`, `data-task-status`, `data-task-text`), whether the fixture builder accepts `text` and `metadata` overrides (extend it if not; keep `checked` derived from `status`), and how 236 imports `formatDate`. Decide finding 1 (a vs b) and finding 2/3 API with the owner or state the choice.
1. **Red, logic**: add `taskChips` and `taskDisplayText` suites to `tasks.logic.test.ts`. Run `pnpm vitest run src/tests/lib/features/tasks/tasks.logic.test.ts` and confirm red for the reason in section 2.
2. **Green, logic** in `tasks.logic.ts`:
   - `export interface TaskChip { kind: 'due' | 'scheduled' | 'start' | 'priority' | 'recurrence' | 'tag'; label: string; title?: string; overdue?: boolean }` with JSDoc on every field.
   - Private constants: `BLOCK_ID_RE = / \^[A-Za-z0-9-]+$/`, `TODOIST_ANCHOR_RE = / \u{1F194}️? td-\S+$/u` (consider `\s*` between emoji and `td-` to match Rust's `\s*`, A6), `URL_HASH_RE = /\S+:\/\/\S*#/`, recurrence id `/\s+\^[A-Za-z0-9-]+$/`.
   - Predicate (suggested `usesRawTaskText(task)`): true when `parseTaskTextSegments(task.text)` has a wikilink with `heading` or a link whose `url` includes `#`, or `URL_HASH_RE` matches `task.text`, or `metadata.description` is empty (plus the finding 2 broadening if accepted).
   - `taskDisplayText(task)`: base = predicate ? `task.text` : `task.metadata.description`; then strip the block id, then the anchor; return the result. Take `Pick<TaskItem, 'text' | 'metadata'>` so Issue 111's `TaskRow` passes unchanged.
   - `taskChips(metadata, today, options = { tags: true })` returning the array in ticket order. Year rule: compare the first four characters of the date and `today`; `formatDate(date, sameYear ? 'MMM D' : 'MMM D, YYYY')`. Due: `title = overdue ? 'Overdue, due ' + d : 'Due ' + d`, `overdue = d < today` (string compare), set the key only when true.
   Run the file green.
3. **Red, view**: add the AC3 tests with the fake Date. Run `pnpm vitest run src/tests/lib/features/tasks/TasksView.test.ts`; confirm only the Send-invoice test is red (the guards are green).
4. **Green, view** (`TasksView.svelte`):
   1. Root class `@container flex h-full flex-col` (108 already dropped `bg-card`).
   2. `let today = $derived.by(() => { void tasksStore.fileTaskGroups; return formatNow('YYYY-MM-DD'); });` so it is re-read on every refetch (A3). Do not put it in the store (111 moves it into `visibleRows`).
   3. In the row: `{@const raw = usesRawTaskText(task)}`, `{@const text = taskDisplayText(task)}`, `{@const chips = taskChips(task.metadata, today, { tags: !raw })}`.
   4. Circle `aria-label` (110's template) uses `text`. Keep `title`, hooks.
   5. Wrap text and chips: `<div class="flex min-w-0 flex-1 items-baseline gap-2 @max-[560px]:flex-col @max-[560px]:items-start @max-[560px]:gap-0.5">`. The text span keeps `data-task-text`, `min-w-0 flex-1 break-words text-sm cursor-pointer`, the closed styling from 110, and renders `parseTaskTextSegments(text)`. Use `div`s, not `span`, for the wrappers so any leftover `[data-task-row] span` selector still lands on the text span.
   6. Chips: `{#if chips.length}<div data-task-chips class="flex shrink-0 flex-wrap items-center gap-1">` and per chip `<span data-task-chip={chip.kind} data-overdue={chip.overdue ? '' : undefined} title={chip.title} class="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">`. For `due`, first a `<Calendar class="size-3 {chip.overdue ? 'text-destructive' : ''}" />`, and the label in `<span class={chip.overdue ? 'text-foreground' : ''}>`. Only theme tokens (236's palette scan covers this file).
   7. Keep the keyed each (`task.lineNumber`) untouched (108's focus preservation depends on it).
   Run the view tests green, then `src/tests/lib/pane-toolbar.test.ts` and the palette scan from 236.
5. **e2e**: add the narrow test; run `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts` (the script takes the spec path, as dossier-242 assumes; check `scripts/e2e.sh` if unsure). Never start `pnpm dev` by hand.
6. **Gate**: `pnpm check`, then `pnpm vitest run`. `git diff --cached --stat`; one `feat:` commit in the full COMMITS.md format with the trailer from the session; pre-commit adversarial review per the owner's memory policy. In the commit and report, state: the Rust pins are derived not copied (finding 1), the narrow layout was checked only in e2e, and the closed-task overdue icon (finding 7).

---

## 4. Ambiguities and the most likely reading

- A1. **How the view learns the raw path.** Ticket: pure `taskDisplayText(task)` returns a string, and `taskChips` takes `tags: false` on the raw path. Likely: export a boolean predicate that `taskDisplayText` also uses. Alternative (`taskDisplayParts` returning `{ text, raw }`) is equivalent; whichever, the Issue 111/239 callers pass a `TaskRow`, so keep parameters structural.
- A2. **Where `today` is read.** Ticket: "when the rows are rebuilt", which does not exist until 111. Likely: a view `$derived` that depends on `tasksStore.fileTaskGroups` and calls `formatNow('YYYY-MM-DD')`. It then updates on the next refetch and not on a filter change; accepted by the ticket.
- A3. **Chip look.** Pill or plain text, border, background are not specified: only `text-xs`, label `text-muted-foreground`, calendar icon on due, overdue tone. Likely `rounded-full bg-muted px-1.5 py-0.5` (precedent `TrashSection.svelte:68`). Synthesis line 132 mentions `text-label` (11px, `app.css:89`) but the ticket says `text-xs`; the ticket wins.
- A4. **Wide layout: trail or right-align.** "wrap onto one meta line under the text instead of trailing it". Likely: text `flex-1`, chips after it at the row's right edge (right-aligned). Directly-after-the-text is the other reading. Neither is tested; choose and keep the e2e assertion generic.
- A5. **Raw-fallback breadth.** Finding 2. Likely intended: only what the ticket lists. Recommended: also `[x](#anchor)`/relative links with `#` and glued `#`.
- A6. **Anchor regex whitespace.** Ticket regex ` 🆔️? td-\S+` needs exactly one space; Rust's `ID_RE` accepts `\s*`, even none. Likely: use the ticket regex, optionally widened to `\s*`. Trailing-anchored (`$`) per "trailing".
- A7. **Empty after stripping.** The ticket tests emptiness on `metadata.description` before stripping. A description that is only a block id (`- [ ] #todo ^abc` gives `^abc`) has no leading space, so ` \^...$` does not match and the row shows `^abc`. Likely intended: ignore (rare). Alternative: fall back to raw when the stripped result is empty.
- A8. **Invalid dates.** Rust's regex accepts any `\d{4}-\d{2}-\d{2}` (`parsing.rs:1497`); dayjs rolls `2026-13-45` over to a valid date, so the label would be wrong (`Feb 14, 2027`) while the title shows the raw date. Ticket silent. Likely: ignore, or round-trip check and show the raw string. Low likelihood.
- A9. **Overdue on closed tasks.** Finding 7. Likely intended: follow the ticket; the view could skip the tone for closed rows, but that needs the signature to know the status. Raise to the owner.
- A10. **Chip semantics for assistive tech.** The label `Nov 3` carries no "Due"; only `title` says it. Ticket silent. Likely accept. An `aria-label` on the chip would duplicate the title.
- A11. **Help doc.** The ticket lists no doc change. `help/documentation/10-tasks-and-todoist.md:49-91` documents signifiers but not how the view shows them. Likely: no edit; optionally one sentence.
- A12. **False tag chips from `#123`-style text** (`Fix #123` gives description `Fix` and chip `#123`; `color #fff` likewise). This follows the Rust tag rule, so the chip shows what was removed from the text. Issue 075 changes the rule. No action.

---

## 5. Risks

1. **Ticket claim contradicted**: the "pinned Rust outputs" (finding 1). Every other factual claim checked matches the code: metadata reaches the view (`tasks.service.ts:31-45`), Rust strips dates, priority, recurrence, ids and tags (`parsing.rs:1781-1875`), does not strip block ids, and strips `#...` inside links (`TASK_TAG_RE` `parsing.rs:1579-1580`, `replace_all` `:1873`), `formatDate`/`formatNow` exist (`date.ts:15,42`), `EventBlock.svelte` uses `@max-[84px]:` (`:89`), the e2e mock fills only the due date (`vault-index.ts:185-189`).
2. **Container query only provable in a browser.** jsdom ignores `@max-[560px]:`. A unit test that greps class names proves nothing about layout; rely on the e2e box test and a manual look at the pane around 560 px. If the e2e viewport at 500 px still gives a container wider than 560 (a collapsed sidebar), the assertion fails for the wrong reason: assert the precondition (`container width < 560`) inside the test first.
3. **Root `@container` effects.** `container-type: inline-size` gives layout containment (fixed-position descendants anchor to the root) and prevents the root's width from depending on content. The root is a block child of `div.relative.flex-1.min-h-0` (`EditorView.svelte:71`), so width is definite. No popups in 109; later menus are portaled (finding 9 context).
4. **Text click and selection**: moving the text span into a wrapper must keep `handleTextClick` on the span (`TasksView.svelte:65-69,192`) and not make chips part of the clickable text; chips have no click handler in 109 (111/239 filter by tag in menus, not chips).
5. **Selectors in other tests**: the Todoist describe asserts no `a` inside the row (`TasksView.test.ts:232`); chips must not be anchors or buttons. `[data-task-row] button` (first button, `:133`) stays the circle only if chips are not buttons (110 moves to hooks anyway).
6. **Aria-label drift with 110 tests** (section 2, existing tests changed).
7. **Palette scan (236) covers `tasks.logic.ts`**: strings like chip titles are fine; do not add Tailwind class names with palette shades anywhere in `src/lib/features/tasks/`.
8. **Layer and cycle tests**: `layer-rules.test.ts`, `feature-cycle.test.ts`, `pure-logic.test.ts` unaffected (finding 9). ADR-0034: no store getter added. No `$effect`/`untrack` added, so PATTERNS.md does not apply. Indexing/watcher rules (`docs/agents/indexing-watcher-rules.md`) are untouched: no save, index, watcher or path change.
9. **Performance**: `taskChips` and `parseTaskTextSegments` run per row per render (no virtualization, A9 of the PRD caps rows at 50 per group in Issue 240). Cheap string work; no memoization needed.
10. **Fake Date plus `vi.waitFor`** (section 2 AC3): unverified; if it stalls, fake only inside the assertion block or set the system time after mount.
11. **Todoist-synced lines** contain `🆔 td-…` and metadata: they now render clean text with chips (an improvement), but a task whose Todoist label is `#to-list`-style shows a `#to-list` chip next to the section it sits in. Cosmetic.
12. **Not verified**: nothing was executed; derived Rust strings (AC2), dayjs local-date parsing, lucide class merge in jsdom (read, not run), real contrast numbers, the narrow layout.

---

## 6. Size

**M** (agrees with the ticket). About 70 lines of logic, 40 lines of view, 200 to 250 lines of tests across two files, 25 lines of e2e. Fits one context window if the implementer reads only: `TasksView.svelte`, `tasks.logic.ts`, the shared fixture, `TasksView.test.ts`, the tasks e2e spec, and `parsing.rs:1776-1878` for the strings. The slow parts are the e2e run (serial) and, under option (b) of finding 1, one throttled `cargo test`. Dependencies: needs 110 (hooks, fixture, label format) and 236 (palette scan, `formatDate` import); 111, 238, 239 and 112 call `taskChips`/`taskDisplayText` with rows, so keep both structural.
