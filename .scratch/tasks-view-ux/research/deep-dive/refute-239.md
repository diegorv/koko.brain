# Refutation: Issue 239, priority and tag filters, search, Reset and the narrow fold

Ticket: `.scratch/open-itens/issues/239-tasks-priority-search-reset-narrow.md` (cited as `239:N`). Dossier: `dossier-239.md`. Code cited at HEAD `d2304ac9e`. (F) = verified in code or in `node_modules`. (I) = inference, mostly about what predecessors 108 to 238 will leave behind, since none of them has landed (F: `src/lib/features/tasks/` holds no `task-query.logic.ts`).

## Verdict

**Confidence: medium** that a fresh agent builds it right from the ticket text alone.

These ticket claims hold up:
- `TaskPriority` already lists the levels in the menu order (F: `src/lib/contracts/generated/TaskPriority.ts`).
- Rust tags carry no `#` and never a `/` (F: `src-tauri/src/vault/parsing.rs:1579-1580`, `:1865-1867`).
- `closeOnSelect` exists on bits-ui 2.20.4 checkbox and radio items, and the shadcn wrapper passes it through (F: `node_modules/bits-ui/dist/bits/menu/types.d.ts:69,104,199`; `src/lib/components/ui/dropdown-menu/dropdown-menu-checkbox-item.svelte:8-31`).
- In Tailwind 4.3.4, `@max-[560px]:` compiles to `@container (width < 560px)`, so it means "below 560" (F: `node_modules/tailwindcss/package.json`, the `width < ${k}` template in `node_modules/tailwindcss/dist/lib.js`). The repo already uses that syntax (F: `src/lib/features/event-calendar/EventBlock.svelte:75,89-93`).
- At the default 1280 px Playwright viewport the Tasks pane stays above 560 px, so 111's and 238's e2e menu clicks do not fold. The right sidebar is hidden on the Tasks tab (F: `src/lib/core/layout/layout.logic.ts:15-17`, `:23-27`). The fixture layout is rail 192 px, navigator 13 %, note list 18 % (F: `e2e/fixtures/test-vault.ts:46-53`), which leaves about 750 px (I).

Three defects would let the ticket's own tests pass while the shipped behavior is wrong:
1. **"No priority" never matches a real task.** Rust never emits `'none'`: no emoji maps to it, and `priority` stays absent when no emoji is found. The ticket filters on "`none`" (`239:7`) and asks for "priority sets including `none`" (`239:22`). A fixture with `priority: 'none'` passes, and on a real vault "no priority" lists nothing.
2. **"Differs from its default" is undefined for `''` and `[]`.** Type a search and then delete it, or uncheck the last Priority item, and the field holds `''` or `[]`. A plain comparison against `undefined` keeps "Reset filters" visible, counts the field in `Filters (n)` and adds `, matching ""` to the sentence. No listed test hits it.
3. **The search test cannot tell the right haystack from a wrong one.** "finding `Chapter` in `read [[Book#Chapter 2]]`" passes when search reads the raw `text`. It also passes when it reads `metadata.description` from a hand-written fixture whose description equals the text. Only Rust's real description (`read [[Book 2]]`) and a default-path row make the test fail for the wrong haystack.

The rest consists of guess points, listed below as should-fix. None of them is an open owner decision. The ticket's "Answered" line (`239:18`) already settles the tag source: "Task tags follow the tags Rust emits today".

## Must-fix edits

### M1. "No priority" matches tasks with no priority field

- At `239:7`, after "Empty means any.", add:
  > A task with no priority signifier arrives with `metadata.priority` absent: Rust never emits `'none'` (no emoji maps to it). The `none` item therefore matches `priority === undefined` as well as `'none'` (`(row.metadata.priority ?? 'none')` in the chosen set).
- At `239:22`, replace "priority sets including `none`;" with:
  > priority sets including `none`, where the `none` case is built with `priority` absent from `metadata` (as Rust sends it), plus one row with `priority: 'none'`; `['high', 'low']` keeps both levels; an empty set keeps every row;
- Evidence (F): `src-tauri/src/vault/parsing.rs:1475-1481` (the emoji table has no `None` entry), `:1799-1806` (`metadata.priority = Some(*p)` only on an emoji match); `src/lib/contracts/generated/TaskMetadata.ts` (`priority?: TaskPriority`); `src/lib/features/tasks/tasks.service.ts:39` (`fromV2` copies it unchanged).

