# Dossier: Issue 239, Tasks priority and tag filters, search, Reset and a narrow-pane fold

Ticket: `.scratch/open-itens/issues/239-tasks-priority-search-reset-narrow.md`. HEAD when read: `d2304ac9e`. All `path:line` references are at that HEAD. VERIFIED = read in code at the cited line. INFERRED = derived from a predecessor ticket that has not landed (nothing in the chain 108 -> 242 -> 110 -> 234 -> 236 -> 109 -> 111 -> 238 has landed at HEAD: `src/lib/features/tasks/` still holds only `TasksView.svelte`, `task-metadata.types.ts`, `task-status.logic.ts`, `tasks.logic.ts`, `tasks.service.ts`, `tasks.store.svelte.ts`, `tasks.types.ts`, and `task-query.logic.ts` does not exist).

239 sits at position 11 of the chain and is the most predecessor-dependent ticket so far: every file it edits is rewritten by 108, 110, 111 or 238 first. Section 1 therefore lists HEAD lines (what exists now) and, next to them, what the ticket text says the predecessors leave behind. Step 0 of the plan is "re-read the landed files", and the plan names exactly what to look for.

---

## 0. Headline findings

1. **The `tasks.store.test.ts` criterion cannot fail first at runtime.** The ticket asks that `resetQuick()` and `reset()` clear `priorities`, `tags` and `search`. After 111 and 238, `resetQuick()` and `reset()` replace the whole `quick` object with the default (INFERRED from 111: "`reset()` clears `rows` and resets `quick`"). Vitest does not type-check, so `setQuick({ priorities: ['high'] })` followed by `resetQuick()` passes before any 239 code exists, provided `setQuick` spreads its argument. The only red today is `pnpm check` (unknown key in the `quick` type). Say so in the delivery, and make the test meaningful: set all three, assert they are set, reset, assert `toEqual` the default object, and also assert `visibleRows` (ADR-0034 getter) follows a `priorities`, `tags` and `search` change. If 111's `setQuick` whitelists keys, the test is red at runtime.
2. **The Tag menu will list false tags that Issue 109 deliberately hides from chips.** VERIFIED: `TASK_TAG_RE` is `#([A-Za-z0-9_][A-Za-z0-9_-]*)` with no boundary check (`src-tauri/src/vault/parsing.rs:1579-1581`) and the tags are collected from the whole text (`parsing.rs:1862-1870`), so `read [[Book#Chapter 2]]` yields tag `Chapter`, `https://example.com/a#b` yields `b`, and `#123` yields `123`. 109 omits tag chips on its raw-text path for exactly this reason, but 239 builds `taskTagOptions(rows)` from `row.metadata.tags` and the ticket says "carries any chosen tag". Result: a `#Chapter` option, and choosing it lists a row that shows no `#Chapter` chip. The ticket does not mention this. Most likely intended reading: follow the ticket (filter on `metadata.tags`, "as Rust emits them"), accept the false options until Issue 075 fixes the parser, and say so in the delivery. Do not add a second tag source in 239.
3. **No existing code in the app uses `DropdownMenu` radio or checkbox items or `closeOnSelect`.** VERIFIED: `grep CheckboxItem|RadioGroup|RadioItem` over `src/lib` outside `components/ui` is empty, and `closeOnSelect` appears only in `node_modules/bits-ui`. Issue 111 is the first consumer (Status menu). The primitives support what the ticket needs (see 1.5), but 239 inherits whatever pattern 111 and 238 chose for the menu markup and their test helpers.
4. **The `Filters (n)` fold needs the four menus' items rendered in two places.** That forces 111's and 238's inline menu markup into Svelte snippets (or a child component) in 239. The ticket does not say so. It is the largest hidden cost of the ticket.
5. **The e2e mock cannot produce priority or tags.** VERIFIED: `e2e/mocks/vault-index.ts:161-190` (`parseTasks`) fills `dueDate` only and `tags: []` (`:188`), no `priority`. The ticket's only e2e test (narrow fold plus Status > All) does not need them. Priority and tag behavior are unit-test territory.

---

## 1. Code map

### 1.1 Files 239 edits

