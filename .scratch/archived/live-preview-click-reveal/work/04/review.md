VERDICT: APPROVED

## Acceptance criteria

- [met] `table-cell-controls.spec.ts` "clicking a wikilink inside a table cell follows it and the source note keeps its table" passes with `test.fail()` removed — the diff removes `test.fail()` and its known-bug comment (e2e/specs/live-preview/click-reveal/table-cell-controls.spec.ts:30-31). I ran `bash scripts/e2e.sh` on that spec: the test passes (Chromium), along with the other two tests in the file. Cause and fix: `resolveWikilinkClickPosition` now returns null for any press inside `.cm-lp-table-wrapper` (src/lib/core/markdown-editor/wikilink-click-target.ts:63), so `handleEditorClick` (MarkdownEditor.svelte:252-253) returns before `stopImmediatePropagation` and the cell's own mousedown handler runs.
- [met] A wikilink to a missing note inside a cell behaves like one outside a table (the create-on-click path) — the cell handler now calls `followWikilinkInfo` (widgets.ts:313), and that function falls through to `followWikilink`, which calls `host.createNote(target, anchor)` when `resolveLink` returns null (wikilink-navigation.ts:17-22). This is the same path a link outside a table takes through `followWikilinkClick`. Unit test: table-widget.test.ts "a link to a missing note creates it (the create-on-click path)" asserts `createNote('Missing', {heading:null, blockId:null})` and that `openLink` is not called. In E2E, `[[Other]]` in table-cell-controls.spec.ts has no note, and the spec polls until `Other.md` exists, so the real create path is exercised.
- [met] Wikilink clicks outside tables keep working (`wikilink.spec.ts` in the folder, `wikilink-navigation.spec.ts`, `wikilink-create-on-click.spec.ts`) — I ran all three with `bash scripts/e2e.sh`: click-reveal/wikilink.spec.ts 2/2, wikilink-navigation.spec.ts 2/2, wikilink-create-on-click.spec.ts 1/1, all passing. I also ran wikilink-anchors.spec.ts (3/3 pass). `followWikilinkClick` still has the same behaviour: it parses the line at `pos` and passes the result to the extracted `followWikilinkInfo`, which keeps the old same-note jump and anchor logic unchanged. src/tests/lib/core/markdown-editor/editor-host.test.ts covers it and passes.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- vitest, exit 0, 11 files / 198 tests. Files: src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts, src/tests/lib/core/markdown-editor/wikilink-click-capture.test.ts, src/tests/lib/core/markdown-editor/editor-host.test.ts, src/tests/lib/app/editor-host.test.ts, src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/*.test.ts, src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-input-widgets.test.ts.
- Red check: I restored the three changed source files from `main` (`git show main:<file>`) and re-ran table-widget.test.ts and wikilink-click-capture.test.ts. All 9 new or changed tests failed: both "inside a table widget" cases, plus the anchor, missing-note, alias, same-note and plain/Ctrl cases. I then restored the files with `git checkout HEAD -- src/lib`, and the worktree was clean again.
- E2E (`bash scripts/e2e.sh`, Chromium) on click-reveal/table-cell-controls, table-add-buttons, table, wikilink, plus wikilink-navigation, wikilink-create-on-click and wikilink-anchors: 20 passed. The two `✘` lines in table.spec.ts ("bottom-right corner", "20px right of the line box") are pre-existing `test.fail()` known bugs that still fail as expected. They do not count as failures.
- The Issue's full gate (`pnpm vitest run`, `pnpm build`, all of e2e/specs/live-preview) is for deliver to run. I did not run it.
- Layer rules: no new imports across layers, and the baseline is not touched.

## Findings

1. nit — src/lib/core/markdown-editor/wikilink-click-target.ts:31: the `.cm-lp-table-wrapper` class string is repeated here and in `TableWidget.toDOM` (widgets.ts:350), with nothing tying the two together. If the widget's class is renamed, the bypass stops working without any error. The unit test hard-codes the same class, so it would keep passing. Only the E2E spec would catch the rename. Fix (optional): export the class name as a constant from one place and use it in both.
2. nit — src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:310-313: the click handler parses `match[0]` a second time with `findWikilinkInfoAtPosition(source, 0, 0)`, even though the loop has already captured the target, heading and alias groups. The re-parse is correct, and its comment explains why it runs at click time. Building the `WikilinkInfo` from `match[1]` and `match[2]` would remove both the second regex pass and the comment. Optional.
3. nit (pre-existing, out of scope) — an escaped table pipe in a cell link, `[[Target\|Alias]]`, gives the target `Target\` both before and after this branch, because the cell parser does not unescape `\|`. The branch does not make this worse. Note it for a follow-up if the owner uses aliased links in tables.

No blockers. The scope matches the Issue: the split into `followWikilinkInfo` follows the Issue's Notes on the anchor case inside a cell. A Cmd/Ctrl press on plain cell text no longer scans the table's header line, so it can no longer open a wrong link that happens to sit in the header. A test covers this.

## Resolution

1. Fixed. `wikilink-click-target.ts` exports `TABLE_WIDGET_CLASS`; `TableWidget.toDOM` sets the wrapper class from it and the resolver builds its selector from it. A new table-widget.test.ts case presses the real widget's cell link and asserts `resolveWikilinkClickPosition` returns null; renaming the widget class makes it fail (checked).
2. Rejected. Building the `WikilinkInfo` from `match[1]` / `match[2]` would copy the `#^block` vs `#heading` split that `findWikilinkInfoAtPosition` owns. The click-time re-parse keeps one parser; the cost is one regex run per click.
3. Not changed: pre-existing and out of this Issue's scope, as the review says.
