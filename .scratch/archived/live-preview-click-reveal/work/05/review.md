VERDICT: APPROVED

## Acceptance criteria

- [met] `wikilink-note-embed.spec.ts` "header click opens the embedded note" passes with `test.fail()` removed — the diff drops `test.fail()` and its known-bug comment (e2e/specs/live-preview/click-reveal/wikilink-note-embed.spec.ts:67); I ran `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/wikilink-note-embed.spec.ts e2e/specs/embed-widgets.spec.ts`: exit 0, 7/7 passed, including "header click opens the embedded note".
- [met] The header's mousedown stops propagation (CLAUDE.md Live Preview rule 11), so the click does not move the cursor into the embed or reveal it — widgets.ts:640-646 calls `preventDefault()` + `stopPropagation()` on a primary-button press; editor-host.test.ts "stops the mousedown so CodeMirror does not move the cursor into the embed" asserts `defaultPrevented` and that a parent listener never sees the event. Also, `WikilinkNoteEmbedWidget.ignoreEvent()` returns true, so CodeMirror ignores the press either way. The other click-reveal tests in the same spec (body click, blank bands) still pass.
- [met] Failing first: an existing note embed opens that note's tab — editor-host.test.ts "opens an existing note through the host, with its anchor" asserts `host.openLink('/vault/Note.md', { heading: 'Part', blockId: null })`. I restored main's widgets.ts and ran the test file: the 3 new behavior tests failed (exit 1, 3 failed / 21 passed). With the branch's widgets.ts back: 24/24 pass.

## Findings

1. minor — e2e/specs/live-preview/click-reveal/wikilink-note-embed.spec.ts:67 — The Issue's "What to build" says the header click "keeps the embed rendered", but no test checks the source note after the click. The E2E only checks that the new tab is active, and the unit test only checks that the event stopped propagating. Going by the code it holds: the widget is untouched, `ignoreEvent()` is true and the press is stopped. Fix (optional): in the E2E, after the tab switch, go back to the source tab and assert that `.cm-lp-embed` has count 1 and `isRevealed(page, RAW_EMBED)` is false.
2. nit — src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:637-639 — The comment says stopping the press is what keeps CodeMirror from moving the cursor onto the embed line. But `ignoreEvent()` returning true (widgets.ts, same class) already makes CodeMirror skip events from the widget, so the stop is the rule-11 safeguard and not the only guard. Fix (optional): word the comment as "also stopped (rule 11)" so a later reader does not think the stop is load-bearing on its own.
3. nit — Not covered by any test: a Cmd/Ctrl+click on the header. I traced it: `MarkdownEditor.svelte` `handleEditorClick` (capture phase) either resolves the `![[...]]` line by coords and calls `stopImmediatePropagation` (one open, from the capture handler), or returns null and the header listener opens it. Neither path opens the note twice. No change needed.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/editor-host.test.ts`: exit 0, 24/24 (the only unit test file that names `WikilinkNoteEmbedWidget` or `.cm-lp-embed-header`).
- Failing-first probe: same file against main's widgets.ts, 3 failed. Restored afterwards; worktree clean.
- `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/wikilink-note-embed.spec.ts e2e/specs/embed-widgets.spec.ts`: exit 0, 7/7 (Chromium).
- My test verdict rests on these test files: src/tests/lib/core/markdown-editor/editor-host.test.ts, e2e/specs/live-preview/click-reveal/wikilink-note-embed.spec.ts, e2e/specs/embed-widgets.spec.ts.
- Not run (deliver's job): the full `pnpm vitest run`, `pnpm build`, and the full Issue E2E gate over all of `e2e/specs/live-preview`.
- Scope: the diff touches only widgets.ts, its test, the E2E spec and the work/05 discovery file. Nothing touches the layer baseline, BASELINE_SIZE or the composition roots, and nothing under src-tauri/.

## Resolution

1. Fixed: the E2E "header click opens the embedded note" now switches back to the `test.md` tab and asserts `.cm-lp-embed` has count 1 and `![[Missing` is not revealed (passes, 5/5 in the spec).
2. Fixed: the comment on the header mousedown now says `ignoreEvent()` already keeps CodeMirror from moving the cursor and the stop is the rule-11 safeguard.
3. No change: the reviewer traced Cmd/Ctrl+click and found no double open; agreed.
