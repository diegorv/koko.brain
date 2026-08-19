# Issue 24: Explicit autosave schedule on external content sync

Status: ready-for-agent
Phase: P3 Track B step 1
Source: ARCH 2.1 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track B — Editor/save)
Blocked by: 13-editor-save-deletions

## What

`syncExternalContentToEditor` currently leaves the autosave schedule implicit, so a caller writing
frontmatter cannot say which debounce it wants. Add an explicit `schedule` parameter and an
external-edit annotation, so the 500 ms frontmatter path and the 2000 ms body path are chosen by the
caller instead of inferred.

## How

- Add a `schedule: 'frontmatter' | 'body' | 'none'` parameter to `syncExternalContentToEditor`.
- Add an **external-edit annotation** built to the **same shape as `isTabSwitching`** — reuse that
  existing pattern, do not invent a second annotation style.
- **Audit `restoreSnapshot`'s silent no-op when `editorView` is null**
  (`file-history.service.ts:82-105`). Note for scope: it takes **no position argument** and is
  therefore **not an arch 2.2 caller** — it does not become an `openNoteAt` call site.
- **The `markSaved` flip was ALREADY taken in issue 03** (`type-definitions.service.ts:149`,
  prescribed by both 2.0 and 2.1, landed once). **Do not repeat it here.**
