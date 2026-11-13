# Dossier: Issue 234, the Tasks list keeps your place, and a failed refresh says so

Ticket: `.scratch/open-itens/issues/234-tasks-groups-keep-their-place.md` (absorbs 235). HEAD when read: `d2304ac9e`. Every `path:line` is at that HEAD unless marked "after predecessors". "Verified" = read in code or docs; "Inference" = reasoning, not run (this task forbids running the app or tests).

Chain position: 108 -> 242 -> 110 -> **234**. 234 assumes 108, 242 and 110 landed exactly as written. 236, 111, 113, 116, 115 and 241 build on what 234 adds (names in section 1.4).

---

## 0. Summary of findings that change how to implement

1. **Reading `scrollTop` in `onDestroy` returns 0 in a real browser (verified from the spec and Svelte source; jsdom hides it).** Svelte 5.57.3 `destroy_effect` (`node_modules/svelte/src/internal/client/reactivity/effects.js:518-542`) removes the branch's DOM first (`remove_effect_dom`, :521-528), then destroys children, then runs teardowns (:542). So when `EditorView.svelte`'s `{#if isTasksTab}` (`src/lib/app/EditorView.svelte:72-73`) closes, the viewport is already detached when `TasksView`'s `onDestroy` runs. CSSOM View, `scrollTop` getter step 8: "If the element does not have any associated box, return zero" (https://drafts.csswg.org/cssom-view/, fetched). jsdom stores `scrollTop` as a plain property (`node_modules/jsdom/lib/jsdom/living/nodes/Element-impl.js:44`), so a destroy-time read passes in vitest and saves 0 in the Tauri webview. Implement the save as a passive `scroll` listener on the viewport that writes the plain store field (no reactive churn, which is what critique D18 wanted). The ticket's "on destroy it saves" is the intent; the mechanism must be the listener. The ticket's test must then dispatch a `scroll` event after setting `scrollTop` (jsdom does not fire one).
2. **The ticket's vault-switch order is probably inverted, the guard is still right.** `teardownVault` calls `resetEditor()` (`src/lib/app/lifecycle/app-lifecycle.service.ts:651`) and then `resetTasks()` (:664) with no `await` between (verified: the block at 630-686 is straight-line). Svelte flushes effects in a microtask, so the view most likely unmounts after `resetTasks()` (inference). Either order is covered by a generation counter bumped in `resetTasks()` and compared on destroy. Without the guard a flush would write vault A's tag into the reset store and fire a fetch for vault B.
3. **Sort with one module-level `Intl.Collator`, not `a.localeCompare(b, undefined, opts)` per comparison.** Same ordering (`localeCompare` with locales/options is specified as `new Intl.Collator(locales, options).compare`), but the collator is built once instead of per comparison; the sort runs on every refetch (version bump, toggle) over every note with tasks. Inference on the perf difference; the ordering equivalence is spec.
4. **Nothing else in `src/lib` reads `tasksStore.fileTaskGroups`** (grep over `src/lib` outside `features/tasks`: no hits; only `commands.ts`, `global-keybindings.ts`, `app-lifecycle.service.ts` import the tasks service/store, for open/toggle/reset). So changing group order cannot move another feature.
5. **Test honesty:** two ticket tests do not fail today (the reset-then-unmount guard test and the "failed refresh keeps the list" half, see section 2). They are regression guards; the rest fail for real.

---

## 1. Code map

### 1.1 Files 234 edits