| File | HEAD state | After predecessors (INFERRED) | 239 change |
|---|---|---|---|
| `src/lib/features/tasks/task-query.logic.ts` | does not exist | created by 111 (`TaskRow`, `buildTaskRows`, `applyQuickFilters`, `rowsByNote`, `describeTaskRule`, `explainEmptyTasks`, quick state); 238 adds `due`, `DueRange`, `today`/`now` parameters, the `resetQuick` action kind | Add the priority, tag and search predicates inside `applyQuickFilters`; `taskTagOptions`; a tag-match helper; a default/changed-state helper for Reset and `Filters (n)`; extend `describeTaskRule` and `explainEmptyTasks`. |
| `src/lib/features/tasks/tasks.logic.ts` | `computeTaskStats` `:91-113`, `parseTaskTextSegments` `:130-161`, no `taskDisplayText` | 109 adds `taskDisplayText`, `taskChips`; 111 moves `describeTaskRule`/`explainEmptyTasks` out | Read only: `taskDisplayText` is the search haystack. No edit expected. |
| `src/lib/features/tasks/task-status.logic.ts` | `toggleTarget` only, `:7-9` | 110 adds `isTaskOpen`, `statusGlyph` | No edit. |
| `src/lib/features/tasks/tasks.store.svelte.ts` | `fileTaskGroups`, `dateFilter`, `sectionTag`, `hideCompleted`, `isLoading` `:4-12`, getters `:15-19`, setters `:21-25`, `reset()` `:27-33` | `hasLoaded` (108), `rows`, `quick`, `setQuick`, `resetQuick`, `visibleRows` derived (111), `dateFilter` gone (238), error and scroll offset (234) | Type-only widening of `quick` (`priorities`, `tags`, `search`). `reset()` and `resetQuick()` should need no code change if they assign a fresh default object. Verify on the landed code. |
| `src/lib/features/tasks/TasksView.svelte` | 223 lines: imports `:2-16`, `DATE_FILTERS` `:25-29`, section tag debounce `:31-44`, `filteredGroups` `:46-52`, root `:90`, toolbar `:92-134` (date pills `:93-105`, eye `:107-122`, section textbox `:124-133`), content `:137-222`, header `:152-165` | Rewritten by 108, 109, 110, 111, 234, 236, 238 (toolbar with title/count/spinner; filter row with Status and Due menus and the section textbox; `@container` root; folder subtitle in the header) | Search input in the toolbar; Priority and Tag menus and Reset button in the filter row; the fold; subtitle and count hide classes. |
| `src/tests/lib/features/tasks/task-query.logic.test.ts` | does not exist | created by 111, extended by 238 | The ticket's logic tests. |
| `src/tests/lib/features/tasks/TasksView.test.ts` | 243 lines, builder `group()` `:34-48`, describes `:54` and `:191` | moved to the shared fixture from 110 (a file under `src/tests/lib/features/tasks/`, name chosen by 110), many new tests | The ticket's component tests, written on the shared fixture. |
| `src/tests/lib/features/tasks/tasks.store.test.ts` | 58 lines, `reset` test `:43-57` | `hideCompleted`/`dateFilter` cases migrated to `quick` | `resetQuick`/`reset` cases for the three new fields. |
| `e2e/specs/tasks-view.spec.ts` | 137 lines; `waitForTimeout` at `:22,:33,:44,:49,:57`; textbox lookup by `/section tag/i` at `:20,:31,:42,:69,:99`; viewport test `:66-87` | 110 removes the timeouts; 111 swaps the eye for the Status menu | One new test at width 500. |
| `help/documentation/10-tasks-and-todoist.md` | `## Filters` `:95`, table rows `:101-103`, example sentence `:105` | 108, 110, 111, 238, 234, 242 each edit the same table | Add Priority, Tag, Search, Reset filters, and one sentence on the narrow fold. |

### 1.2 Things 239 reads but does not change (VERIFIED)

