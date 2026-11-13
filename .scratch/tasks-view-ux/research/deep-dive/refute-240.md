# Refutation: Issue 240, Tasks groups collapse and stay collapsed, and long groups show 50 rows

Ticket: `.scratch/open-itens/issues/240-tasks-collapse-groups-and-row-cap.md`. Dossier: `dossier-240.md`. HEAD `d2304ac9e`. Read-only; nothing was run. VERIFIED = read at the cited `path:line`. INFERRED = derived from predecessor ticket text or dossiers (108 to 112 have not landed, so every "after 113/112" statement is inference).

## Verdict

**Confidence: medium.** The store half (collapsed keys, toggle, reset, remount survival) and the 50-row cap are well specified and their tests discriminate. The keyboard half is where a fresh agent goes wrong, for three reasons:

1. One sentence is false on the app's own engine: "Clicking a chevron focuses that chevron, as any button click does". WebKit (the Tauri macOS webview) does not focus a clicked button, and jsdom's `click()` does not focus either. A test that relies on it fails, and an agent that "fixes" it adds focus code.
2. The ticket never says that a collapse or the cap is **not** a removal for Issue 113's current-row rule. The 113 dossier's planned reconcile effect watches "the rendered key list" (`dossier-113.md:94`); once 240 shrinks that list on collapse, the effect rewrites the current row and pulls focus off the chevron to the next row. None of 240's tests catches this: test 3 (collapse, remount, next row focused) passes whether or not the current row was rewritten.
3. The fallback rule names two consumers (roving `tabindex`, focus on open) and omits the third, 113's focus-follow after a refetch. Space on the last row above a collapsed group under the Open filter makes the successor a row that is not rendered, and focus is lost.

Two tests can also pass with a naive "first rendered row" fallback, depending on the fixture the agent picks, and the "no row rendered, focus the first chevron" branch has no test. With the must-fix edits below, confidence rises to high.

## Verified facts (the ticket is right here)

- `TasksView` mounts only inside `{#if isTasksTab}`: `src/lib/app/EditorView.svelte:40`, `:72-73`. State that must survive tab switches has to live in the module store.
- Vault switch: `app-lifecycle.service.ts:664` calls `resetTasks()`, which calls `tasksStore.reset()` (`src/lib/features/tasks/tasks.service.ts:227-231`, `:229`). So "`tasksStore.reset()` clears them, so a vault switch starts expanded" needs only the `reset()` edit.
- PRD A9: `.scratch/archived/tasks-view/PRD.md:129` ("No virtualization. A group shows 50 rows, then 'show N more'"). PRD A12 (guide follows the view): `PRD.md:132`.
- Chevron recipe with the same label wording: `src/lib/features/rail-shell/FilesNavigator.svelte:4` (import), `:455-465` (`aria-label={open ? \`Collapse ...\` : \`Expand ...\`}`, `aria-expanded={open}`, `ChevronRight ... rotate-90`).
- 115 keeps the reset contract: `115-fetch-from-entries-snapshot.md:26` lists "collapsed groups" among the fields `reset()` must still clear.
- 113 hands this rule to 240: `113-keyboard-and-a11y.md:9` ("Issue 240 adds the rule for collapsed groups") and computes `index`/`count` "over the rows currently rendered, in DOM order across groups".
- Svelte 5 does not proxy a `Set`: `proxy()` returns any value whose prototype is not `Object.prototype` or `Array.prototype` unchanged (`node_modules/.pnpm/svelte@5.57.3_.../svelte/src/internal/client/proxy.js:51-55`). `$state(new Set())` plus `.add()` is not reactive; the in-repo precedent reassigns a `$state.raw` set (`src/lib/features/event-calendar/event-calendar.store.svelte.ts:42`, `:62`). No `SvelteSet` / `svelte/reactivity` use in `src/lib` (grep empty).
- jsdom's `HTMLElement.click()` only fires a `click` event; it never calls focus (`node_modules/.pnpm/jsdom@30.1.3/node_modules/jsdom/lib/jsdom/living/nodes/HTMLElement-impl.js:66-92`).
- MDN, `<button>`, "Clicking and focus": "Most browsers do give focus to a button being clicked, but Safari does not, by design" (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button, fetched 2026-11-12, links WebKit bug 22261 c68). That WKWebView in Tauri behaves as Safari is inference (same engine).
- Today's code has none of it: no chevron, no cap, no roving focus (`src/lib/features/tasks/TasksView.svelte:149-216`); the store has five fields and no collapsed state (`src/lib/features/tasks/tasks.store.svelte.ts:4-12`, `:27-33`). Every criterion is red today.
- E2E: the only button locator by name that a `Collapse <label>` button could match is `getByRole('button', { name: 'Welcome', exact: true })` (`e2e/specs/tasks-view.spec.ts:106`), and it is exact. The gate rightly excludes e2e.