- Requires the P2 editor deletions (#54 → #44 → #15) to have landed first, so this refactor rewrites
  the editor test files after the deletions have already shrunk them.
- **Testing seam:** real debounce + fake timers, discriminating the 500 ms frontmatter path from the
  2000 ms body path. Prior art: the editor-service reset-timers suite.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Test collateral lands in the same commit as the source change.
- Stage only the files related to this step (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- One commit, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with
  line ranges).

## Comments

### 2026-08-18 - closing

One step, one commit. `syncExternalContentToEditor` now takes an explicit
`schedule: 'frontmatter' | 'body' | 'none'`, `markSaved` lost its default so no call site inherits a
schedule or a dirty-flag policy by omission, and the doc replace that the signal bump triggers in
`MarkdownEditor.svelte` is flagged as an external edit so it no longer re-enters the keystroke
pipeline.

| Step | Resolving SHA |
|------|---------------|
| ARCH 2.1 - explicit `schedule` param + external-edit flag on `syncExternalContentToEditor` | this commit |

**Gate + review:**

- **ARCH 2.1** (this commit) - frontend gate re-run at commit time: `pnpm check` 191 files / 0
  errors / 0 warnings; `pnpm vitest run` 284 files / 6341 tests passing (1 todo); `pnpm build`
  succeeded. Review: Fable 5 sub-agent under the presumed-flawed stance, verdict
  `could_not_refute`. The fix-round count was not recorded in the step summary handed to the commit
  agent, so it is not asserted here.

**Evidence in brief:**

- **Red-green on the discriminating seam.** `properties.service.test.ts` gained
  `commitChanges auto-save schedule > arms the 500 ms frontmatter timer, not the 2000 ms body timer`
  (real debounce + fake timers, per the issue's testing seam). Mutation probe run at commit time:
  flipping `properties.service.ts:50` from `'frontmatter'` to `'body'` makes exactly that test fail
  (1 failed | 26 passed) and nothing else in the file - every other assertion there is on
  store/content state, which is identical for all three schedules. Restored and re-verified before
  staging. `editor.service.autosave-schedule.test.ts` is the same seam at the service level: 499 ms
  vs 501 ms for `'frontmatter'`, 600 ms vs 2100 ms for `'body'`, nothing at 5000 ms for `'none'`,
  plus a background-tab case (`externalContentSignal` unchanged, timer still armed) that fails
  against the old implicit behavior by construction - pre-change, a background write reached no
  CodeMirror and armed nothing at all.
- **Caller trace - all 12 production call sites, each justified.** `'none'` (content already on
  disk, tab clean, nothing to auto-save): `editor.service.ts:387` (`reloadExternallyChangedTabs`,
  post-`readTextFile`), `link-updater.service.ts:46` (post-`writeTextFile` link rewrite),
  `deep-link.service.ts:237,256,273,336` (append / prepend / overwrite / daily, all
  post-`writeTextFile`), `frontmatter-icon.service.ts:49,68` (post-`writeTextFile`),
  `tasks.service.ts:110` (Rust already wrote the toggled line),
  `type-definitions.service.ts:102,162` (both post-`writeTextFile`). `'frontmatter'` (dirty-aware
  write of the frontmatter block only, `markSaved=false`, wants the 500 ms timer):
  `properties.service.ts:50`, `lifecycle.service.ts:20`. No site takes `'body'` - the body timer
  stays exclusive to `onContentChange`, which is what the parameter's third arm documents rather
  than what any current caller needs.
- **`'none'` does not cancel.** `scheduleAutoSave('none')` arms nothing and cancels nothing, so a
  save a keystroke already scheduled still fires - covered by
  `editor.service.autosave-schedule.test.ts` (`'none' does not cancel a save a keystroke already
  scheduled`). Cancelling there would have silently dropped a pending user edit.
- **External-edit flag, same shape as `isTabSwitching`.** `MarkdownEditor.svelte:36` declares
  `isExternalEdit`, sets it around the `view.dispatch` at :395-406, and passes `() => isExternalEdit`
  into `createExtensions` at :198 - byte-for-byte the `isTabSwitching` pattern already at
  :35,197,299,309 (a module-scoped boolean plus a getter consumed by the `updateListener` guard),
  not a second style. `editor-extensions.ts:113` extends the existing guard with
  `&& !opts.isExternalEdit()`. Covered by a real-`EditorView` test in `editor-extensions.test.ts`
  (jsdom): a user dispatch reports once, the flagged external dispatch does not report again. Without
  this flag the explicit `schedule` would be double-armed on the active tab - the doc replace would
  re-enter `onContentChange`, which infers `frontmatter` vs `body` from whether the PREVIOUS
  document had frontmatter.

**`restoreSnapshot` audit (`file-history.service.ts:82-105`) - findings, no code change:**

- Confirmed scope: it takes no position argument, so it is not an arch 2.2 caller and was not
  converted. It was also left alone here on purpose - it does not call
  `syncExternalContentToEditor` at all.
- The silent no-op is real and worse than "the editor does not update". With `editorStore.editorView`
  null the `view.dispatch` guarded at :91-95 is skipped, so nothing writes the restored content into
  `editorStore`. Execution then falls through to `await saveCurrentFile()` (:99), which reads
  `editorStore.activeTab` -> `saveFileByPath` (`editor.service.ts:122-126,132-136`) and writes
  `tab.content` - the UNRESTORED content, or nothing at all when the tab is clean
  (`isTabDirty` short-circuit at :134). `fileHistoryStore.reset()` then runs on the success path and
  the panel closes as if the restore had happened. No toast, no throw, no log.
- It is also path-blind: the dispatch targets whatever `editorStore.editorView` currently is, while
  `filePath` comes from `fileHistoryStore.filePath`. If the history panel is showing a file that is
  not the active tab, the restore writes into the wrong document.
- Not fixed here (out of this issue's `## How`). The natural fix is to route it through
  `syncExternalContentToEditor(filePath, restoredContent, false, 'frontmatter' | 'body')`, which is
  path-addressed, updates the store whether or not a view is mounted, and now carries an explicit
  schedule - i.e. this issue makes the fix possible but does not perform it.

**Discrepancies vs the issue text:**

- The issue says "add an **external-edit annotation**". No CodeMirror `Annotation` was created: the
  same sentence pins the shape to `isTabSwitching`, and `isTabSwitching` is a suppression flag read
  by the `updateListener`, not a `Transaction` annotation. The flag reading was taken as binding
  ("do not invent a second annotation style"). The pre-existing
  `Transaction.addToHistory.of(false)` on the same dispatch is untouched.
- `markSaved` losing its `= true` default is not named in the issue. It is a one-word consequence of
  the same "explicit, not inferred" goal, it makes the two booleans-plus-schedule call shape
  unambiguous, and the compiler enforced the sweep - the four `deep-link.service.ts` sites that were
  relying on the default now pass `true` literally, with identical behavior.

**Minor findings for follow-up (none blocking):**

- minor - `properties.service.test.ts` needed a file-wide `vi.useFakeTimers()` + `resetEditor()`
  in `beforeEach`/`afterEach` (:37-51): property edits now arm a REAL auto-save timer, and
  `editorStore.reset()` does not cancel debounced saves - only `resetEditor`
  (`editor.service.ts:398-403`) does. Any other suite that drives a service which arms an auto-save
  timer has the same latent cross-test leak; worth a sweep.
- minor - no caller passes `'body'`. The arm exists for symmetry with `onContentChange` and for
  future external writers that touch the note body. If none appears, the type could shrink to
  `'frontmatter' | 'none'` later.
- minor - `editor-extensions.test.ts` now needs `// @vitest-environment jsdom` because the new case
  mounts a real `EditorView`. The rest of that file is environment-free; if more DOM cases land, it
  may be worth splitting the DOM suite out rather than making the whole file jsdom.
