# Dossier: Issue 012, Tab-strip menu acts on the right tab, and Delete asks first

Written 2026-11-12 against HEAD `afc0a9df8`. Read-only research. Nothing was run (no pnpm, vitest, cargo, app). "Verified" means read in code; "Inferred" means reasoned, not run.

## 1. Still present?

Verdict: present exactly. Every claim holds. The line numbers in the Issue are off by about 2 (the file was edited after the Issue was written), the logic is unchanged.

Verified at HEAD, `src/lib/features/collection/CollectionView.svelte`:

- `ContextMenu.Trigger` wraps the whole strip through a `child` snippet: `<div {...props} class="flex items-center gap-0.5 overflow-x-auto">` containing every tab button AND the "+" button (`:519-553`). Tabs at `:523-543`, "+" at `:544-550`.
- `tabContextIndex` declared `:106` (`$state<number | null>(null)`). The only write is `oncontextmenu={() => { tabContextIndex = i; }}` on a tab button (`:538`). The only reads are `:555-556`. A grep of the file finds no other assignment, so it is never cleared.
- `ContextMenu.Content` renders only `{#if tabContextIndex !== null}` (`:555`), so a right-click on "+" or empty strip after any earlier tab right-click shows the menu for the stale index. Rename (`:557`), Change type (`:565-573`) and Delete (`:576-582`) then act on `definition.views[idx]` as it is NOW.
- Right-click on "+" or empty strip BEFORE any tab right-click: `tabContextIndex` is null, so the menu opens empty (bits-ui `ContextMenuTriggerState.oncontextmenu` opens and calls `preventDefault`, `node_modules/bits-ui/dist/bits/menu/menu.svelte.js:1564-1571`, bits-ui 2.20.4). That is a harmless empty popup, a smaller papercut of the same cause.
- `handleDeleteView` (`:445-451`) writes at once. Guards: `definition.views.length <= 1` returns, and `onView(content, idx, name)` (`:360-363`) refuses with `CollectionEditConflict` when the view at `idx` is no longer `name` on disk. There is no confirmation. No `ask` or dialog import exists in the file (grep `confirm|AlertDialog|ask` finds nothing relevant).
- The staleness is partly mitigated for Delete by `onView` (`name` is read at `:447` from the current `definition`, not from the click time). That mitigation does NOT help here: `name` is read from `definition.views[idx]` at delete time, so a stale index that still points at a view (any view) passes the check and deletes that view. The mitigation only guards against the file changing on disk.
- History: `git log --since=2026-11-08` on `CollectionView.svelte` and `CollectionView.view-writes.test.ts` shows nothing. The Issue file was last touched by `424491c6b` (archive) and `d193cdd3f` (consolidation). No commit fixed this.

Inference: how the trigger reaches the "+" button. The contextmenu event bubbles from "+" to the wrapping div that carries the trigger props. The existing tests dispatch bubbling `contextmenu` events on tab buttons (`CollectionView.view-writes.test.ts:338`, `:355`), the same mechanism.

## 2. Impact for this owner

- Trigger: right-click a tab, use or dismiss the menu, later right-click "+" or the empty part of the strip (or any other tab-strip gap) and click Delete/Rename/Change type. Or just misclick Delete on the right tab; there is no undo.
- Frequency: low to moderate. The owner uses `.view` rail views (bugs only) and sometimes the `.view` editor tabs. Multi-view `.view` files with a tab strip are a minority of use, and right-clicking "+" is an odd gesture. Misclicking Delete on the correct tab is more plausible than the stale-index path.
- Severity: wrong data / quiet loss. A deleted view is recoverable only through file history (Issue note). Delete writes the `.view` file immediately (via `rewriteView`, so it saves). No data outside that one view definition is at risk; no notes are touched.
- Rank: low-medium. Small blast radius, cheap to fix. It is a confirmation-on-destructive-action fix, which the repo already does for note deletion (`delete-note.service.ts:12-20`).

## 3. Complexity and risk

Size: S (confirmed). Two edits in one component plus tests and one help line.

Files and functions:

- `src/lib/features/collection/CollectionView.svelte`: the tab strip markup (`:517-586`) and `handleDeleteView` (`:445-451`), `tabContextIndex` (`:106`).
- `src/tests/lib/features/collection/CollectionView.view-writes.test.ts` (365 lines).
- `help/documentation/12-collection.md:150` (the "Right-click a tab" bullet under `### Managing views`, `:144`).

Centrality: `CollectionView.svelte` (736 lines) is hot: the priority note groups it with `RailNoteList` / `lens.logic.ts` as "every VE and VD Issue, and 043". But 012 touches only the tab-strip template and one handler; it does not touch `writeYaml` (`:308-339`), `persistKey` (`:346-357`) or any save path. Readers of these symbols: `startTabRename` (`:460`), `handleSetViewType` (`:454`), the rename input. Nothing outside the component reads `tabContextIndex`. Not a core write path, no Rust, no shared store. `docs/agents/indexing-watcher-rules.md` is not triggered: the write goes through the existing `writeYaml` / `rewriteView` and this change does not alter it.