### M2. Define "default" once: absent, empty array and blank search are the same

- At `239:10`, replace "shows when status, due, priority, tag or search differs from its default" with:
  > shows when status, due, priority, tag or search differs from its default. Defaults: `show: 'open'` with `statuses` absent or empty; `due` absent or `'any'`; `priorities` and `tags` absent or empty; `search` absent or blank after `trim()`. One pure exported helper in `task-query.logic.ts` (for example `changedQuickFilters(quick)`, returning one boolean per field) holds this rule. "Reset filters" visibility, the `Filters (n)` count, `describeTaskRule` and the predicates in `applyQuickFilters` all use it or the same normalization. A menu that unchecks its last item writes `undefined`, not `[]`.
- At `239:22`, add to the failing-first list:
  > the default helper: absent, `[]`, `''` and `'  '` count as default for their field, and each field set to a real value counts as changed;
- At `239:23`, after "shows only when a quick filter is off its default", add:
  > (type a letter in Search and delete it: the button is gone again)
- Evidence: the ticket defines neither empty value (`239:7-12`). The search box sets the store on every input (`239:9`), so deleting the text leaves `''` (I). 111 already treats an empty `statuses` as "not chosen" (`.scratch/open-itens/issues/111-quick-filters.md:15`, "A non-empty `statuses` wins over `show`"). 129 later extends Reset and the count and normalizes absent fields (`129-todoist-state-on-rows-and-filter.md:18`), so one named helper is the place it extends.

### M3. Pin the search haystack with Rust's real description