| File | HEAD region | Change |
|---|---|---|
| `src/lib/features/tasks/tasks.service.ts` | `buildTaskIndex` `:65-86` (try `:68`, groups built `:75`, `setFileTaskGroups` `:76`, catch `:81-82`, finally `:83-85`); `latestTaskIndexRequest` `:55`; `resetTasks` `:227-231`; imports `:1-11` | (a) sort `groups` by path before `setFileTaskGroups`; (b) in the `request === latestTaskIndexRequest` branch of success call `tasksStore.setError(null)`, in the catch (same guard, next to the existing `error('TASKS', ...)` at :82) call `tasksStore.setError(REFRESH_ERROR_MESSAGE)`; (c) module counter `resetGeneration`, exported getter, `resetGeneration++` in `resetTasks`. Update JSDoc of `buildTaskIndex` and `resetTasks`. |
| `src/lib/features/tasks/tasks.store.svelte.ts` | state `:3-12`, getters `:15-19`, setters `:21-25`, `reset()` `:27-33` | Add `error` (`string \| null`, `$state`, getter `error`, setter `setError`) and `scrollOffset` (plain `let` number, NOT `$state`, getter `scrollOffset`, setter `setScrollOffset`). `reset()` sets `error = null; scrollOffset = 0`. After 108 the store also has `hasLoaded`; keep it untouched. JSDoc on every new member (CLAUDE.md Conventions). |
| `src/lib/features/tasks/TasksView.svelte` | `sectionTagInput` + debounce `:31-44`; `filteredGroups` `:46-52`; effect `:73-78`; `<ScrollArea>` `:137`; content `:138-221` | Viewport binding, scroll listener + one-shot restore, debounce flush on destroy, textbox sync, alert + Retry. Detail in 1.3. |
| `help/documentation/10-tasks-and-todoist.md` | line 13 says "sorted by file modification date, so the most recently edited notes appear first" (verified; only mention of this in `help/`, `docs/`, `src/tests`) | Reword to path order (vault-relative path order, numbers compared as numbers). Do not touch the Todoist section or 110's/108's edits. |

### 1.2 Tests 234 adds or changes