- Task shape: `TaskItem.metadata: TaskMetadata` (`src/lib/features/tasks/tasks.types.ts:4-17`); `TaskMetadata.priority?: TaskPriority`, `tags: string[]` (`src/lib/contracts/generated/TaskMetadata.ts`). `TaskPriority = "highest" | "high" | "medium" | "none" | "low" | "lowest"` (`src/lib/contracts/generated/TaskPriority.ts`), already in the order the menu needs. A task with no priority arrives with `priority` undefined (the optional field), so "none" must match both `'none'` and `undefined`.
- Tags carry no `#` and never a `/` (regex above, `parsing.rs:1579-1581`; capture group 1 is pushed at `:1866-1867`). The ticket's claim is correct.
- `e2e/mocks/vault-index.ts:45` `TASK_LINE_RE` accepts any bracket character; `:48` `STATUS_BY_CHAR`; `:184` status; `:188` empty tags. `e2e/fixtures/test-vault.ts:107` holds `- [x] Draft RFC` (the done task the narrow e2e test needs).
- Nothing outside `src/lib/features/tasks/` reads `tasksStore.quick`-style filter state (grep over `src/lib` for `tasksStore.` outside the feature is empty). Issue 113 later reads `tasksStore.quick.show` from `app/commands.ts`.

### 1.3 UI primitives (VERIFIED)