- At `239:22`, replace "search on the displayed text and on the note title, case-insensitive, finding `Chapter` in `read [[Book#Chapter 2]]`;" with:
  > search on the displayed text and on the note title, case-insensitive: (a) a row with `text: 'read [[Book#Chapter 2]]'` and `metadata.description: 'read [[Book 2]]'` (Rust's output, copied from the parser, not written by hand) is found by `chapter`; (b) a row with `text: 'Send invoice 📅 2026-11-03 #work'`, `description: 'Send invoice'`, `tags: ['work']` is found by `invoice` and not by `2026-11-03` (the haystack is `taskDisplayText`, not the raw `text`); (c) a row is found by a substring of its `noteTitle` alone; (d) blank search keeps every row;
- At `239:9`, after "or the note title.", add:
  > Tags, dates and other chips are not searched: on the usual path `taskDisplayText` returns the description, from which Rust strips them. Use the Tag menu for tags.
- Evidence (F): `src-tauri/src/vault/parsing.rs:1863-1875` (tags captured, then stripped from `description`), so `[[Book#Chapter 2]]` becomes `[[Book 2]]`; `src/lib/features/tasks/tasks.logic.ts:122` (the wikilink regex captures a heading, which 109 uses to fall back to the raw text). 109 asks for descriptions copied from the pinned Rust outputs (`109-row-chips.md`, its first `taskDisplayText` criterion). Without case (b), a search over raw `text` passes every listed case.

## Should-fix edits

### S1. Label words, join and order for triggers and the sentence

- At `239:7`, replace "(trigger `Priority` when empty, `Priority: <levels>` otherwise)" with:
  > (trigger `Priority` when empty, `Priority: <words>` otherwise, words joined with `, `). Item labels and words: `highest`, `high`, `medium`, `no priority`, `low`, `lowest`. The chosen values are stored and shown in menu order, not click order.
- At `239:12`, replace "`, priority <levels joined with ' or '>`" with:
  > `, priority <words joined with ' or '>` (for example `, priority high or no priority`), placed after the Due part of Issue 238
- At `239:8`: the chosen tags are shown in option order, joined with `, ` in the trigger and ` or ` in the sentence.
- Why: the ticket gives no word for `none` in the trigger or the sentence, and does not say where the new parts go relative to 238's due part (`238-tasks-due-filter-replaces-date-pills.md`, its sentence bullet).

### S2. `taskTagOptions` return shape and the empty menu

- At `239:8`, replace "from a pure `taskTagOptions(rows)` in `task-query.logic.ts`: shown with a leading `#`," with:
  > from a pure `taskTagOptions(rows: TaskRow[]): string[]` in `task-query.logic.ts`, returning tags without `#` (the stored form); the view adds the `#` to the label;
- Add: "With no tag in `rows`, the menu holds one disabled item `No tags in these tasks`. A chosen tag that is no longer in `rows` stays in the options, checked, so it can be unchecked."
- Why: "shown with a leading `#`" leaves open whether the function or the view adds it, and the logic test (`239:22`) depends on the answer. The other two cases are not covered. A chosen tag that leaves `rows` (after a section-tag change, for example) can otherwise be cleared only through Reset.

### S3. The reset action's `field` values

- At `239:12`, replace "a `{ kind: 'resetQuick', field, label: 'Reset <Priority|Tag|Search> filter' }` action" with:
  > a `{ kind: 'resetQuick', field: 'priorities' | 'tags' | 'search', label: 'Reset Priority filter' | 'Reset Tag filter' | 'Reset Search filter' }` action (`field` is the `quick` key, as 238's `field: 'due'`)
- Evidence: `238-tasks-due-filter-replaces-date-pills.md`, `field: 'due'` in its empty-state bullet.

### S4. Search box: setter, not a binding

- At `239:9`, replace "Its value is bound to `tasksStore.quick.search`: typing sets it on every input" with:
  > Its `value` is `tasksStore.quick.search ?? ''` and its `oninput` calls `tasksStore.setQuick({ search })`. Do not use `bind:value` on the store's object, and do not keep a local copy. Typing sets it on every input
- Replace `class="w-40"` with `class="w-40 min-w-0 shrink"` plus the section textbox's token classes.
- Evidence: stores are written through setters (`docs/adr/0005-svelte-runes-getter-stores.md:35,57`; CLAUDE.md "Stores"). `bind:value={tasksStore.quick.search}` would mutate the store's `$state` object from the view. Without `min-w-0`, an input in a flex row does not shrink below its intrinsic width (I), so "before the search box shrinks" cannot happen.

### S5. The toolbar count threshold and the filter row wrap

- At `239:11`, replace "and in the toolbar the count hides before the search box shrinks" with:
  > in the toolbar the count carries `@max-[420px]:hidden` and the search box shrinks below that, and the filter row (not the `pane-toolbar` element) wraps with `flex-wrap`. Check both by eye in a narrow split and adjust the 420 if needed
- Evidence: the ticket gives no number. `src/tests/lib/pane-toolbar.test.ts:30,46-50` forbids `flex-wrap` and `h-`, `p*-` and `gap-` overrides on the toolbar class list only, so the wrap goes on the filter row. At a 500 px viewport the pane is about 210 px wide (I: (500 - 192) x 0.69), so the textbox, `Filters (n)` and Reset cannot share one line.

### S6. The folded menu's structure, `Filters (0)`, and the markup refactor

- At `239:11`, after "holding the same four groups", add:
  > as one flat menu: a label (`Status`, `Due`, `Priority`, `Tag`) and a separator before each group, no sub-menus, so `menuitemradio` "All" is clickable without hovering. The trigger always shows the number, `Filters (0)` included. To render each group's items in both places, move them into Svelte snippets (or a `TasksFilterRow.svelte` in the same folder), keeping the existing Status and Due menus' labels and behavior.
- Why: "Status > All" (`239:25`) reads like a sub-menu path. `Filters (n)` at n = 0 is not specified. The snippet refactor of 111's and 238's inline markup is the largest hidden cost, and the ticket does not mention it (dossier headline 4 agrees).

### S7. The store criterion cannot fail first; make it assert behavior

- At `239:24`, replace the criterion with:
  > `tasks.store.test.ts`: `visibleRows` follows a `priorities`, a `tags` and a `search` change set through `setQuick` (fails before this Issue); after setting all three, `resetQuick()` and `reset()` each leave `quick` equal to the default object.
- Why: after 111, `resetQuick()` and `reset()` replace the whole `quick` object (`111-quick-filters.md`, Store bullets), and vitest does not type-check. The ticket's criterion therefore passes at runtime before any 239 code exists. Its only red is `pnpm check`. `visibleRows` is the ADR-0034 getter, and it ignores the new keys until 239 lands.

### S8. Restate the 238 guard as a selector rule

- At `239:23`, replace "Issue 238's empty-state test still finds exactly one "Reset Due filter" button." with:
  > Issue 238's empty-state test still passes. With Due > Overdue chosen, "Reset filters" is also on screen, so any test that finds a reset button by a `/reset/i` match is tightened to the exact name (`Reset Due filter`, `Reset filters`). Tightening a selector is allowed; do not drop the assertion.
- Why: 238's criterion does not say "exactly one" (`238-tasks-due-filter-replaces-date-pills.md`, its `TasksView.test.ts` criterion). Its empty state now always sits next to a visible "Reset filters", because Due is off its default.

### S9. Make the e2e test prove the change

- At `239:25`, replace the criterion with:
  > e2e: set the viewport to 500 x 800 before `Mod+Shift+T`, clear the section tag, and assert `Draft RFC` is not listed. The `Filters (0)` button is visible, and the `Status`, `Due`, `Priority` and `Tag` buttons are hidden. Open Filters, pick `menuitemradio` "All": `Draft RFC` is listed and the trigger reads `Filters (1)`. Auto-waiting assertions only.
- Evidence: the done task is `- [x] Draft RFC` (F: `e2e/fixtures/test-vault.ts:107`). The fixture tasks sit under no `#to-list` heading, so the tag must be cleared (F: `e2e/specs/tasks-view.spec.ts:17-20`). 110 bans `waitForTimeout` (`110-open-closed-rule.md`, its e2e bullet). Without the negative first step, the test also passes if the done task was already listed. Playwright's `getByRole` skips `display:none` elements by default, so the CSS-only fold is visible to it.

### S10. Known false tag options; export the matcher

- At `239:8`, after "the logic covers it now.", add:
  > The options come from `metadata.tags` as Rust emits them, including tags taken from inside links (`Chapter` from `[[Book#Chapter 2]]`, `b` from `https://example.com/a#b`) that Issue 109 hides from chips. That is accepted until Issue 075; do not add a second tag source. Export the tag matcher (for example `matchesNestedTag(chosen, tag)`) so Issue 116's note-tag clause reuses it.
- Evidence (F): `parsing.rs:1579-1580` (no boundary check), `:1863-1867` (tags taken from the whole cleaned text). 109's raw-text bullet. `116-sources-panel-and-excludes.md`, its note-tag clause ("the same rule").

### S11. Component test for the Priority menu order

- At `239:23`, add: "The Priority menu lists its items in the order highest, high, medium, no priority, low, lowest; after picking high and no priority the trigger reads `Priority: high, no priority`, and the menu stays open between the two picks."
- Why: the order and `closeOnSelect={false}` are the parts easiest to get wrong, and no listed test covers either.

## Dossier errors

1. `dossier-239.md` section 5, risk 2: "`checked = $bindable(false)` (`dropdown-menu-checkbox-item.svelte:12`)". The line is `:10` (F).
2. Section 5, risk 6, marks "right sidebar hidden on the Tasks tab" as INFERRED. It is verifiable: `src/lib/core/layout/layout.logic.ts:15-17` puts `TASKS_VIRTUAL_PATH` in `NO_RIGHT_SIDEBAR_PATHS`, and `:36-37` hides the sidebar for it (F).
3. Missed: the dossier writes `row.metadata.priority ?? 'none'` in its plan (section 3, step 2), but it never raises that the ticket text and the ticket's test omit this. A fixture with `priority: 'none'` passes the ticket's criterion (M1).
4. Missed: the empty-string and empty-array defaults (M2). The dossier's A5 covers whitespace in search only, as an ambiguity, not as a defect that the tests cannot see.
5. Missed: the search test passes against the raw `text` haystack (M3). The dossier's AC1 keeps the ticket's single `Chapter` case.
6. Section 1.3: "jsdom keeps a closed menu in the DOM with `data-state="closed"` ... assume the same for the dropdown" is unverified. It cites a Popover test. Treat it as a hypothesis, not a fact, when writing the menu helpers.
7. The dossier's remaining citations that I checked are correct: `TasksView.svelte` 223 lines; `TasksView.test.ts` 243; `tasks.store.test.ts` 58; the spec's `waitForTimeout` lines and `/section tag/i` lines; `e2e/mocks/vault-index.ts` `tags: []` at `:188`; `package.json:88,104`; no `tasksStore.` reads outside `features/tasks/`.

## Not verified

Nothing was run or rendered, as the task required. Not checked: the real pane width at a 500 px viewport (only computed from the layout fixture), how WKWebView treats `type="search"` (native clear button), whether bits-ui unmounts closed dropdown content in jsdom, and every predecessor signature (`setQuick`, `resetQuick`, the action type, the shared fixture name), which comes from ticket prose only.