Design choice for "menu on the tab only":

- Issue's proposal: trigger on each tab only and clear `tabContextIndex` on close.
- Recommended: one `ContextMenu.Root` per tab, `Content` closed over the loop index `i`, so `tabContextIndex` is deleted entirely (no stale state is possible). Root renders no DOM, Content is portaled, so layout is unchanged. bits-ui's trigger state is per Root (`ContextMenuTriggerState`, one `#point` and one `parentMenu.triggerNode`); sharing one Root across several triggers is not shown to be supported, hence one Root per tab. The wrapping `div` stays as a plain flex container with no trigger props.
- Alternative (Issue's literal wording): keep one Root, move the Trigger `child` onto each tab, clear the index in `onOpenChange(false)`. Worse: still needs the shared state, and multi-trigger on one Root is unverified.

Confirmation mechanism:

- Repo convention for confirmed deletions is the native Tauri `ask` from `@tauri-apps/plugin-dialog` (`src/lib/core/filesystem/delete-note.service.ts:14-19`, also `FilesNavigator.svelte`, `NoteRowMenu.svelte`, `TypesNavigator.svelte` use plugin-dialog). The in-app `Dialog` (`src/lib/components/ui/dialog`) is used for forms (`TypeNameDialog.svelte`, `ViewDialog.svelte`), and there is no `alert-dialog` component. Recommended: `ask(\`Delete view "${name}"?\`, { title: 'Delete view', kind: 'warning', okLabel: 'Delete', cancelLabel: 'Cancel' })`. It is about 6 lines, no new component, no new state. An in-app `Dialog` would add markup, an open state and a pending index (the same stale-state class of bug) for no gain.

What could regress (Inferred, test before relying on it):

1. Rename from the menu. Today the Root and trigger div persist while a tab turns into the rename `input` (`:524-532`). With a per-tab Root, keep the Root OUTSIDE the `{#if renamingTabIndex === i}` so the Root survives the swap, and put Trigger only around the button. Even so, on menu close bits-ui returns focus to the trigger node, which was just removed. `startTabRename` focuses the input in `requestAnimationFrame` (`:465-468`), and a close-time focus move could blur the input, and `onblur={commitTabRename}` (`:529`) would then commit and close the rename at once (an unchanged name writes nothing, so no data harm, but the rename UX would break). No existing test renames through the menu (the rename test at `view-writes.test.ts:316-330` uses dblclick). Add one; if it fails, pass `onCloseAutoFocus={(e) => e.preventDefault()}` to `ContextMenu.Content`.
2. Existing delete tests change. `CollectionView.view-writes.test.ts:332-348` and `:350-364` click Delete and expect an immediate write/refusal. With `ask` they need `ask` mocked to resolve true. That is an intended behavior change, not weakening: both tests keep their disk assertions. Note the file currently has no `plugin-dialog` mock (header `:25-40`); under the existing `invoke` mock `ask` would resolve falsy, so the tests would otherwise silently see no write.
3. Tab spread props: `{...props}` from the Trigger `child` snippet carries `oncontextmenu`, `onpointerdown`, etc. Our `onclick`/`ondblclick` do not collide. Put the spread before the explicit class and handlers. Long-press (touch) opening is not a concern in a desktop app.
4. Keyed each is `(i)`: indexes. Fine; Root per index.

## 4. Implementation plan (test-first, one context)

Assumption to state before coding: native `ask` is acceptable for the confirmation (matches note-delete). If the owner wants an in-app dialog instead, say so; it is a larger S+.

Step 0, Pre-Change Checklist answers (no store writes): `handleDeleteView` writes via `writeYaml` to the tab buffer/file (`CollectionView.svelte:308-339`), `activeViewIndex` is local `$state`; consumers: the strip render and `activeView` derived (`:130-133`). Nothing else.

1. Failing tests first, in `CollectionView.view-writes.test.ts`. Add `vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }))` (same line as `CollectionView.restored-view.test.ts:19`) and `import { ask } from '@tauri-apps/plugin-dialog'`; reset with `vi.mocked(ask).mockResolvedValue(true)` in `beforeEach` after `vi.clearAllMocks()`, and flip per test.
   a. "right-click on the Add button after a tab menu shows no tab actions": dispatch `contextmenu` on `viewTab('All')` (as `:338`), wait, assert a `[role="menuitem"]` exists, close it (dispatch `keydown` Escape on `document.activeElement ?? document.body`, or click the body), `settle()`, then dispatch `contextmenu` on `button[title="Add view"]`; assert `document.querySelectorAll('[role="menuitem"]').length === 0` and `queryByText Delete view` absent. Fails now (stale index renders Delete). Also add the empty-strip variant: dispatch on the strip container (`button[title="Add view"]`'s parent) and assert no menuitem; fails now for the same reason.
   b. "Delete asks first, naming the view; Cancel writes nothing": `ask` resolves false; open the menu on `Second`, click Delete view; `settle()`; assert `ask` called once with a message containing `Delete view "Second"?`, `writeTextFile` not called, `disk.get(VIEW)` unchanged, and `viewTab('Second')` still in the DOM. Fails now (there is no `ask` call and the write happens).
   c. Update the two existing delete tests to `ask` resolved true, and add `expect(ask).toHaveBeenCalledWith(expect.stringContaining('Delete view "All"?'), expect.anything())` to the first.
   d. Rename-through-menu test: right-click `Second`, click Rename, type `Later`, Enter, assert disk has `Later` and the input was focused (guard for the focus risk in section 3).
   Run: only `pnpm vitest run src/tests/lib/features/collection/CollectionView.view-writes.test.ts`, expect a/b red.
2. Implement in `CollectionView.svelte`:
   - Remove the strip-level `ContextMenu.Root/Trigger/Content`; the strip becomes a plain `div.flex.items-center.gap-0.5.overflow-x-auto`.
   - In the loop: `<ContextMenu.Root>` wrapping `{#if renamingTabIndex === i}<input .../>{:else}<ContextMenu.Trigger>{#snippet child({ props })}<button {...props} ...>{v.name}</button>{/snippet}</ContextMenu.Trigger>{/if}` followed by `<ContextMenu.Content class="w-44">` with the existing three items using `i` instead of `idx`. Delete the `tabContextIndex` declaration (`:106`) and its doc comment.
   - Make `handleDeleteView` async: keep the guards and `const name = definition.views[idx]?.name` BEFORE the `await ask(...)`; compute `nextIndex` after the await; return when not confirmed. Errors from `ask` should propagate (repo rule) rather than be swallowed; `writeYaml` already toasts its own failures. Call site `onclick={() => void handleDeleteView(i)}`.
   - Keep tabs, tabs' tests, `startTabRename` untouched. Add `import { ask } from '@tauri-apps/plugin-dialog'` in the external-packages group.
3. Docs: `help/documentation/12-collection.md:150`: say Delete asks for confirmation naming the view; the menu opens only on a tab (right-clicking "+" or the empty strip does nothing).
4. Gate: frontend only, `pnpm check` + `pnpm vitest run` (CLAUDE.md rule 6). Commit as `fix:` with the test change, full detailed message per `docs/COMMITS.md`.

Acceptance criteria review of the Issue:

- "Delete renders a confirmation containing the view name": wrong for a native `ask` (nothing renders in the DOM). Reword to "`ask` is called with a message containing `Delete view "<name>"?`". If an in-app Dialog is chosen instead, the DOM wording is right.
- "no Delete item renders" after right-clicking "+": testable and correct as written. Add the empty-strip case.
- Missing: the existing two delete tests must be updated for the confirmation (mock `ask` true); missing: Rename-through-menu still works (focus) when the Root moves per tab; missing: the conflict toast case still works after confirm (`:350-364` covers it once `ask` is true).
- Missing: "clear `tabContextIndex` when the menu closes" becomes moot with per-tab Roots (the state is removed); say so in the closing note.
- The doc line is in `help/documentation/12-collection.md` § Managing views (confirmed at `:144-150`); nothing in `docs/agents/view-files.md` mentions the tab menu (grep found no match).
- Gate line is right.

## 5. Run order

- Blocked by 010 per the Issue, but this is a sequencing preference and not a code dependency. 010 touches `evaluator.ts`, `methods.logic.ts`, `collection.logic.ts`, `RailNoteList.svelte`, and in `CollectionView.svelte` only the "N notes could not be evaluated" text near the count (`:587`, outside the tab-strip template, which sits at `:517-586`). It places its `.view` test in `CollectionView.test.ts`, not `view-writes`. Inferred: running 012 before 010 would at worst produce a textual merge conflict at the toolbar, no semantic one. The queue already has `010 -> 012`; keep it.
- Priority note says VD-01 (009) before VE-01 (012). 009 edits `yaml-parser.ts` (`renameView`, `removeView`), `yaml-parser.test.ts` and ONE test in `CollectionView.view-writes.test.ts` (tab-rename path), and its callers in `CollectionView.svelte` "do not change". Overlap with 012 is the test file only (append-only, different `it` blocks): trivial to merge, but run serially as the series rule says.
- Hot series group: `RailNoteList` / `lens.logic.ts` / `CollectionView.svelte` (priority-2026-11-08.md:63). Do not run in parallel with other queue Issues touching `CollectionView.svelte`: 010 (small), 067/068 (columns and sort keys, may touch the toolbar or `CollectionView.test.ts`), 009 (test file only). 070, 071 (deferred) and the 131-144 chain are not in the queue.
- Shared files with the queue: `CollectionView.view-writes.test.ts` (009, 012); `CollectionView.svelte` (010, 012, possibly 067/068). It blocks 013 (Filter panel safe writes, deferred) and 138 (calendar undated count, deferred).
- Suggested placement: right after 010, as queued. Standalone S, no Rust, no gate beyond frontend.

## Not verified

- No test was run; the failing-test claims (4.1a, 4.1b) are traced from code, not observed red.
- The focus behavior on menu close with a per-tab Root (section 3 item 1) and bits-ui `onCloseAutoFocus` support on `ContextMenu.Content` are inferred, not read in the library source. Verify in the first test run.