## Must-fix edits

### M1. The chevron focus sentence is false in WebKit and in jsdom

- **Change** (Keyboard bullet, line 9): "Clicking a chevron focuses that chevron, as any button click does; ArrowDown from a chevron is not handled."
- **To:** "Collapsing or expanding a group never moves focus by code. Focus stays wherever it was: on the chevron when the user pressed Enter or Space on it, and on `<body>` when a mouse click collapsed the group that held the focused row (WebKit, the macOS webview, does not focus a clicked button, and jsdom's `click()` does not focus either, so no test may assume a click focused the chevron; tests call `chevron.focus()` first when they need focus there). Keys on a chevron are not handled by the list: `resolveTaskKey` gets `onRow: false` and returns `null`, so Enter and Space keep their native click."
- **Evidence:** MDN quote above; `jsdom/.../HTMLElement-impl.js:66-92`; `113-keyboard-and-a11y.md:8-9` (`onRow` false returns `null`).

### M2. A collapse or the cap is not a removal for 113's current-row rule

- **Add** after "The current row stays a `{ filePath, lineNumber }` in the store." (line 9): "Collapsing a group, or a row falling past the cap, does not change the current row: Issue 113's 'next surviving row' rule runs when a row leaves the group rows (a refetch or a filter change), never when it only leaves the rendered set. Compute 113's successor over every group's rows, collapsed and capped ones included, and compute the roving fallback below over the rendered rows. Expanding the group again puts `tabindex=\"0\"` back on the current row."
- **Add a criterion:** "`TasksView.test.ts`: notes A (a1), B (b1, b2), C (c1). Focus b1, then `focus()` the `Collapse B` chevron and click it: `document.activeElement` is still the chevron, the store's current row is still b1, and c1 holds `tabindex=\"0\"`. Click `Expand B`: b1 holds `tabindex=\"0\"` again and focus has not moved."
- **Evidence:** `113-keyboard-and-a11y.md:10` ("After a refetch that removes it ... focus follows when focus was in the list"). The 113 dossier's planned reconcile is an `$effect.pre` over "the rendered key list" that rewrites the current row and focuses its successor when the old key leaves that list (`.scratch/tasks-view-ux/research/deep-dive/dossier-113.md:94`), and its focus guard counts anything inside the list as "focus in the list" (`:94` `hadFocus = listEl?.contains(document.activeElement)`). The chevron sits inside that container (`dossier-113.md:90` wraps the whole groups `div` as the list container). Ticket test 3 ("current row in a group that is then collapsed, unmount and mount: the first rendered row after it") passes whether or not the current row was rewritten, so nothing in the ticket catches this today.

### M3. The fallback must also feed 113's focus-follow after a refetch

