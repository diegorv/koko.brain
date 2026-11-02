VERDICT: APPROVED

Review of `git diff main...HEAD` (60a3f41d, f45056f0, d84907bd) against Issue 46.

## Acceptance criteria

- [met] Failing test comes first. Move the `F105` and `F105 escalation` describes of `.scratch/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts` under `src/tests/` (into `image-widget.test.ts` or next to it, fixing the `test-helpers` import path) and see them fail — Both describes now live in `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/image-widget.test.ts:95-140` and import from `../../../test-helpers`. They are removed from the repro file, along with its now-unused imports. I put main's `widgets.ts` and `MarkdownEditor.svelte` back into the worktree and ran both test files: the 3 F105 tests and the 3 new component tests fail (6 failed, 12 passed). I then restored HEAD, and `git status` is clean.
- [met] `new ImageWidget('file:///Users/me/100%.png', 'shot').toDOM(view)` does not throw and leaves `img.src` empty; a well-encoded URL such as `file:///Users/me/CleanShot%202026.png` still reaches `host.assetUrl` with the decoded path — `widgets.ts:117-122` catches the `decodeURIComponent` throw and returns `null`. The test at `image-widget.test.ts:99-106` checks no throw, `getAttribute('src') === null` and that `assetUrl` was not called. The existing test "routes file:// URLs through host.assetUrl with the decoded fs path" (`image-widget.test.ts:40-52`, `CleanShot%202026-05-19%20at...`) still passes.
- [met] A view mounted on a note holding that image, through the real `imagePlugin`, renders the rest of the note — `image-widget.test.ts:108-120` mounts the note with `testMarkdown()` and `imagePlugin` and checks that `contentDOM.textContent` contains both `intro` and `text`. It passes.
- [met] A component test in MarkdownEditor.test.ts: with a widget whose `toDOM` throws during the tab-switch dispatch (for example a `host.assetUrl` that throws, with a `file://` image in the target note), typing after the switch still updates `editorStore` and marks the tab dirty — `MarkdownEditor.test.ts:192-202` mounts the real component on a host whose `assetUrl` throws on its first call, switches to a note with a `file://` image and types. It checks `activeTab.content === IMAGE_DOC + '!'` and `isTabDirty`. It fails on main and passes on HEAD. The test's thrower fires only once, so see finding 1 for a thrower that fires every time.
- [met] The same holds for a throw during the external-content dispatch (`syncExternalContentToEditor` into the active tab): later typing still reaches `editorStore` — `MarkdownEditor.test.ts:204-216` calls the real `syncExternalContentToEditor(PATH, IMAGE_DOC, true, 'none')`, then types. Store content and dirty state are checked. It fails on main and passes on HEAD.
- [met] After a widget throws during a tab switch, a second tab switch shows the right note in both `view.state.doc` and the rendered DOM, no `TypeError` follows, and edits land only in that tab — `MarkdownEditor.test.ts:218-233` checks the doc and `contentDOM.textContent` of the third note, then types. It checks that the typed text lands only in the third tab, that the other two tabs are unchanged, and that no `TypeError` was logged. It fails on main and passes on HEAD. My probe (finding 1) shows this also recovers after a thrower that fires every time.
- [met] Existing ImageWidget and MarkdownEditor tests still pass — I ran `pnpm vitest run` on `MarkdownEditor.test.ts` and `image-widget.test.ts`: 2 files, 18/18 pass, exit 0. Deliver runs the full suite.

## Findings

1. **major**: `src/lib/core/markdown-editor/MarkdownEditor.svelte:88-92`. A widget that throws on every render is not recovered. The view is left showing the previous note's text under the new tab, and typing in that tab is silently dropped.
   - I probed with a temporary component test (now deleted) where `host.assetUrl` always throws:
     - After the switch, `view.state.doc` is the image note but `contentDOM.textContent` is still `"first"` (the old note).
     - Typing throws `TypeError: Cannot destructure property 'tile' of 'parents.pop(...)'`. `editorStore` keeps the old content and the tab never turns dirty.
     - The same happens after `syncExternalContentToEditor`.
     - Switching to another tab recovers fully: the second `replaceDoc` takes the catch path and its `setState` succeeds.
   - So the session-wide P0 is fixed: the flags reset and other tabs save. But inside the offending tab, this is exactly the doc/DOM desync the Issue says a bare `try/finally` leaves.
   - The tests pass only because their thrower fires once (`MarkdownEditor.test.ts:153`). The Issue's own example in criterion 4 ("a `host.assetUrl` that throws") would naturally throw every time.
   - The discovery note says the component tests "exercise a persistent thrower", but they do not.
   - No user-visible signal appears either: `error()` logs to the console and Sentry, but CLAUDE.md asks for a toast or an inline state on user-facing errors.
   - Fix: this needs an owner decision, so it should not be patched blindly in deliver. Options are a fallback after the second throw (for example, rebuild with the live-preview block decorators disabled or in source mode) and/or a toast saying the note could not be rendered. Record it as a follow-up `.scratch` Issue.
2. **minor**: `src/lib/core/markdown-editor/MarkdownEditor.svelte:70-73`. The `replaceDoc` JSDoc says "On a throw the view is rebuilt". It does not say that a throw from the rebuild is only logged and leaves the view desynced. Fix: add one clause naming that limit, so the next reader does not assume the view is always consistent after `replaceDoc`.
3. **nit**: `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts:195,210,220`. The tests show the catch path ran only indirectly, through `assetUrlCalls > 1`. Fix: optionally also assert that `consoleError` received the `doc replace threw` log, so a future change that hides the throw some other way is caught.
4. **nit**: `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts:235`. The diff adds a blank line at EOF (`git diff main...HEAD --check` flags it). Fix: drop the trailing empty line.

## Other checks

- Typecheck: `pnpm check` exits 0 (212 files, 0 errors, 0 warnings).
- Test verdict rests on `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts` and `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/image-widget.test.ts`. I ran both on HEAD (18/18 pass) and against main's source (the 6 new tests fail). I also ran a temporary probe for finding 1, now deleted.
- Rebuild correctness: after a throwing `dispatch`, `spec()` recomputes `to` from the current `v.state`. So the replace is correct whether CodeMirror committed the new state or not, and re-applying the compartment `effects` is idempotent. `setState` keeps `editorStore.editorView` (same view object). The only `updateListener` in `src/lib` is the gated one in `editor-extensions.ts:170`, so no other listener misses the `setState` rebuild.
- The rest of the tab-switch effect (focus, rAF rebuild, `lastTabPath = path`) runs after `replaceDoc`, because `replaceDoc` does not rethrow.
- Scope: no creep. The change to `.scratch/editor-data-safety/repro/...` is the move the Issue asks for. No layer-baseline, `BASELINE_SIZE` or composition-root change. No `src-tauri/` change.
- The full suite and `pnpm build` were not run here; they are deliver's.

## Resolution

1. Accepted as correct, not patched here: the fallback (rebuild without block decorators or in source mode) and/or a toast is an owner decision, as the finding says. Recorded as follow-up `.scratch/file-io-audit/issues/55-persistent-widget-throw-desyncs-tab.md` (needs-triage). The session-wide P0 this Issue covers stays fixed.
2. Fixed: the `replaceDoc` JSDoc now says a throw from the rebuild is only logged and leaves the view desynced until the next replace that renders.
3. Fixed: the three component tests also assert that `console.error` received the `doc replace threw, rebuilding the view:` log (`loggedDocReplaceThrow()`).
4. Fixed: the trailing blank line at EOF of `MarkdownEditor.test.ts` is removed.