- `#lib/components/ui/dropdown-menu/index.ts` exports `DropdownMenu`, `Trigger`, `Content`, `Group`, `Label`, `RadioGroup`, `RadioItem`, `CheckboxItem`, `Separator` (both flat and `DropdownMenu*` names). Call sites use either `import * as DropdownMenu` (`PropertiesView.svelte:8`) or named imports (`SortPanel.svelte:3-8`).
- `dropdown-menu-checkbox-item.svelte:8-48` spreads `...restProps`, so `closeOnSelect={false}` and `onCheckedChange` reach bits-ui. `dropdown-menu-radio-item.svelte` does the same.
- bits-ui 2.20.4: `closeOnSelect` defaults true on `CheckboxItem` and `RadioItem` (`node_modules/bits-ui/dist/bits/menu/types.d.ts:69,104,199`). `MenuItemState.#handleSelect` closes the menu only when `closeOnSelect.current` (`menu/menu.svelte.js:1085-1096`); `onclick` calls it (`:1115-1118`). The checkbox item toggles `checked` through its bindable `checked` and calls `onCheckedChange` (`components/menu-checkbox-item.svelte`, `boxWith` setter).
- A DropdownMenu trigger opens on `click()` with `detail === 0` (what jsdom's `.click()` sends) and on `pointerdown` button 0 (`menu.svelte.js:1455-1473`). `PropertiesView.test.ts:233-239` opens with a `pointerdown`; either works in jsdom.
- jsdom keeps a closed menu in the DOM with `data-state="closed"` (comment in `src/tests/lib/features/rail-shell/RailSortMenu.test.ts:44-45`, a Popover; assume the same for the dropdown). Scope menu queries to the open one.

### 1.4 Source-scan tests that touch the new markup (VERIFIED)

- `src/tests/lib/pane-toolbar.test.ts:20,46-50`: `TasksView.svelte` must hold exactly one class list containing `pane-toolbar`, and that list may not match `OVERRIDE` (`:30`: `h-*`, `p*-`, `gap-*`, `border-*`, `flex-wrap`). The search input goes inside the toolbar but carries its own `class`, which is outside this check. Do not touch the toolbar's own class list. The filter row must not carry `pane-toolbar`.
- `src/tests/lib/menu-item-anatomy.test.ts:35-45,58-64`: any `DropdownMenu.Item|CheckboxItem|RadioItem|SubTrigger` element (and its content, up to its closing tag) may not hold a horizontal margin class (`ml-`, `mr-`, `mx-`, `ms-`, `me-`, except `*-auto`) or `text-xs`. Self-closing item tags make the lazy match run to the next closing tag of the same name, so never put those classes anywhere between items either. Triggers are not items.
- `src/tests/lib/radius-scale.test.ts`: no bare `rounded` or `rounded-[...]`; use `rounded-md`.
- `src/tests/lib/chrome-state-styles.test.ts`: no `transition-all`, no `hover:scale-`.
- `src/tests/lib/chrome-type-scale.test.ts`: no `text-[Npx]` under 11; no `uppercase` outside the allow-list.
- `src/tests/lib/architecture/pure-logic.test.ts`: `task-query.logic.ts` may import only `.logic.ts`, `.types.ts` and `utils/`; no `@lucide/svelte`, no store, no `.svelte`. The priority and tag wording must be plain strings; the menus' icons (if any) live in the view.
- 236 adds a source-text check that no Tailwind palette class remains under `src/lib/features/tasks/`. The new classes here must use tokens (`text-muted-foreground`, `text-foreground`, `bg-accent`, `border-border/50`, as the section textbox does at `TasksView.svelte:131`).

### 1.5 Tailwind container queries (VERIFIED in repo, INFERRED for the rest)

- The syntax `@max-[84px]:` is already used (`src/lib/features/event-calendar/EventBlock.svelte:89-113`) and `@container` is declared on `EventBlock.svelte:75` and `RailNoteList.svelte:717` (`@max-[12rem]:hidden` at `:725`). Tailwind is `^4.3.4` (`package.json:88,104`). In v4, `@max-[560px]:` compiles to a container query `width < 560px`, which is "below 560". The class strings must be literal in the source so Tailwind's scanner finds them.
- Playwright's `getByRole` skips `display:none` elements, so hiding by CSS is enough for the e2e assertions. jsdom does not compute Tailwind, so jsdom tests see both the four menus and the `Filters (n)` trigger (the ticket relies on this).

---

## 2. Acceptance criteria: tests, changes, red-first

Tests below sit on the real stores and logic (CLAUDE.md rule 1). Only `invoke` is mocked in `TasksView.test.ts`.

### AC1. `task-query.logic.test.ts` (logic)

Shape: build rows with the file's row builder from 111 (or a local one), call `applyQuickFilters(rows, quick, today, now)` with `show: 'all'` so only the new field is under test.
- Priority: `['high']` keeps high only; `['none']` keeps tasks whose priority is `'none'` and tasks with no `priority` field; `['high', 'low']` keeps both; empty array keeps all. Include the dimmed parent rule once (a parent with priority `low` and a `high` child, filter `['high']`: parent `dimmed: true`).
- Tag: `work` keeps `work` and `work/client`, drops `workshop`; two chosen tags are any-of; `Work` matches `work` (case); empty set keeps all; a chosen `#work` with the `#` typed is tolerated if the helper strips it (optional, see A8).
- `taskTagOptions`: de-duplicates by case (first spelling wins), sorts case-insensitively, shows `#`, returns `[]` for rows with no tags.
- Search: matches `taskDisplayText(row)` (including `Chapter` found in `read [[Book#Chapter 2]]`, which takes 109's raw-text path), matches `noteTitle`, case-insensitive substring, empty and whitespace-only search keeps all.
- Quick-state helpers (see 3, step 2): default state; each field off default; the count of the four menus off default.
- `describeTaskRule`: `, priority high or low`, `, tagged #a or #b`, `, matching "inv"`, all three together in that order after the heading and due parts; unchanged when empty.
- `explainEmptyTasks`: for each of priority, tag, search, rows exist, earlier stages pass, the field empties the list: message `No task matches the <Priority|Tag|Search> filter`, action `{ kind: 'resetQuick', field, label: 'Reset <...> filter' }`. Order: with rows where both Priority and Search would empty the list, Priority is named; with Tag and Search, Tag. Status and Due still win over all three.

Red-first: `taskTagOptions` and any new helper are missing exports, so those calls fail with `TypeError` (red for "missing", legitimate for pure functions). The predicate cases fail for the right reason: today `applyQuickFilters` ignores unknown `quick` keys and returns every row, so `expect(result).toHaveLength(1)` fails. `describeTaskRule`/`explainEmptyTasks` cases fail on missing text. The "order" case fails because the new stages do not exist (what the function returns instead depends on 238's fall-through; read it).

### AC2. `TasksView.test.ts` (component)

Use the shared fixture from 110 with realistic metadata (priority, tags) and `mount` plus `flushSync` as the file does (`TasksView.test.ts:86-91`).
- Search narrows: set the box's `value`, dispatch `new Event('input', { bubbles: true })`, `flushSync()`; assert only the matching rows remain (select rows through `data-task-row` and `data-task-text`, never by position). Find the box by `input[aria-label="Search tasks"]`.
- Tag menu: open the `Tag` trigger (button whose trimmed text starts with `Tag`), click the `menuitemcheckbox` named `#work`, assert only rows tagged `work` or `work/...` remain, the trigger now reads `Tag: #work`, and the menu is still open (proves `closeOnSelect={false}`: a second item can be clicked). A fixture note needs a `work/client` task, a `workshop` task and an untagged one.
- Reset filters: absent at defaults; appears after a search or a Priority pick; clicking it restores Status, Due, Priority, Tag and search, and the box value is `''`. After Reset, reopen the Tag menu and assert the `#work` item has `aria-checked="false"` (guards the case where bits-ui's local `checked` state diverges from the store).
- Priority menu: the ticket lists no component test for it; add a short one (item order highest, high, medium, no priority, low, lowest; `Priority: high` after a pick), since the order is easy to get wrong.
- 238's empty-state test still finds exactly one `Reset Due filter` button: assert it by exact text (`textContent.trim() === 'Reset Due filter'`), and make the new "Reset filters" button's text not contain "Due".
- Filter count: with Status > All chosen the `Filters (1)` trigger text is `Filters (1)`; search does not count.

Red-first: every one of these fails today because the search box, the trigger and the button do not exist (`querySelector` returns null, and the helper throws). Red for "element missing", not a behavioral red. The Reset-reopen assertion is the one that can fail for a real reason after the change; keep it.

### AC3. `tasks.store.test.ts`

See headline 1. Cases: `setQuick({ priorities, tags, search })` then `resetQuick()` and `reset()`; `visibleRows` follows each of the three. Existing cases are untouched.

### AC4. e2e (`bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts`)

Shape: `page.setViewportSize({ width: 500, height: 800 })` before `pressShortcut(page, 'Mod+Shift+T')` (same order as the scroll test at `:67-68`); clear the section tag with `getByRole('textbox', { name: /section tag/i }).fill('')` (the fixture tasks sit under no `#to-list` heading); assert `getByRole('button', { name: /^Filters \(\d+\)$/ })` visible and `getByRole('button', { name: /^Status/ })`, `Due`, `Priority`, `Tag` hidden; open `Filters`, click `getByRole('menuitemradio', { name: 'All' })`, assert `Draft RFC` is visible (`Projects/2026-Q2.md` holds `- [x] Draft RFC`, `e2e/fixtures/test-vault.ts:107`); assert the trigger now reads `Filters (1)`. Use auto-waiting assertions only (110 bans `waitForTimeout`).

Red-first: yes, no `Filters` trigger exists. UNVERIFIED: what width the Tasks pane has at a 500 px viewport. The saved layout is rail 192 px, navigator 13 %, note list 18 % (`e2e/fixtures/test-vault.ts`, `layout` block); `tabs.spec.ts:42-43` notes that at 640 px the navigator leaves no width. The pane is below 500 px by construction (the container cannot exceed the viewport), so the fold applies, but it may be tiny. Assert `toBeVisible()` on the trigger and look at the pane width once when running; if the trigger is clipped to nothing, close the sidebars in the test first.

### AC5. Help doc

No test covers `help/documentation/10-tasks-and-todoist.md` (grep over `src`, `e2e`, `scripts` finds no reference). Edit `## Filters` (HEAD `:95-105`): add Priority (`Priority`, levels, empty means any), Tag (tags from the listed tasks, any-of, nested prefix `work` matches `work/client`), Search (task text or note title), Reset filters, and one sentence that a pane narrower than 560 px folds the four menus into `Filters (n)`.

---

## 3. Implementation plan (one context window, in order)

Gate while iterating: `pnpm vitest run src/tests/lib/features/tasks src/tests/lib/pane-toolbar.test.ts src/tests/lib/menu-item-anatomy.test.ts src/tests/lib/architecture` (serial, one heavy command at a time). Final: `pnpm check`, `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts` once. No cargo (no `src-tauri/` change, no DTO).

0. **Re-read the landed code** (no edits): `task-query.logic.ts` (signatures of `applyQuickFilters`, `describeTaskRule`, `explainEmptyTasks`, the type of `quick` and of the `resetQuick` action `field`), `tasks.store.svelte.ts` (`setQuick`, `resetQuick`, `reset`), `TasksView.svelte` (filter row, how the Status and Due menus are written, toolbar, container classes, the folder subtitle), the shared test fixture name and `TasksView.test.ts` menu helpers, `e2e/specs/tasks-view.spec.ts`. Record how 238 computes "the first stage that empties the list".
1. **Red logic tests** in `task-query.logic.test.ts` (AC1). Run: they fail.
2. **Logic** in `task-query.logic.ts`:
   - widen the `quick` type: `priorities?: TaskPriority[]`, `tags?: string[]`, `search?: string`; export `TASK_PRIORITIES` in menu order;
   - inside the per-row pass check of `applyQuickFilters`: priority (`row.metadata.priority ?? 'none'` in the set), tag (any chosen tag equals a task tag or is a `/`-prefix of it, lowercased on both sides, a leading `#` stripped), search (trimmed, lowercased substring of `taskDisplayText(row)` or `row.noteTitle`). Empty or unset means pass. The dimmed-parent rule needs no change: it wraps the whole predicate (111);
   - `taskTagOptions(rows)`: collect `metadata.tags`, de-dup by lowercase keeping the first spelling, sort with `localeCompare(b, undefined, { sensitivity: 'base' })` or by lowercase, return the display form with `#`;
   - one helper for "which of the five differ from default" (returns per-field booleans); the view derives "Reset filters visible" (any of five) and the `Filters (n)` count (the first four) from it;
   - `describeTaskRule`: append `, priority <levels joined ' or '>`, `, tagged #a or #b`, `, matching "<search>"` after 238's due part;
   - `explainEmptyTasks`: after the due stage add priority, tag, search, using the same cumulative approach as 238 (apply the filters up to and including that field; the first prefix that leaves no row names the stage), message `No task matches the <Priority|Tag|Search> filter`, action `{ kind: 'resetQuick', field, label: 'Reset <Priority|Tag|Search> filter' }`; widen the action's `field` type.
   Run the logic tests: green.
3. **Store**: widen types only if the store restates the `quick` type; write the AC3 tests (`toEqual` the default after reset; `visibleRows` follows the fields). Run.
4. **Red component tests** (AC2). Run: they fail.
5. **View** (`TasksView.svelte`), in this order:
   1. Add `const priorityOptions`, `const tagOptions = $derived(taskTagOptions(tasksStore.rows))`, `const quickChanged`/count derived from the helper.
   2. Turn the Status and Due menu item markup (from 111 and 238) into snippets (`{#snippet statusItems()}`, `dueItems`, and new `priorityItems`, `tagItems`) so a single definition feeds both the individual menu and the folded one. Behavior and test ids of the existing menus must not change.
   3. Priority menu: `DropdownMenu` with trigger text `Priority` or `Priority: <levels>`, one `DropdownMenuCheckboxItem` per level with `closeOnSelect={false}`, `checked={priorities.includes(p)}` and `onCheckedChange` calling `tasksStore.setQuick({ priorities })` with the canonical order, setting `undefined` when empty.
   4. Tag menu: same shape over `tagOptions`; store the tag without `#`; trigger `Tag` or `Tag: #a, #b`.
   5. Wrap the four menus in one `<div class="flex items-center gap-1 @max-[560px]:hidden">`; add the folded `DropdownMenu` right after it with trigger `Filters ({n})` and class `hidden @max-[560px]:inline-flex ...`, and content holding the four groups: `DropdownMenuLabel` plus the same snippet, separators between. Keep the section textbox outside both.
   6. Reset: `<button type="button" class="ml-auto ...">Reset filters</button>` as the last child of the filter row, rendered `{#if}` any of the five off default, `onclick={() => tasksStore.resetQuick()}`. Let the row wrap (`flex-wrap`) because a narrow pane cannot hold the textbox, `Filters (n)` and Reset on one line (the row is not a `pane-toolbar`).
   7. Search input in the toolbar after the title, count and spinner (order set by 111): `<input type="search" placeholder="Search tasks" aria-label="Search tasks" class="w-40 ...">` with the section textbox's tokens plus `min-w-0 shrink`; `value={tasksStore.quick.search ?? ''}`, `oninput={(e) => tasksStore.setQuick({ search: e.currentTarget.value })}`. Do not add a debounce or a local copy of the value.
   8. Narrow rules: the count `@max-[Npx]:hidden` (N is a design call, see A6); the 236 folder subtitle gets `@max-[560px]:hidden`.
   9. Wire the empty-state action handler for the three new `field` values (reuse 238's handler: it should reset only that field).
   Run the tasks tests plus `pane-toolbar`, `menu-item-anatomy`, `radius-scale`, `chrome-*`, `architecture`.
6. **e2e**: add the narrow test (AC4), run `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts` once.
7. **Docs**: AC5.
8. **Gate**: `pnpm check`, `pnpm vitest run`. One commit (CLAUDE.md: one task, one commit, full-format message; the tasks, e2e spec and doc go together).

---

## 4. Ambiguities (most likely reading first)

- **A1. Label for `none`.** The ticket says "no priority (`none`)" for the menu item and gives no word for the trigger or the sentence. Reading: item and trigger/sentence use one word map: `highest`, `high`, `medium`, `no priority`, `low`, `lowest` (menu items capitalized). `, priority high or no priority` reads acceptably.
- **A2. Order of values in the trigger and the sentence.** Click order or canonical? Reading: canonical order (menu order for priority, option order for tags), so the text does not depend on clicking order. Store the arrays in canonical order.
- **A3. `taskTagOptions` return shape.** "Shown with a leading `#`" could be the function's output or the view's job. Reading: return `{ tag, label }[]` (`tag` as Rust emits it, `label` with `#`) so the pure function carries the rule and the stored value stays `#`-free. Tests state the shape.
- **A4. `field` of the `resetQuick` action.** 238 uses `field: 'due'`. Reading: `field` is the `quick` key (`'priorities' | 'tags' | 'search'`), the label is singular and capitalized, so the handler can do `setQuick({ [field]: undefined })`. If 238 typed `field` as the label word, follow 238.
- **A5. Whitespace-only search.** Reading: trimmed for matching, for the rule sentence, and for "differs from default", so a stray space neither filters nor shows Reset. The box still shows what was typed.
- **A6. Thresholds the ticket does not give.** The 560 px fold is given. Where the toolbar count hides ("before the search box shrinks") is not. Reading: a container query on the count only (for example `@max-[380px]:hidden`; the toolbar holds the title, count, spinner, 160 px box and 24 px padding), with the search box `shrink` and a small `min-w`. The ticket says itself that nothing was rendered: check by eye in a narrow split.
- **A7. Folded dropdown structure.** "Holding the same four groups" and the e2e "Status > All inside it". Reading: one flat menu with a `DropdownMenuLabel` per group and separators (no sub-menus), so `getByRole('menuitemradio', { name: 'All' })` works without hovering. Sub-menus would need hover or arrow keys in the e2e test.
- **A8. Chosen tag typed with `#`.** Stored without `#`; the matcher may still strip a leading `#` defensively. Not required by the ticket; only matters if 123 or 124 later load saved tags.
- **A9. Empty Tag menu.** The ticket lists items only. A menu with nothing in it looks broken. Reading: show one disabled item ("No tags in the listed tasks") instead of an empty content, or disable the trigger. Not covered by an acceptance test.
- **A10. A chosen tag that no longer exists in `rows`.** Options come from `rows` only, so it cannot be unchecked in the menu (only through Reset or the empty-state action). `rows` is pre-quick-filter, so this needs a note edit or a section-tag change. Reading: leave as is, say so in the delivery.
- **A11. What search matches.** "`taskDisplayText` or the note title". A wikilink alias (`[[Book|my book]]`) shows `my book` in the row but `taskDisplayText` keeps the raw `[[Book|my book]]`, so search finds `Book` but also `my book` (substring of the raw text). Folder and path are not searched. Reading: as the ticket says; no extra normalization.
- **A12. `Filters (0)`.** The ticket writes `Filters (n)` with n counting off-default menus. Reading: always render the number, including `Filters (0)`, to match the ticket literally (the e2e regex `^Filters \(\d+\)$` then holds at defaults).
- **A13. Whether the filter row wraps.** Not stated. Reading: wrap (`flex-wrap gap-1`) in the filter row only, never on the `pane-toolbar` element.

---

## 5. Risks

1. **Predecessor drift (highest).** 239 edits regions that 108, 109, 110, 111, 234, 236, 238 all rewrite. Every signature in section 3 is inferred from ticket prose. Step 0 is mandatory; do not copy line numbers from this dossier into the edit.
2. **Svelte `$bindable` and bits-ui `checked`.** The shadcn wrapper declares `checked = $bindable(false)` (`dropdown-menu-checkbox-item.svelte:12`). Passing `checked={expr}` without `bind:` lets the child keep a local value until the parent expression changes. Toggling then resetting from the store should resync, but this is the one place a stale tick could show; the Reset-then-reopen assertion in AC2 guards it. If it fails, key the items on a reset counter or bind through the store.
3. **jsdom shows both menu variants.** There is no container CSS, so the four menus and the `Filters (n)` trigger are all in the DOM. Tests must find triggers by their text prefix (`Status`, `Due`, `Priority`, `Tag`, `Filters`) and scope item queries to the open menu. A query such as `getByRole('button', { name: /reset/i })` would match both `Reset filters` and `Reset Due filter`.
4. **A new `<input>` in DOM order before the section textbox.** The search box sits in the toolbar, above the filter row. Any test or helper that finds the section textbox with `querySelector('input')` now gets the search box. The existing specs use `getByRole('textbox', { name: /section tag/i })` (`e2e/specs/tasks-view.spec.ts:20,31,42,69,99`); `type="search"` has role `searchbox`, so those are unaffected. Grep the unit tests added by 108, 234 and 242 for `querySelector('input')` before editing.
5. **False tag options** (headline 2).
6. **The fold threshold versus existing e2e layouts.** At the default 1280 x 720 viewport the editor pane is about 750 px (INFERRED from rail 192, navigator 13 %, list 18 %, right sidebar hidden on the Tasks tab), so the menus stay visible for 111's and 238's e2e steps. The existing 1000 px scroll test (`:66-87`) has a pane near 560 px, so the view may fold there; that test touches no menu. If a future e2e step opens a menu at a narrow width, it needs the `Filters` dropdown.
7. **Tailwind scanning.** The container classes must appear as literal strings in the `.svelte` source. A class built in script (`'@max-[' + n + 'px]:hidden'`) is not generated.
8. **Per-keystroke work.** `visibleRows` is a module-level `$derived` over `rows`, `quick` (ADR-0034, `docs/adr/0034-derived-allowed-behind-store-getters.md`). Search recomputes it on each input and calls `taskDisplayText` (regex plus `parseTaskTextSegments`) per row. Inference: fine up to thousands of tasks; if it shows, precompute a lowercase search string in `buildTaskRows`, not before. In the default vitest node environment the derived re-runs on every read; tests pin values, not caching.
9. **Native search input.** Tauri's webview shows the platform clear button for `type="search"`; it fires `input`, so the store clears (INFERRED, not checked in WKWebView). Escape-to-clear is not requested; Issue 113 owns keyboard behavior and says `/` opens the vault search, not the Tasks box.
10. **Later tickets read this.** 112 puts the Display menu after the search box; 113 reads `quick.show`; 123 persists `quick` (and will decide whether `search` persists); 116 reuses the nested tag rule for note tags ("the same rule as the note tag clause in Issue 116"). 239 lands before 116, so 239 creates the tag matcher. Export it from `task-query.logic.ts` so 116 reuses it instead of writing a second one. The ticket does not say this.
11. **No contract, Rust, layer or cycle impact (VERIFIED by construction).** No `src-tauri/` change, no `#[ts(export)]` type, no `src/lib/contracts/` or e2e-mock edit, so no `cargo test` and no ts-rs regeneration. New imports are `components/ui/dropdown-menu` (allowed for features) and intra-feature files, so `layer-rules.test.ts` and `feature-cycle.test.ts` (baseline `src/tests/lib/architecture/feature-cycle-baseline.json`) see no new pair.
12. **Ticket claims checked against code.** Correct: tags never carry `/` today; `TaskPriority` order; `closeOnSelect` exists on both item types; the e2e mock emits no tags or priority. Not yet true at HEAD, true only after predecessors: the `@container` root (109), the `Reset Due filter` button (238), `task-query.logic.ts` and `visibleRows` (111). Contradicted or unstated: the store reset criterion cannot fail first at runtime (headline 1); the Tag menu includes parser-false tags (headline 2); the ticket's "same four groups" in two places forces a snippet refactor of 111 and 238 markup (headline 4).
13. **Not verified here:** nothing was run or rendered (read-only task). The toolbar fit, the count-hide width, the e2e pane width at 500 px and WKWebView's search-input behavior are unchecked.

---

## 6. Size

**M**, as the ticket says. Rough edit volume: logic about 120 lines, logic tests about 200, view about 150 (plus the snippet refactor of the existing menus), component tests about 120, e2e about 25, store tests about 30, doc about 10. It fits one context window if the implementer reads only the landed `task-query.logic.ts`, `TasksView.svelte`, the store and the touched test files in step 0 (the view may be about 500 lines by then). The risk to the estimate is the view: if the landed `TasksView.svelte` is much larger than that, extract the filter row into `TasksFilterRow.svelte` (same feature folder, no new layer or cycle pair) rather than growing the file, and say so in the delivery.