| File | HEAD | Change |
|---|---|---|
| `src/tests/lib/features/tasks/tasks.service.test.ts` | `buildTaskIndex` describe `:61-187`, mocks `debug.js` (`:11-15`) so `error` is a spy; `group()` builder `:40-59`; `resetTasks` describe `:515-533` | Add sort tests, error tests. Existing tests already use alphabetical paths (`a.md` then `b.md`), so none changes. Leave the builder alone (110's note: 115 rewrites these). |
| `src/tests/lib/features/tasks/tasks.store.test.ts` | default-state `:9-15`, reset `:43-57` | `error` getter/setter, `scrollOffset` getter/setter, both cleared by `reset()`. |
| `src/tests/lib/features/tasks/TasksView.test.ts` | first describe `:54-189` (`beforeEach` empties the tag `:64`), mounts via `mountView` `:77-92` | After 110 this file uses the shared fixture builder in `src/tests/lib/features/tasks/` (multi-note, metadata, seven statuses); use it for multi-note cases. Add a new `describe` for 234 (scroll, flush, sync, alert). |
| `src/tests/lib/features/tasks/` (110's shared fixture) | created by 110 | Reuse; do not create a second builder. Needs multi-note groups with chosen `filePath`s; if 110's builder only builds one note, extend it minimally. |

No change needed to `e2e/specs/tasks-view.spec.ts` (ticket's gate is frontend only; the toggle test `:46-70` only clicks a row by text, order independent; verified by reading). No Rust, no IPC DTO, no `commands.ts`, no ts-rs, no `layer-baseline.json`, no `feature-cycle-baseline.json` (234 adds no cross-feature import: it only imports `svelte`, the in-feature store/service and the existing `ScrollArea` component).

### 1.3 `TasksView.svelte` region by region (HEAD lines; after 108/242/110 they shift)

- **Imports `:2-16`.** `onDestroy`, `untrack` already imported. Add `getTasksResetGeneration` to the `./tasks.service` import (`:11`). Nothing from `core/markdown-editor/tab-view-state.ts`.
- **Textbox state `:31-44`.** Today `sectionTagInput = $state(tasksStore.sectionTag)` is a private copy; `onDestroy` (`:42-44`) only clears the timer. After 108 a `clearSectionTag()` handler also exists (clear timer, set it null, `sectionTagInput = ''`, `void updateSectionTagFilter('')`; per dossier-108 and ticket 108 part 2). 234 replaces the copy with `let pendingTag = $state<string | null>(null)` and `const shownTag = $derived(pendingTag ?? tasksStore.sectionTag)`; textbox `value={shownTag}`. `handleSectionTagChange` sets `pendingTag = value` and arms the timer; the timer callback runs `debounceTimer = null`, `void updateSectionTagFilter(value)` (which calls `setSectionTag` synchronously before its first `await`, `tasks.service.ts:97`), then `pendingTag = null`. `clearSectionTag` (108) must also set `pendingTag = null`. This satisfies "shows `tasksStore.sectionTag` whenever it changes from outside and no edit is pending" with no `$effect`. If the implementer prefers keeping `sectionTagInput`, the equivalent is an `$effect` that reads `tasksStore.sectionTag` and assigns when `debounceTimer === null`, but the derived form has fewer states.
- **`onDestroy`.** Capture `const mountGeneration = getTasksResetGeneration()` at script top level. In `onDestroy`: if `debounceTimer`, clear it, set null, and if `pendingTag !== null && getTasksResetGeneration() === mountGeneration` then `void updateSectionTagFilter(pendingTag)`. Skip the call when `pendingTag === tasksStore.sectionTag` (needless disk scan; optional).
- **Viewport.** `let viewportRef = $state<HTMLElement | null>(null)`; `<ScrollArea bind:viewportRef class="flex-1 min-h-0">` (`:137`). `ScrollArea` declares `viewportRef = $bindable(null)` and forwards it to bits-ui `Viewport bind:ref` (`src/lib/components/ui/scroll-area/scroll-area.svelte:6-27`); bits-ui 2.20.4 `ScrollAreaViewportState` sets the ref in an attachment (`node_modules/bits-ui/dist/bits/scroll-area/scroll-area.svelte.js:72`, `svelte-toolbelt` `attachRef` sets `ref.current = node`). No other file in `src` uses `viewportRef` today (grep), so this is the first consumer; the new test is also the proof that the binding works.
- **Listener effect.** `$effect(() => { const el = viewportRef; if (!el) return; const onScroll = () => tasksStore.setScrollOffset(el.scrollTop); el.addEventListener('scroll', onScroll, { passive: true }); return () => el.removeEventListener('scroll', onScroll); })`. The handler writes a non-reactive field, so no `untrack` is needed inside it (CLAUDE.md rule 2 concerns service calls in effects; the only call here is a plain setter in an event handler).
- **Restore effect.** One-shot: `let restored = false;` then `$effect(() => { const el = viewportRef; if (!el || restored || filteredGroups.length === 0) return; restored = true; el.scrollTop = untrack(() => tasksStore.scrollOffset); })`. Effects run after the DOM update, so the rows exist when it runs; if a real-webview check shows the offset clamps because layout is not final, wrap the assignment in `requestAnimationFrame` (the ticket's Notes admit this is unchecked). Setting `scrollTop` fires a `scroll` event that rewrites the same value.
- **Alert, content block `:138-221` (after 108: `!hasLoaded` text; rule sentence `<p>`; empty state or count + list).** Add, directly under the rule sentence and above the empty state/count/list: `{#if tasksStore.error}` a block copied from `CollectionView.svelte:690`: `<div role="alert" class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive">` containing `<p>{tasksStore.error}</p>` and `<button disabled={tasksStore.isLoading} onclick={() => void buildTaskIndex()}>Retry</button>`. When `tasksStore.fileTaskGroups.length === 0` the empty state (108's message + action) is not rendered while the alert shows (alert "takes the empty state's place"). `CollectionView` uses `text-row`/`text-meta` custom utilities; `TasksView` uses `text-sm`/`text-xs` today, so use `text-sm`.
- **No raw palette classes.** 236 adds a source-text guard over `src/lib/features/tasks/**`; use only tokens (`border-destructive/50`, `bg-destructive/10`, `text-destructive`). Do not touch `text-purple-400` (`:154`); 236 owns it.
- **Toolbar.** `src/tests/lib/pane-toolbar.test.ts` lists this file and forbids height/padding/gap/wrap overrides on the `pane-toolbar` element (verified in dossier-108 §1.3). 234 adds nothing to the toolbar.

### 1.4 What later tickets expect from 234 (names to keep)

- dossier-116 §predecessors and ticket 115 (`:26`) refer to "`error` + `scrollOffset` store fields" and "a service reset generation (re-used by 241's Undo)". Use exactly `tasksStore.error` / `setError`, `tasksStore.scrollOffset` / `setScrollOffset`, and a service export for the generation (`getTasksResetGeneration`; 241's text says only "Issue 234's reset generation", so the export name is free but must be exported, not view-local). 116 removes the textbox, flush and sync but must keep the generation counter (241 Undo uses it).
- 111/112 keep `rowsByNote` in the `filePath` order this ticket establishes; 115 requires "`filePath` order whatever order the snapshot returns", "a failed latest fetch sets the store's error and leaves rows untouched; a success clears it; a superseded request touches neither".

### 1.5 What predecessors have changed in the same code (assumed landed)

- **108:** `tasksStore.hasLoaded` set inside the latest-request guard (`finally`); `Loader2` status span in toolbar; rule sentence `<p>`; "Clear tag" handler/button using `debounceTimer` and `sectionTagInput`; empty state with action; textbox `aria-label="Section tag"`; root drops `bg-card`; help doc edits. A failed first fetch sets `hasLoaded` true (108 ticket: "success or failure"), so a failed first load shows the empty state today-after-108; 234 is what replaces that with the alert.
- **242:** `buildTaskIndex` calls `get_tasks_in_section_v2` with `{ sectionTags: parseSectionTags(tasksStore.sectionTag) }` or `get_all_tasks_v2` when the list is empty; the textbox placeholder `#tag #tag`; `describeTaskRule`/`explainEmptyTasks` take several tags. The store still holds the raw typed text. 234's tests that assert the section command use `sectionTags: [...]`.
- **110:** `isTaskOpen`, `statusGlyph`, row hooks (`data-task-row`, `data-task-toggle`, `data-task-status`, `data-task-text`), the shared fixture builder, "closed" wording, e2e spec cleanup. 234 tests should find the toggle through `[data-task-toggle]` and rows through `[data-task-row]`, and use the shared fixture.

---

## 2. Acceptance criteria to tests

Conventions: real `tasksStore`, real `editorStore`, mock only `@tauri-apps/api/core` `invoke`, `plugin-fs`, `svelte-sonner`, and (service file only) `#lib/utils/debug.js`, as the files already do. Tabs for indentation.

### AC1. Groups sorted by path (`tasks.service.test.ts`, `buildTaskIndex` describe)
- Tests: (a) `get_all_tasks_v2` resolves `[B.md, A.md]` (Rust mtime order, `modifiedAt` B newer); after `buildTaskIndex()` `fileTaskGroups.map(g => g.filePath)` equals `['/vault/A.md', '/vault/B.md']`. (b) input `[note 10.md, note 9.md]` yields `note 9.md` first. (c) a nested case: `/vault/Projects/Z.md`, `/vault/a.md` to pin the ICU order relative to `/`.
- Fails today: the service keeps IPC order (verified `tasks.service.ts:75-76`), so (a) and (b) get the input order. (b) also rejects an implementation that drops `numeric: true`. Choose the (b) input order `[10, 9]` so a plain code-unit sort ("note 10" < "note 9") would also fail it.
- Also assert the section branch sorts: `setSectionTag('#x')`, mock `get_tasks_in_section_v2` returning unsorted groups. The sort sits after the branch, so one implementation covers both; one test is enough, but it guards a refactor that sorts inside one branch only.

### AC2. A ticked note keeps its position (`TasksView.test.ts`, new describe)
- Shape: shared fixture, three notes `/vault/A.md`, `/vault/B.md`, `/vault/C.md`, tag `''`. First `get_all_tasks_v2` returns them in mtime order `[C, B, A]`; assert the rendered header order is A, B, C. Click A's `[data-task-toggle]` (mock `toggle_task_status` returns `changed: true`, `stale: false`, `updatedContent`); make the next `get_all_tasks_v2` return `[A, C, B]` (toggled note newest first). Wait for the refetch, assert header order is still A, B, C. Do not click a row of the first note only: the point is that the second fetch's order differs.
- Fails today: render order follows the store (`TasksView.svelte:149`), the store follows IPC order, so after the refetch A would be first, but it was last at first render; so the pre-toggle assertion `A, B, C` already fails today. The pre-toggle assertion is what makes the test fail for the right reason; keep both assertions.
- Click path runs real `settleTaskWrite` (`src/lib/core/filesystem/task-write.service.ts:21-40`) which calls `applyNoteChange`; the existing first describe already clicks a circle with `changed: false` (`TasksView.test.ts:82`). With `changed: true` the `settleTaskWrite` path executes and may touch more mocks (`task-toggle-dirty-buffer.test.ts:1-60` shows the working mock set: `invoke` default returns `undefined`, `plugin-fs` read/write). If it proves noisy, an equivalent shortcut is to call `buildTaskIndex()` from the test after changing the mock; say so in the commit, but prefer the real click.

### AC3. Scroll restore (`TasksView.test.ts`)
- Shape: mount with rows; `const vp = document.querySelector<HTMLElement>('[data-scroll-area-viewport]')`; `vp.scrollTop = 120; vp.dispatchEvent(new Event('scroll'))`; assert `tasksStore.scrollOffset === 120`; `unmount(component)`; mount again (the store keeps groups, so rows render at once); `await vi.waitFor(...)` the new viewport's `scrollTop === 120`. Also a test that a fresh store (`tasksStore.reset()` between) opens at 0.
- Fails today: nothing saves or restores anything; second viewport reads 0.
- Deviation from ticket wording: the ticket says "set the viewport's `scrollTop`, unmount, mount again". Without the dispatched `scroll` event the listener design cannot pass, and a destroy-time read would pass here and fail in the app (section 0, item 1). Write the commit message and a one-line test comment explaining this. Verify at the start that jsdom reads back an assigned `scrollTop` (set 120, read 120 on the bits-ui viewport) so a failure points at the right thing.

### AC4. Debounce flush and reset guard (`TasksView.test.ts`, fake timers)
- Test A: `vi.useFakeTimers()`; mount; `input` event with `#work` (`input.value = '#work'; input.dispatchEvent(new Event('input', { bubbles: true }))`); `unmount` before 400 ms; `await vi.advanceTimersByTimeAsync(0)` to drain the refetch promise; assert `tasksStore.sectionTag === '#work'` and an `invoke` call to `get_tasks_in_section_v2` with `{ sectionTags: ['#work'] }` (after 242). Fails today: `onDestroy` just clears the timer (`TasksView.svelte:42-44`).
- Test B: same typing, then `resetTasks()`, then `unmount`: `tasksStore.sectionTag === '#to-list'` and no `get_tasks_in_section_v2` call after the reset. **Passes today** (nothing flushes at all); it is a regression guard against a naive flush, not a red test. Say so. A stronger red-then-green variant: write the flush first without the generation check and watch B fail, then add the check.
- `resetTasks()` also calls `closeTasksTab()` (`tasks.service.ts:230`); in a test with no Tasks tab it is a no-op.
- Restore real timers in `afterEach` (the file's `afterEach` at `:69-74` does not).
- Fake timers and `flushSync`: call `flushSync()` after each state-changing step; `vi.waitFor` polls on timers and can hang under fake timers, so poll by `advanceTimersByTimeAsync` instead.

### AC5. Textbox follows outside changes (`TasksView.test.ts`)
- Mount, `tasksStore.setSectionTag('#x'); flushSync();` assert the textbox (`getByRole`-style query on `input[aria-label="Section tag"]`, name added by 108) has `value === '#x'`. Fails today: `sectionTagInput` is a one-time copy (`TasksView.svelte:31`).
- Add the converse: type (`pendingTag` set), then `setSectionTag('#y')` from outside before the timer fires: the textbox keeps the typed text ("no edit is pending" condition).

### AC6. Failed refresh (`TasksView.test.ts`, real store)
- (i) First fetch resolves with one task; then `mockRejectedValueOnce`, call `buildTaskIndex()`; expect `role="alert"` with text "Tasks could not be refreshed. The log has the details.", a "Retry" button, and the task row still present. Mock `get_all_tasks_v2` to resolve; click Retry; expect the alert gone. Fails today (no alert exists). Note `TasksView.test.ts` does not mock `debug.js`, so the real `error()` runs (`console.error` plus Sentry capture); if it is noisy or throws in jsdom, mock `#lib/utils/debug.js` in this file (it is a side-effect service, allowed).
- (ii) No list loaded: first fetch rejects; expect the alert and no empty-state text (108's empty message). Fails today.
- (iii) While Retry is pending (deferred promise): alert still visible and Retry disabled (`button.disabled === true`).
- (iv) A refresh that fails after a section tag change: list stays under the rule sentence (sentence shows the new tag, old rows remain, alert present).

### AC7. Service error handling (`tasks.service.test.ts`)
- Superseded failing request does not set the error: the existing pattern `reports only the error of the latest call` (`:170-186`) uses a deferred first call and a resolving second; add `expect(tasksStore.error).toBeNull()` after the superseded rejection, then a latest rejection sets it. Fails today (field missing, so it is a type/undefined failure; write the store field first or the test file will not type-check, see plan step 1).
- A later success clears it. The store never holds the raw error text: reject with `new Error('secret path /vault/x')` and assert `tasksStore.error` equals the fixed constant and does not contain `secret`; `error` spy (`debug.js` mock) was called with the raw error (existing assertion shape at `:184`).
- A failure leaves `fileTaskGroups` untouched (already covered at `:185`, extend with the error assertion). Passes today for the groups part.
- Also: `resetTasks()` clears the error; a call in flight across `resetTasks()` that rejects afterwards does not set it (guard identical to the existing `drops a call that resolves after resetTasks`, `:157-168`).
- Reset generation: `getTasksResetGeneration()` increases by 1 per `resetTasks()`.

### AC8. Store (`tasks.store.test.ts`)
- Defaults: `error === null`, `scrollOffset === 0`. `setError('x')`, `setScrollOffset(40)` read back. `reset()` clears both (extend `:43-57`). `error` and `scrollOffset` are plain getters over module state, not `$derived`, so ADR-0034's "every computed getter needs a test" is met by these.

### AC9. Help doc
- No test reads it (grep). Edit line 13 only.

---

## 3. Implementation plan (one context window; test first)

1. **Store, red then green.** Extend `tasks.store.test.ts` (AC8) and see it fail (undefined getters). Add `error` and `scrollOffset` to `tasks.store.svelte.ts` with JSDoc and `reset()` clearing. Run `pnpm vitest run src/tests/lib/features/tasks/tasks.store.test.ts`.
2. **Service sort, red then green.** Add AC1 tests, confirm red. Add module-level `const PATH_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })` and `groups.sort((a, b) => PATH_COLLATOR.compare(a.filePath, b.filePath))` after `v2.map(fromV2)` and before `setFileTaskGroups` (inside the stale-request guard). Update JSDoc ("sorted by path"). Optionally add the tie-break noted in 4.4.
3. **Service error and generation, red then green.** AC7 tests; add `REFRESH_ERROR_MESSAGE` constant (the ticket's sentence), `setError(null)` on the latest success, `setError(REFRESH_ERROR_MESSAGE)` in the catch's latest-request branch, `let resetGeneration = 0`, `export function getTasksResetGeneration()`, increment in `resetTasks`.
4. **View, red then green, one behavior at a time** (AC5, AC4, AC3, AC6 in that order; each in the new `describe`): textbox derived state; destroy flush with generation guard; viewport bind + listener + restore; alert + Retry. Run `pnpm vitest run src/tests/lib/features/tasks/TasksView.test.ts` after each.
5. AC2 (the toggle-order test) after step 2: it should pass at once; confirm it was red before step 2 by running it first (write it in step 2's red phase).
6. Edit `help/documentation/10-tasks-and-todoist.md:13`.
7. Gate: `pnpm check` + `pnpm vitest run` (full). Includes `pane-toolbar.test.ts`, `layer-rules.test.ts`, `feature-cycle.test.ts`, `pure-logic.test.ts` (no logic file changed). No cargo, no e2e (ticket Gate: frontend only).
8. Commit per CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges); `git add` specific files; `git diff --cached --stat`. Test files accompany source changes (a `fix:`/`feat:` without tests is rejected by the commit-msg hook).

---

## 4. Ambiguities and the likely reading

1. **Save mechanism for scroll (destroy vs listener).** Ticket: "On destroy it saves the viewport's `scrollTop` into a plain store field." Likely intent: keep the offset without reactive churn. Reading: write the plain field from a passive scroll listener; a destroy-time read is wrong in the webview (section 0). Mention in the delivery note. Do not do both with a destroy read: it would overwrite the good value with 0 in the real app.
2. **`tab-view-state.ts` or a store field.** Ticket allows either ("say in the delivery why a store field is used"). `TabViewState` requires `scrollLeft` and `cursorPos` (`tab-view-state.ts:11-15`), is keyed by tab path, `closeTab` deletes the entry (`editor.service.ts:329`), and `resetEditor` calls `clearAllTabViewStates()` (`:464`), which would clear it on vault switch for free. But `MarkdownEditor` reads/deletes entries by active tab path (`MarkdownEditor.svelte:406,478,494`), and features/tasks importing `core/markdown-editor` internals widens coupling; the ticket's `reset()` requirement names a store field. Likely: store field (what 115 and 116 text assume). One-line reason for the delivery: the tab-view-state shape carries cursor/horizontal fields a virtual tab lacks and is cleared on tab close, so Cmd+Shift+T (which closes the active Tasks tab, `tasks.service.ts:215-216`) would lose the place.
3. **Does closing the Tasks tab (toggle shortcut) keep the offset?** Ticket says leaving the tab and coming back. With a store field it also survives close and reopen until vault switch. Likely acceptable and consistent with the store keeping `fileTaskGroups` across remounts (108 text).
4. **Sort tie-break.** `sensitivity: 'base'` makes `a.md` equal to `A.md`; equal elements keep incoming (mtime) order, so two case-variant files in one folder could swap on a refetch. APFS default is case-insensitive, so only case-sensitive volumes hit it. Likely: follow the ticket literally; adding `|| (a.filePath < b.filePath ? -1 : 1)` is one line if the reviewer wants strict determinism. State the choice.
5. **Where the alert sits relative to the rule sentence.** Ticket: "an inline alert above the list", "the list stays, under the rule sentence". Likely: sentence, then alert, then count + list; the alert replaces the empty-state message/action when `fileTaskGroups` is empty.
6. **"With no list loaded yet".** After 108 `hasLoaded` is true after a failed first fetch, so "no list loaded" cannot mean `!hasLoaded` (that branch shows "Indexing tasks..." only before the first fetch finishes). Likely: `fileTaskGroups.length === 0`. A loaded list that the filters empty (all closed hidden) is "a list loaded": alert above the 108 empty state.
7. **Store field names.** Ticket says "an error field with a getter and a setter" and "a plain store field"; names come from 115/116 text: `error`, `scrollOffset`. Setter names `setError`, `setScrollOffset` follow the store's `setX` convention.
8. **Error message storage.** Store holds the fixed string and the view renders it. Alternative (store holds boolean, view owns the text) also satisfies "fixed message" but the ticket says the field holds the message. Use the string.
9. **Error clearing timing.** Only the latest request's success clears it; the start of a new request does not (alert stays during Retry, ticket). A request superseded by `resetTasks()` touches neither (existing guard); `reset()` clears it.
10. **Flush only when value differs?** Ticket: "a pending debounce applies its value". Applying an unchanged value costs a needless disk scan; skipping it is safe. Likely harmless either way; the test types a different tag.
11. **Where the generation check lives.** Ticket: "The service exposes a reset generation the view checks." Export a getter from `tasks.service.ts`; the view compares to a value captured at init.
12. **Restore timing.** "After the first render that has rows" read as the first effect run in which `viewportRef` is set and `filteredGroups.length > 0`; a `requestAnimationFrame` wrapper only if a manual check shows clamping. This cannot be checked in jsdom (no layout), so the delivery should say it was not checked in the app.
13. **Test wording "the viewport's `scrollTop` is restored"** needs the scroll event (section 0 item 1, AC3).

---

## 5. Risks

1. **Real-webview behavior unverifiable here.** jsdom has no layout: scroll restore, clamping and the detached `scrollTop` = 0 behavior are not exercised by any vitest test. Report that in the delivery ("not checked in the app").
2. **bits-ui `viewportRef` binding is unproven in this repo** (no other consumer). If the binding stays null in the test, fall back to `rootEl.querySelector('[data-scroll-area-viewport]')` via `ScrollArea`'s `ref` bindable; do not spend more than one attempt before switching.
3. **Vault switch hazards.** (a) Flush after reset: covered by the generation check. (b) `resetTasks()` while the view is mounted sets `scrollOffset = 0` but the DOM keeps its scroll until unmount; the listener then rewrites the old DOM value only on a scroll event, and `resetTasks` closes the tab, so the view unmounts. Low risk. (c) A scroll event firing between `reset()` and unmount could write a stale offset into vault B's store (inference; unlikely, the DOM is detached when the unmount lands). If a reviewer cares: `resetTasks` could be followed by nothing; accept and mention.
4. **Layer and cycle tests.** 234 adds no new import edge outside the feature. `layer-rules.test.ts`, `feature-cycle.test.ts` (baseline `src/tests/lib/architecture/feature-cycle-baseline.json`, no tasks entries touched), `pure-logic.test.ts` (no `.logic.ts` edited) stay green. 110 and 236 add the `event-calendar -> tasks` and `tasks -> file-icons` pairs; not 234.
5. **ADR-0034.** `error` and `scrollOffset` are plain getters over module state; no `$derived`. Only `shownTag` is a component-level derived, outside the store rule.
6. **`scrollOffset` not `$state`.** Intentional; a future component that renders it would not update. JSDoc must say "not reactive".
7. **Sort cost and stability.** Sorting thousands of groups per refetch is O(n log n) with a shared collator, negligible next to the IPC. `Array.prototype.sort` is stable (ES2019), relevant for case-tie behavior (4.4). Do not mutate IPC arrays: `v2.map(fromV2)` already creates a new array, so `.sort` in place on it is safe.
8. **Later tickets that rewrite this.** 111 deletes `filterCompleted`/`computeTaskStats` and moves to `rowsByNote`; 115 replaces `fromV2` and the service tests; 116 removes the textbox, debounce, flush and sync (keep the generation); 241's Undo reads the generation. Keep 234's view edits localized so those deletions are mechanical.
9. **Claims in the ticket vs code.**
   - "`TasksView` unmounts whenever another tab is active (`EditorView.svelte` renders it inside an `{#if}`)": verified, `EditorView.svelte:72-73`.
   - "Rust returns groups newest mtime first": verified, `src-tauri/src/vault/index.rs:1082` and `src-tauri/src/commands/vault.rs:728` (`sort_by_key(Reverse(modified_at))`); the Rust doc comment at `vault.rs:648` and `index.rs:1067` describe this. 234 leaves Rust alone, so those comments stay true; do not edit them.
   - "On a vault switch the editor reset unmounts the view and `resetTasks()` runs after it": order of calls verified; the unmount most likely lands after `resetTasks()` because Svelte batches DOM teardown (inference). Guard covers both.
   - "On destroy it saves the viewport's `scrollTop`": contradicted for real browsers (section 0).
   - "the textbox also holds its own copy of the tag": verified, `TasksView.svelte:31`, `:128`.
   - "`buildTaskIndex` logs with `error('TASKS', ...)` and leaves the store as it was": verified, `tasks.service.ts:82`.
   - "`CollectionView.svelte` uses a `role="alert"` pattern": verified at `:690` (`rounded-md border border-destructive/50 bg-destructive/10 p-3 text-row text-destructive`).
   - "Issue 113's focus on mount uses `preventScroll`": not checkable now (113 not landed).
10. **E2E.** `e2e/specs/tasks-view.spec.ts` selectors unaffected by 234 (no scroll, order or alert assertions). The e2e mock for `get_all_tasks_v2` is not sorted by mtime, so no mock change. Not run (ticket gate excludes e2e).
11. **Not checked at all:** real WKWebView scroll behavior; whether `Intl.Collator` ICU data in the Tauri webview orders `/` against letters like Node does (the vault-relative order is only as good as ICU; the Node tests pin Node's ICU, the webview may differ in rare punctuation cases); the Svelte flush timing claim in risk 3.

---

## 6. Size

**M** (ticket says M). Three source files (`tasks.store.svelte.ts`, `tasks.service.ts`, `TasksView.svelte`), one doc line, three test files with about 15 new tests. The hard part is test plumbing (fake timers with Svelte, bits-ui viewport binding, multi-note fixture), not code volume (about 60 lines of source). Fits one context window if the implementer reads only the files in section 1 and the shared fixture 110 created; the failure mode to avoid is spending the window on the bits-ui binding (risk 2) or on a destroy-time `scrollTop` design (section 0).