- **Change** (line 9): "the roving `tabindex=\"0\"` and the focus on open go to the first rendered row after it, else the last rendered row; with no row rendered, to the first group's chevron."
- **To:** "the roving `tabindex=\"0\"` (and the `tabindex=\"0\"` of that row's controls), the focus on open, and Issue 113's focus-follow after a refetch all go to the first rendered row after it in the order of every group's rows, else the last rendered row; with no row rendered, focus goes to the first group's chevron and no row has `tabindex=\"0\"`. Compute this in one place (a pure function in `tasks-keys.logic.ts`, with its own tests) that all three read."
- **Add a criterion:** "`TasksView.test.ts`, Open filter: notes A (a1), B (b1, collapsed), C (c1). Focus a1 and press Space; the refetch drops a1: focus is on c1, not on `<body>`."
- **Evidence:** `113-keyboard-and-a11y.md:7` (controls follow the row's tabindex), `:10` (focus follows after a refetch). Under M2 the successor of a1 is b1, which is not rendered, so a focus-follow that looks up b1's element finds nothing.

### M4. Pin the fixtures so a naive "first row" fallback cannot pass, and test the untested branches

- **Change** criterion 3 (line 21): "with the current row inside a group that is then collapsed, unmount and mount: the first rendered row after it holds `tabindex=\"0\"` and focus. With the current row at position 55 of a capped group, the same holds after a remount."
- **To:** "`TasksView.test.ts`, each case with unmount and mount: (a) notes A (a1), B (b1, b2), C (c1); current row b1; collapse B: c1 holds `tabindex=\"0\"` and focus, every other row `-1`. (b) Same notes, B last (A, C, B order by path), current b1, B collapsed: the last rendered row (c1) holds them. (c) Note A with 60 tasks followed by note B (b1): click `Show 10 more`, focus row 55, remount: b1 holds them; with no note B: row 50 holds them. (d) Only note A, current row in it, A collapsed: focus is on the `Expand A` chevron and no row has `tabindex=\"0\"`."
- **Evidence:** with a fixture whose collapsed group is first (A collapsed, B after), "first rendered row after it" equals "first rendered row", which is 113's existing fallback (`dossier-113.md:89`, `tabStopKey` falls back to the first row; `dossier-113.md:121`), so the test passes with no 240 logic. The "else the last rendered row" and "first group's chevron" branches of line 9 have no criterion at all. How the current row reaches position 55 is not stated (it can only get there through `Show 10 more` and a focus, since the reveal is view-local and resets on remount, line 8).

## Should-fix edits

### S1. Issue 123 does not decide collapse persistence

- **Change** (line 7): "They are not saved across restarts (Issue 123 decides persistence)."
- **To:** "They are not saved across restarts. No Issue persists them: Issue 123's `tasksView` holds `{ version, globalExcludes, query }` only, and the research kept collapse session-only (synthesis Q10 (a))."
- **Evidence:** `123-persist-view-state.md:7` (shape, no collapse); grep for "collaps" in `123-*.md` is empty; `.scratch/tasks-view-ux/research/synthesis.md:297`, `:356`.

### S2. Say how the collapse key is built

- **Change** (line 7): "keyed by grouping and group key (for example `note:<filePath>`, `due:overdue`)".
- **To:** "keyed by `` `${tasksStore.group}:${group.key}` ``, with `group.key` exactly as `groupTaskRows` returns it (Issue 112 fixes the note key as `filePath` and the folder key as the folder, `''` for the vault root; it does not fix the due, priority and status key strings, so `due:overdue` is only an example). Build the string in one helper the view and the tests share."
- **Evidence:** `112-group-and-sort.md:8-13`, `:20`.

### S3. Define the 50 and the N over `group.rows`, dimmed rows included

- **Change** (line 8): "A group shows at most its first 50 rows, then a `Show N more` button (N = the remaining count)".
- **To:** "A group shows at most the first 50 entries of `group.rows` (dimmed parent rows of note groups count, as they render), then a `Show N more` button with N = `group.rows.length - 50`. The header count (`group.count`, or 'N of M open' for note groups) does not change with the cap or a collapse. A group of 50 rows shows no button; 51 rows shows `Show 1 more`."
- **Evidence:** `111-quick-filters.md:17` (dimmed rows stay in the list), `112-group-and-sort.md:9`, `:20` (`count` excludes dimmed rows).

### S4. `role="list"` exists only on note groups

- **Change** (line 8): "The button sits outside the group's `role=\"list\"` container."
- **To:** "The button sits after the group's row container, never inside it (`button.closest('[role=\"list\"]')` is null), and it is not a `[data-task-row]`, so the list's keydown handler ignores it."
- **Add to criterion 4:** "the button is not inside any `role=\"list\"` element; 50 rows show no button; 51 rows show `Show 1 more`."
- **Evidence:** `113-keyboard-and-a11y.md:12` gives `role="list"` to "each note group's row container" only; `112-group-and-sort.md` says nothing about flat groups' roles.

### S5. "Hides its rows" must mean removed from the DOM

- **Change** criterion 1 (line 19): "collapsing a note group hides its rows".
- **To:** "collapsing a note group removes its rows from the DOM (the count of `[data-task-row]` drops; not `hidden` or a CSS class)".
- **Evidence:** jsdom loads no Tailwind, so a `class="hidden"` row stays in the DOM and focusable; a visibility check could pass while the roving set still includes those rows (the roving set is "the rendered rows only", line 9).

### S6. Decide focus after `Show N more`

- **Add** (Volume bullet): either "After `Show N more`, focus moves to the first newly shown row (row 51)" with a criterion, or "After `Show N more`, focus is not moved; the button leaves the DOM and focus falls to `<body>` (accepted)."
- **Evidence:** the button is removed on click (line 8: it "shows all of that group's rows", so `hidden` becomes 0). The ticket is silent; a keyboard user who pressed Enter on it loses their place. An agent will either guess or ask.

### S7. State the reactivity trap for the set

- **Add** (Collapse bullet): "Hold the keys as a `$state.raw` set that the toggle replaces with a new set (as `event-calendar.store.svelte.ts:42` does): Svelte 5 does not proxy a `Set`, so mutating one in place is not reactive. Add JSDoc to the state, getter and toggle (CLAUDE.md Conventions)."
- **Evidence:** `svelte/src/internal/client/proxy.js:51-55`. Criterion 1 would catch an in-place mutation, but only after a red loop.

### S8. A current row that is in no group at all

- **Add** (Keyboard bullet): "When the current row is in no group (filtered out or gone), Issue 113's rules apply, not this fallback."
- **Evidence:** `113-keyboard-and-a11y.md:10-11`. The fallback "after it" needs a position in the full order, which a missing row lacks.

### S9. Name the accepted remount limits

- **Add** (Notes): "On remount the cap resets but 234's saved `scrollTop` does not, so a view scrolled into revealed rows clamps to the shorter list. A refetch that pushes the focused row past row 50 unmounts it and drops focus to `<body>`. Both accepted."
- **Evidence:** line 8 (reveal is view-local), `234-tasks-groups-keep-their-place.md:14` (scroll offset in the store, restored after the first render with rows).

## Dossier errors

1. **"Neither has a dossier" (`dossier-240.md:7`) is wrong now:** `dossier-112.md` and `dossier-113.md` exist in the same folder. The dossier-113 plan matters for 240 (M2), and dossier-240 never cites it.
2. **The dossier misses the M2 conflict.** Step 4e (`dossier-240.md:96`) routes `tabindex` and focus through `effectiveRow` but never says that 113's reconcile must compute the successor over all rows, not rendered rows. Following dossier-113 step 6 (`dossier-113.md:94`) literally, a collapse rewrites the current row and moves focus off the chevron. Its risk 1 (`dossier-240.md:124`) names the opposite failure, a lost tab stop, not this one.
3. **Finding 4 (`dossier-240.md:16`) misstates the ticket.** The ticket names no reason for those two tests being red; only criterion 1 says "Fails today". The ArrowDown test also does more than the finding says: it would catch a CSS-hidden collapse, because jsdom keeps such rows in the DOM and focusable (inference: jsdom applies no Tailwind stylesheet).
4. **Section 1.3 (`dossier-240.md:44`) says 113 gives "each group's row container" `role="list"`.** 113 says "each note group's row container" (`113-keyboard-and-a11y.md:12`). The dossier's criterion-4 check `button.closest('[role="list"]')` would pass trivially for flat groups that have no role.
5. **Test 3a's claimed value (`dossier-240.md:66`) is overstated.** As written (collapse, unmount, mount, next row focused) it passes even if the collapse rewrote the current row (M2), and with a fixture whose collapsed group is first it passes with 113's plain first-row fallback (M4).
6. Line references checked and correct: `TasksView.test.ts:17-19` and `:77-92`, `tasks.store.test.ts:9-15` and `:43-57`, `event-calendar.store.svelte.ts:42`, `FilesNavigator.svelte:4`, `:455-466`, `EditorView.svelte:72-73`, `tasks.service.ts:227-231`, `PRD.md:129`, help doc `:109-113`, `e2e/specs/tasks-view.spec.ts:106` (exact). The MDN quote is accurate.

## Not checked

- The landed shapes of 112 and 113 (names such as `currentRow`, `setCurrentRow`, `groups`, the reconcile code); all INFERRED from tickets and dossiers.
- Real WKWebView behavior for focus on removal of the focused row, and scroll clamping; nothing was run.
