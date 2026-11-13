# Dossier: Issue 236, a Tasks group header reads like a note

Ticket: `.scratch/open-itens/issues/236-tasks-group-header-reads-like-a-note.md`. HEAD at reading: `d2304ac9e` (main). None of 108, 242, 110 or 234 has landed at HEAD, so every "after predecessor" statement is INFERRED from ticket text. VERIFIED means read in code at the cited line. Indentation in code is tabs (CLAUDE.md).

Chain position: 108 -> 242 -> 110 -> 234 -> **236** -> 109 -> 111. Existing dossiers for 108, 110 and 242 sit next to this file; 234 has none, so section 1.3 derives its edits from the ticket.

---

## 0. Headline findings (read first)

1. **The ticket's example classes `p-1 -m-1` are wrong for this button as written.** The circle button today is `shrink-0 mt-0.5 cursor-pointer` (`TasksView.svelte:178`) with a 16 px icon (`size-4`, `:183,185`). Tailwind 4.3.4 orders `margin` before `margin-top` (`node_modules/tailwindcss/dist/lib.js` property list: `"margin", ..., "margin-top", "margin-right", "margin-bottom", "margin-left"`), so with `p-1 -m-1 mt-0.5` the longhand `mt-0.5` wins on top. Result: icon top at 2 + 4 = 6 px (was 2), flex-child margin box 2 + 24 - 4 = 22 px tall (was 18), so the row can grow. Dropping `mt-0.5` instead moves the icon 2 px up relative to the 20 px text line. The only combination that keeps icon position and row box identical is `p-1 -mx-1 -mb-1 -mt-0.5` (top: -2 + 4 = 2; box: -2 + 24 - 4 = 18; horizontal margin box 24 - 8 = 16). Inference from the Tailwind ordering list and arithmetic; jsdom cannot confirm it (no Tailwind computation, same limit `src/tests/lib/pane-toolbar.test.ts:1-9` states). Use the explicit classes, say so in the delivery. The ticket says "for example", so this is allowed.
2. **"Count M from the unfiltered store" needs a lookup by path.** `filterCompleted` returns copies (`{ ...group, tasks: visibleTasks }`, `tasks.logic.ts:65`) with fewer tasks, so `group.tasks.length` in the view is already filtered when hide-closed is on. `filterByDate` returns the original objects (`:87`), but the view cannot rely on identity. N and M must be computed from `tasksStore.fileTaskGroups` by `filePath`.
3. **The merge-in is real: `text-purple-400` at `TasksView.svelte:154` is the only palette class in `src/lib/features/tasks/`.** Verified by a regex over the directory (one hit). The "`text-green-400`" that the 198 text still mentions no longer exists (198's own 2026-11-12 comment says so).
4. **No cycle risk from `tasks -> file-icons`.** `src/lib/features/file-icons/*.{ts,svelte}` imports no other feature (grep for `from '#lib/features` in that folder: empty). Pair sorts between `tags -> search` (`feature-cycle-baseline.json:31`) and `type-definitions -> collection` (`:32`), because `featurePairs` returns `[...out].sort()` (`scripts/import-graph.mjs:288`). If 110 landed, `event-calendar -> tasks` is also in the list, before `event-calendar -> type-definitions`.
5. **`feature-cycle.test.ts` cannot be red-first.** It rewrites the baseline at module load and passes (`feature-cycle.test.ts:36-39`). Forgetting to commit the JSON leaves a dirty tree, not a red test. Check `git diff --stat` includes it.
6. **Two ACs have no test row in the ticket:** the toggle circle's hit area/focus ring, and the root-note-no-subtitle case on its own (it passes today). Section 2 adds both.

---

## 1. Code map

### 1.1 Files 236 edits (HEAD lines; "after" = inferred state when 236 starts)

| File | HEAD | What changes in 236 |
|---|---|---|
| `src/lib/features/tasks/TasksView.svelte` | imports `:2-16`; local `formatDate` `:80-87` (guard `if (!timestamp) return ''` `:81`, locale string with year); group header `:151-165` (`<button class="text-sm font-medium text-purple-400 hover:underline cursor-pointer">{group.fileName}</button>` `:153-158`, `({formatDate(group.modifiedAt)})` `:159-161`, `({group.tasks.length})` `:162-164`); circle button `:177-187` (class `:178`); count line `:144-146` | New header markup, delete `formatDate`, circle button classes, new imports. Do not touch the count line (ticket: it stays in the body). |
| `src/lib/features/tasks/tasks.logic.ts` | 161 lines; `computeTaskStats` `:91-113`; imports `:1-2` | Add pure helpers (proposed, 1.2). After 110 it already imports `isTaskOpen` from `./task-status.logic` (INFERRED). |
| `src/tests/lib/architecture/feature-cycle-baseline.json` | `featurePairs` `:3-34` | gains `"tasks -> file-icons"`; committed. |
| `src/tests/lib/features/tasks/TasksView.test.ts` | local `group()` `:34-48` (one task per group); `mountView` `:73-90`; first describe `:54`, second `:191` (opens vault `/vault` `:199-200`, closes `:210`) | new describe for the header. After 110 the local builder is replaced by the shared fixture (name not fixed by the ticket; 110's dossier proposes `tasks.fixture.ts`). Read the landed file first. |
| `src/tests/lib/features/tasks/tasks.logic.test.ts` | 268 lines, local `makeTask` `:12-20` | tests for the new helpers. |
| NEW `src/tests/lib/features/tasks/tasks-palette.test.ts` (name is my suggestion) | none (`src/tests/lib/architecture/` has no `palette-classes.test.ts`, verified by `ls`) | source scan guard. Issue 198 later adds the repo-wide one. |
| `help/documentation/10-tasks-and-todoist.md` | `:113` "Click a file name - opens that file" | optional one-word edit ("a note's title"); not an AC. `:15` screenshot shows the old header and is not regenerated (tell the owner). |

### 1.2 Reused code (verified, do not rewrite)

- Tab-bar icon recipe, `src/lib/app/EditorView.svelte:56-63`: `{@const resolved = resolveIconForPath(tab.path)}`; `{#if resolved?.icon}` `<IconRenderer icon={resolved.icon} class="size-3.5 shrink-0" color={resolved.color} />` else `<FileText class="size-3.5 shrink-0 text-muted-foreground" style={iconColorStyle(resolved?.color)} />`. Imports at `:5, :24-26`: `@lucide/svelte/icons/file-text`, `#lib/features/file-icons/icon-resolver.js`, `.../file-icons.logic.js` (`iconColorStyle`), `.../IconRenderer.svelte`.
- `resolveIconForPath(path): ResolvedIcon | undefined` (`file-icons/icon-resolver.ts:64-75`): reads `fileIconsStore.packVersion` (reactive), own frontmatter icon first, then type icon via the app-registered lookup (null in tests, `:21-26`). `ResolvedIcon` has `icon?`, `color?`, `titleColor?` (`:41-48`). The title must ignore `titleColor` (ticket: "never tints the title").
- `IconRenderer.svelte` takes `icon`, `class`, `color` and applies `iconColorCss(color)` itself, as a `<span>` for emoji and an `<svg>` otherwise. So "iconColorStyle in both cases" in the ticket is satisfied by the `color` prop in the icon branch (same effect as EditorView). Only the fallback branch needs `style={iconColorStyle(...)}`.
- `iconColorStyle(color): string | undefined` (`file-icons.logic.ts:231-234`).
- `relativePath(vaultPath, filePath)` (`utils/path.ts:98-103`, returns the absolute path when outside the vault) and `vaultRelativeKey(vaultPath, filePath): string | null` (`:120-123`, null when outside). Use `vaultRelativeKey`: it already encodes "a path that stays absolute has no subtitle". `vaultStore.path` is `string | null` (`vault.store.svelte.ts:60`), so guard null.
- `formatDate(date, format)` (`utils/date.ts:42-44`, dayjs). `utils/*.ts` is pure-allowed, so a `.logic.ts` may import it (`pure-logic.test.ts:60-65` forbids only Tauri, SvelteKit, Svelte packages, stores, components, services).
- `components/ui` focus ring recipe, `button.svelte:7`: `outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50` (also `focus-visible:border-ring`).

### 1.3 What predecessors will already have changed (INFERRED from tickets)

- **108:** store `hasLoaded`; `describeTaskRule`, `explainEmptyTasks`; root drops `bg-card`; toolbar `Loader2` status; rule sentence and empty state in the content branch; `aria-label="Section tag"`. Header block untouched.
- **242:** `parseSectionTags`, `sectionTags` IPC arg, placeholder `#tag #tag`. Untouched header.
- **110:** `isTaskOpen`, `statusGlyph`, row hooks (`data-task-toggle`, `data-task-status`, `data-task-text`), count line `{stats.pending} open in {stats.fileCount} notes`, hide toggle title "closed", shared test fixture, `event-calendar -> tasks` pair, e2e spec rewrite. The circle button gains `title`/`aria-label`/`data-*` and per-status icons; **its class list at HEAD (`shrink-0 mt-0.5 cursor-pointer`) is the part 236 edits, so re-read the landed line**. Header still has the purple button and brackets.
- **234:** groups sorted by absolute `filePath` (`localeCompare` numeric) in `buildTaskIndex`; `ScrollArea` gets `bind:viewportRef`; scroll restore on mount; debounce flush on destroy; textbox mirrors the store; store `error` field and inline alert; `reset()` clears scroll and error; help doc line 13 says path order. Header untouched. Effect on 236: group order in tests is by path, and `{#each filteredGroups as group (group.filePath)}` (`:149`) keeps its key.
- Not yet existing at 236 time: `hideCompleted` still exists (111 replaces it), so tests use `tasksStore.setHideCompleted(false)`; `taskDisplayText` (109).

---

## 2. Acceptance criteria to tests

Gate: frontend only, `pnpm check` + `pnpm vitest run` (targeted files while developing; one heavy job at a time). No cargo, no e2e needed (no e2e selector depends on the header, see 5.3).

Proposed pure helpers in `tasks.logic.ts` (JSDoc on each, no framework imports):

- `noteFolder(vaultPath: string | null, filePath: string): string`: `''` for null vault, for a root note and for a path outside the vault; else the parent of `vaultRelativeKey(...)` (`Projects/Clients` for `Projects/Clients/ACME.md`).
- `noteTaskCounts(tasks: TaskItem[]): { open: number; total: number }` using `isTaskOpen(task.status)`.
- `formatNoteModified(modifiedAtMs: number, now = Date.now()): string`: `''` for 0, `'MMM D'` when `dayjs(ms).year()` equals the year of `now`, else `'MMM D, YYYY'`.

Component hooks (INFERRED style, matching 110's `data-task-*`): `data-task-group` on the wrapper, `data-task-group-title` on the title button, `data-task-group-subtitle`, `data-task-group-count`. Without them the new tests would select by position, which 110 forbids for rows. Flag as an addition.

| AC | Test file and shape | Red before the change? |
|---|---|---|
| A. `/vault/Projects/Clients/ACME.md`, 2 open + 1 done, shows title "ACME", subtitle "Projects/Clients", "2 of 3 open", hide-closed on and off; root note has no subtitle | `TasksView.test.ts`, new describe: `vaultStore._reset(); vaultStore.open('/vault')` in `beforeEach` (the 2nd describe does it, `:197-200`), `vaultStore.close()` after; `tasksStore.setSectionTag('')`; mock `get_all_tasks_v2` with one `FileTaskGroupV2` (2 todo + 1 done; done task `checked: true`, as Rust sends). Mount, wait for `[data-task-group]`. Read title/subtitle/count textContent through the hooks. Run once with the default (hide on) and once after `tasksStore.setHideCompleted(false)` plus `flushSync()`. A second note at `/vault/Root.md` asserts `[data-task-group-subtitle]` is null. | Yes: no subtitle element and no "of" text today (`:159-164` render "(date)" and "(3)" or "(2)"). The root-note assertion alone would pass today; keep it in the same `it` so the test as a whole is red. |
| A2. Count survives hide-closed | same test: hide on shows 2 tasks rows but "2 of 3 open"; this is what kills `group.tasks.length` as M | Yes (see 0.2). |
| B1. Plain note renders the `FileText` fallback | `TasksView.test.ts`: header contains `svg.lucide-file-text` (class verified: `buildLucideIconNode.js:27,31` builds `lucide-<name>`) and no emoji span. `fileIconsStore.reset()` in `beforeEach`. | Yes: no icon in the header today. |
| B2. Resolved icon from the file icons store | same file: `await preloadPacks(['emoji'])` (`file-icons.icon-data.ts:316-320`; the emoji pack is built synchronously, `:259-267,291`), then `fileIconsStore.updateFrontmatterIcon(NOTE, { iconPack: 'emoji', iconName: '🚀' })` (`'🚀'` is in `EMOJI_LIST`, `:253`). Assert the header holds a `<span>` with text `🚀` and no `svg.lucide-file-text`. Do not mock `getIconSync` (EditorView.test.ts does, but this avoids a mock of a side-effect-free lookup). Optionally add `color: 'red'` and assert the span's inline `color` style, plus that the title button has no inline color. | Yes. |
| B3. Title never tinted | in B2, assert `[data-task-group-title]` has no `style` attribute and its class has no `text-purple`; use `titleColor: '#ff8800'` in the ref and assert it is not applied | Yes (title class today is purple; also covers `titleColor`). |
| C. Title hover has the date, no year in the current year | `TasksView.test.ts` with `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(new Date('2026-11-12T12:00:00Z'))` (only `Date` faked, so `vi.waitFor` and promises keep real timers; `vi.useRealTimers()` in `afterEach`). Notes with `modifiedAt` (seconds) for 2026-06-15 noon UTC and 2025-06-15 noon UTC: titles `Jun 15` and `Jun 15, 2025`. A zero timestamp: `getAttribute('title')` is null. Mid-month noon timestamps avoid timezone day flips. | Yes: no `title` today. |
| C2. Same rule as pure logic | `tasks.logic.test.ts`: `formatNoteModified(ms, now)` with explicit `now`, no clock faking: same year, other year, year boundary (Dec 31 vs Jan 1 of the next year), 0 | Yes (undefined export). |
| D. `noteFolder`, `noteTaskCounts` | `tasks.logic.test.ts`: nested, root, outside vault (`/elsewhere/x.md` with vault `/vault`), null vault, vault prefix lookalike (`/vault2/x.md`, which `relativePath` handles via `vaultPath + '/'`, `path.ts:99`); counts for all seven statuses (open = five, closed = two) | Yes. |
| E. Toggle circle: 24 px hit area, no outline, shared ring | `TasksView.test.ts`: the `[data-task-toggle]` button (110) has class tokens `p-1`, `-mx-1`, `-mb-1`, `-mt-0.5`, `outline-none`, `focus-visible:ring-[3px]`, `focus-visible:ring-ring/50`, and the icon still has `size-4`. Weak by nature (jsdom does not compute Tailwind); say so. If the owner treats it as CSS-only, `Test-Exempt` applies only to a `fix:` commit, and this is a feature commit, so keep the token test. | Yes. |
| F. No palette class in `src/lib/features/tasks/**` | New `tasks-palette.test.ts` (node env; the file reads source with `node:fs`, as `pane-toolbar.test.ts:40` does). Walk `src/lib/features/tasks` recursively for `.svelte` and `.ts`. Regex: optional variants `(?:[\w\[\]-]+:)*`, prefix `(?:bg|text|border(?:-[xytblrse])?|ring|fill|stroke|outline|decoration|from|via|to)`, palette name (22 from `slate` to `rose` plus `mauve|mist|olive|taupe`), `-\d{2,3}`, optional `/\d+`, with a left guard `(?<![\w-])`. Print `file:line`. Add matcher self-checks so the guard cannot pass vacuously: positives `text-purple-400`, `hover:bg-red-500/15`, `dark:border-l-slate-200`, `to-sky-950`; negatives `text-primary`, `border-border/50`, `bg-primary/20`, `text-muted-foreground`. Assert the file list has at least the five files that exist today. | Yes: `TasksView.svelte:154`. |
| G. `feature-cycle.test.ts` with rewritten `featurePairs` | run `pnpm vitest run src/tests/lib/architecture/feature-cycle.test.ts`, then `git diff src/tests/lib/architecture/feature-cycle-baseline.json` shows only `+ "tasks -> file-icons"` (plus 110's `event-calendar -> tasks` if not already committed); `git add` it. | No (see 0.5); ratchet check. |

Existing tests that change: `TasksView.test.ts` has nothing asserting the old header (`(date)`, `(N)`); grep `fileName|2026-Q2|formatDate` in `src/tests/lib/features/tasks/` hits only `group()` data and the `NOTE` constant. So none break; the first describe's `vaultStore.path` is null, so the subtitle code must tolerate that (test `noteFolder(null, ...)`).

Pure-logic guard: new helpers import only `#lib/utils/path.js`, `#lib/utils/date.js` and `./task-status.logic`. All pure.

---

## 3. Implementation plan (one context window)

0. **Re-read the landed files:** `TasksView.svelte` (circle button class line, header block, imports), `TasksView.test.ts` and the shared fixture 110 added, `tasks.logic.ts` (confirm `isTaskOpen` import). `git status` clean first.
1. **Red tests, logic:** add `noteFolder`, `noteTaskCounts`, `formatNoteModified` tests to `tasks.logic.test.ts`; run that file; expect failures for undefined exports.
2. **Red tests, palette:** write `tasks-palette.test.ts`; run it; expect failure naming `TasksView.svelte:154`; matcher self-checks green.
3. **Red tests, component:** add the header describe (A, A2, B1-B3, C, E) to `TasksView.test.ts` using the shared fixture; run only this file; expect red for the reasons in section 2.
4. **Green, logic:** implement the three helpers in `tasks.logic.ts` with JSDoc. Run `tasks.logic.test.ts`.
5. **Green, view:**
   - Imports: `FileText from '@lucide/svelte/icons/file-text'`, `resolveIconForPath` (`#lib/features/file-icons/icon-resolver.js`), `iconColorStyle` (`.../file-icons.logic.js`), `IconRenderer` (`.../IconRenderer.svelte`), and the three helpers from `./tasks.logic` (extend the existing import at `:14`). Keep import grouping (external, `#lib` core then features, relative).
   - `const countsByPath = $derived(new Map(tasksStore.fileTaskGroups.map((g) => [g.filePath, noteTaskCounts(g.tasks)])))`. Plain `$derived` in a component is fine (no store getter involved, ADR-0034 untouched).
   - Header, replacing `:151-165`: wrapper `div` with `flex items-center gap-2 mb-2 min-w-0`; `{@const resolved = resolveIconForPath(group.filePath)}`, `{@const counts = countsByPath.get(group.filePath)}`, `{@const folder = noteFolder(vaultStore.path, group.filePath)}`, `{@const modified = formatNoteModified(group.modifiedAt)}`; icon branch as in `EditorView.svelte:58-62` (size `size-4 shrink-0`, decorative, outside the title button, see 4.2); title `<button class="text-sm font-medium text-foreground hover:underline cursor-pointer" title={modified || undefined} data-task-group-title ...>`; `{#if folder}<span class="truncate text-xs text-muted-foreground" data-task-group-subtitle>{folder}</span>{/if}`; `<span class="ml-auto shrink-0 text-xs text-muted-foreground" data-task-group-count>{counts.open} of {counts.total} open</span>` rendered as one text node (interpolations in one expression string so `textContent` is exactly "2 of 3 open").
   - Delete the local `formatDate` (`:80-87`).
   - Circle button: replace `mt-0.5` with `p-1 -mx-1 -mb-1 -mt-0.5 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`; keep `shrink-0 cursor-pointer`, the icon `size-4`, and 110's attributes.
   - No palette class anywhere in the file after the edit (`grep -nE` the regex once manually).
6. **Run:** the component test file, `tasks.logic.test.ts`, `tasks-palette.test.ts`, `pane-toolbar.test.ts` (this view is in `TOOLBARS`; toolbar untouched), `feature-cycle.test.ts`. Stage the rewritten baseline JSON.
7. **Docs (optional):** `help/documentation/10-tasks-and-todoist.md:113` wording; mention the stale screenshot to the owner.
8. **Gate:** `pnpm check` then `pnpm vitest run`; `git diff --cached --stat` (expect: view, logic, three test files, one new test file, baseline JSON, optionally the help doc); one commit in the full COMMITS.md format; pre-commit adversarial review per memory policy.

---

## 4. Ambiguities and the most likely intended reading

1. **N and M source.** Ticket: M from the unfiltered store, N counts open tasks. Reading: both from `tasksStore.fileTaskGroups` by path (`noteTaskCounts`). With a section tag set, M counts only the tasks Rust returned (those under the heading), not every task in the note; "before any filter" means before the view's date and hide filters. State this in the delivery.
2. **Icon inside or outside the title button.** Ticket: the title "still a button that opens the note", icon described separately. An emoji `<span>` inside the button would be in the accessible name (the `IconRenderer` span has no `aria-hidden`), breaking name-based locators. Likely: icon is a sibling outside the button, not clickable. If the owner wants the icon clickable, wrap it in the button with `aria-hidden="true"`.
3. **"Resolver's icon color through `iconColorStyle` in both cases."** `IconRenderer` already applies `color` via `iconColorCss`; only the `FileText` branch needs `style={iconColorStyle(resolved?.color)}`, exactly like `EditorView.svelte:58-62`. Passing both would double-apply the same color.
4. **Ring shape.** Ticket gives no radius; a 24 px square ring around a round icon looks odd. Likely intent: `rounded-full`. Not specified, so choose it and mention it.
5. **Date hover when `modifiedAt` is 0.** Ticket: "a zero timestamp shows no date". Omit the `title` attribute (do not render `title=""`).
6. **Year comparison.** "When the year differs from the current one": local-time year via dayjs on both sides. A note modified on Dec 31 UTC could read as next year in a positive-offset timezone; same behavior as the old local helper. Not worth special handling.
7. **"A path that stays absolute (outside the vault)" and null vault.** No subtitle for both. `vaultStore.path` null cannot occur with a real vault open, but the first describe of the existing test file runs without a vault, so guard it.
8. **Subtitle for a long folder.** Not specified; truncate (`truncate min-w-0`) with no tooltip. The title's `title=` is reserved for the date.
9. **Count wording at zero or one.** `0 of 3 open`, `1 of 1 open`; no pluralization, per the ticket's fixed format.
10. **Test hooks on the header.** Ticket does not name them; adding `data-task-group*` is the repo's idiom (110). Later tickets (111 `rowsByNote`, 112 grouping) may restructure the header; hooks are cheap to carry.
11. **Where the palette guard lives and its prefix set.** Ticket lists 198's prefixes; `shadow-`, `divide-`, `accent-`, `caret-`, `placeholder-` palette forms are outside that list and stay unguarded (also in 198). Say so; do not widen it.
12. **Optional: focus style on the title button.** Not requested; skip.

---

## 5. Risks

1. **Layout regression from the margin trick (0.1).** Only visible in the app. Run the app once or inspect with the layout tools if allowed; otherwise state in the delivery that the class arithmetic is unverified visually. Also check that `-mx-1` does not clip against the row's `px-1` and the `padding-left` inline style (`:175`): the negative margin moves the box within the row padding, so the icon position is unchanged.
2. **Test-before-110 shape drift.** Selectors in new tests must use 110's hooks. If the landed circle button lacks `data-task-toggle`, 110 did not land as written; stop and re-plan.
3. **E2E selectors (VERIFIED by reading `e2e/specs/tasks-view.spec.ts`, as it stands at HEAD).** No selector targets the header text, `(N)` or the date. `getByRole('button', { name: 'Welcome', exact: true })` (`:105`) is unaffected: the header button's name is the note's file name ("Links"), and `exact: true` compares the full name. `button[title*="completed"]` (`:47`, becomes `"closed"` in 110): header buttons carry month names as titles ("Jun 15"), none contains "closed". The new subtitle ("Projects") and count text sit in spans, outside `getByText(/Ship feature A|Reply to email|Review pending PRs/i)`. If 110's rewritten spec adds a `getByText` over a folder or file name, re-check.
2b. **Accessible name of the header button** now has a `title` (description), not a name change. A test using `getByRole('button', { name: '2026-Q2' })` still resolves.
4. **Other readers of the touched code.** `TasksView` is mounted only in `app/EditorView.svelte` (INFERRED from 110's grep, 110 dossier 1.3); `tasksStore` has no reader outside the tasks feature and event-calendar chips; this ticket adds no store field, so no ADR-0034 getter test is owed. New `$derived` is component-local.
5. **Reactivity/perf.** `resolveIconForPath` runs per group per render and reads `fileIconsStore.packVersion` and the frontmatter map (`icon-resolver.ts:64-75`); that is one Map lookup plus `getIconSync` for a few dozen groups. Svelte tracks `fileIconsStore.frontmatterIcons` through the store getter, so a changed icon re-renders the header. No `$effect` is added, so the `untrack()` rule (PATTERNS.md) does not apply. The existing version-bump effect (`:73-78`) is untouched.
6. **Layer and cycle tests.** `layer-rules.test.ts`: feature-to-feature is allowed while acyclic (ADR-0003) and file-icons imports no feature, so no new baseline entry. `feature-cycle.test.ts`: acyclic, only `featurePairs` changes. Both verified by reading `feature-cycle.test.ts:36-39,56-80`.
7. **`pure-logic.test.ts`.** `tasks.logic.ts` gaining imports of `utils/date.js` (dayjs) and `utils/path.js`: dayjs is not a forbidden package spec (`pure-logic.test.ts:44-50`). `utils/date.ts` imports only dayjs and plugins (`:1-9`). OK.
8. **Fake-clock test fragility.** Faking only `Date` avoids breaking `vi.waitFor` and the Svelte scheduler. Faking all timers would require `vi.waitFor`'s timer advance; avoid. Restore with `vi.useRealTimers()` in `afterEach` or later tests in the file see a frozen clock (the 400 ms debounce tests from 234 do not use `Date`, but `filterByDate` does: `tasks.logic.ts:83`).
9. **Emoji icon test depends on a module-level cache.** `preloadPacks(['emoji'])` fills `packCache` for the whole file; later tests that expect the `FileText` fallback must not set a frontmatter icon for the same path. `fileIconsStore.reset()` in `beforeEach` handles it.
10. **jsdom icon rendering.** `IconRenderer` for emoji renders a plain `<span>`; no DOMPurify path, so no new jsdom dependency. For the lucide fallback the `lucide-file-text` class comes from `@lucide/svelte` 1.x (`buildLucideIconNode.js:27`); if a lucide upgrade renames it, the test fails loudly.
11. **Ticket claims vs code.** (a) "p-1 -m-1 ... so the icon size and the row height stay the same": not true when `mt-0.5` stays, and the icon shifts when it goes (0.1). (b) "the modified date in brackets and the task count in brackets": they are parentheses (`:160,163`); harmless. (c) "adds a `tasks -> file-icons` feature pair": correct. (d) "Issue 198's architecture test does not exist yet": correct. (e) "`formatDate` ... its name clashes": correct, and a logic helper avoids the clash entirely.
12. **Indexing and live-preview rule files** (`docs/agents/*-rules.md`): nothing here touches saves, the watcher, `VaultIndex`, decorations or widgets. Rule 9 (absolute paths) holds: `filePath` stays absolute, and the subtitle is derived at render time, never stored.
13. **IPC contracts, Rust, e2e mocks:** untouched. No `cargo test`, no ts-rs regeneration.
14. **Later tickets.** 109 (row chips) and 111 (rows, `rowsByNote`, Status filter) will edit the same file; 111 must keep "N of M open" total from the unfiltered store (ticket says so). Keep `noteTaskCounts` a pure function over a task list so 111 can reuse it.

---

## 6. Size and fit

- **Estimate: M** (ticket says S to M). Code: about 60 changed lines in the view, 30 in logic. Tests: a new describe of about 7 tests in `TasksView.test.ts`, three helper suites, one new palette test, one JSON line. About 250 to 350 changed lines overall.
- **Fits one context window: yes.** Files to read: `TasksView.svelte`, `TasksView.test.ts` (plus the shared fixture), `tasks.logic.ts`, `EditorView.svelte:50-65`, `icon-resolver.ts`. No e2e run is needed, and no Rust.
- Dependency note: needs 110 (`isTaskOpen`, hooks, fixture) and 234 (path order, the file the view is in after the scroll/alert work); 198 waits on this ticket.
