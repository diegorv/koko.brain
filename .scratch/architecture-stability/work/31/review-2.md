VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | editor-host.test.ts "meta-bind button actions go through the host" renders a real `MetaBindButtonWidget` over a fake host and clicks it: wikilink -> `resolveLink('Note')` + `openLink('/vault/Note.md')`, unresolved -> nothing opened, http -> `openExternal`, unsafe scheme -> nothing, createNote -> `('Folder/Name', undefined, { periodic: false })` and the bare name, failed create stops the next action, successful create runs it. Each would fail against a broken action (e.g. returning `true` after a failed create calls `openLink`). |
| 2 | minor | resolved | (a) meta-bind-button-widget.ts:110 passes `{ periodic: false }`; app/editor-host.ts:84 skips `periodicTarget` then; app/editor-host.test.ts "createNote with periodic: false creates a daily-note name at the vault root" asserts `/vault/2026-11-01.md`. (b) `createNote` resolves `false` on no vault / failure (editor-host.ts:83, :97) and the action returns it, so the click loop breaks as on main (main broke via the rejection). Wikilink callers (wikilink-navigation.ts:21) ignore the boolean and keep the periodic redirect. The dotted-name `.md` and title delta remains (new finding 1). |
| 3 | minor | resolved | KanbanViewHarness.svelte forwards `onOpenWikilink`; KanbanView.test.ts "card wikilinks" clicks the `Target Note` button and asserts the spy got `'Target Note'`. TasksView still has only e2e coverage (tasks-view.spec.ts:104), as recorded. |
| 4 | minor | still open (delivery step) | Nothing for the branch to change; deliver must put the LP-PROFILE table into the closing comment / squash body. The in-app 6000-line run is still not recorded. Not a blocker. |
| 5 | nit | rejection stands | The tag-colors effect predates the branch; the AC (no `reconfigured`) holds. Follow-up Issue. |
| 6 | nit | resolved | docs/LIVE-PREVIEW.md:231 now names `livePreviewExtensions(disabledDecorators)` and the caller-passed map. |
| 7 | nit | rejection stands | Matches the Issue text; no change. |
| 8 | nit | rejection stands | Process only; no code change. |

## Acceptance criteria re-checked

- [met] A test written first builds an EditorView with a fake host and asserts that wikilink click, embed resolution, image asset URL and completion candidates all go through the host — the fixes extend editor-host.test.ts (fake host's `createNote` now resolves `true`); the existing click, embed, image and completion tests still pass (run below).
- [met] An unresolved `[[2026-11-01]]` (with the daily format) opens or creates the daily note in its folder through `host.createNote`, through both the click path and the table-cell path — the `periodic` option defaults to true, wikilink-navigation.ts:21 passes no options, and app/editor-host.test.ts daily-note tests plus editor-host.test.ts:94 and :135 still pass.
- [met] Counters on every host method show zero calls during StateField compute on a docChanged transaction — the fix only changes the click handler of the meta-bind button; the "a docChanged transaction calls no host method" test still passes.
- [not met] The E2E specs wikilink-navigation, wikilink-create-on-click, embed-widgets and live-preview/* pass — not run by this re-review; deliver's `bash scripts/e2e.sh` decides it.
- [met] LP-PROFILE per-plugin numbers on a 6000-line note are recorded before and after in the commit message (5 runs each, every block decorator plus the inline plugin, median compared); no plugin's median regresses by more than 10% — the table is in 871e18c8 as round 1 recorded; the fixes touch no decorator compute path. Deliver must carry the table into the squash (finding 4 above).

## Findings

1. **nit**, src/lib/app/editor-host.ts:89-92: the meta-bind `createNote` still differs from main in two small ways the fix report calls "main's behaviour is back": a dotted `fileName` (`v1.2`) now gets `.md` appended (main's `resolveFilePath` skipped it, creating an extensionless file), and the title is the basename without `.md` instead of the raw `fileName`. Both look like improvements, not regressions. Fix: none needed; optionally add a meta-bind-path test for a dotted name so the choice is pinned.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/editor-host.test.ts src/tests/lib/app/editor-host.test.ts src/tests/lib/plugins/kanban src/tests/lib/core/markdown-editor/extensions/live-preview src/tests/lib/app/EditorView.test.ts src/tests/lib/core/markdown-editor/setup`: exit 0, 102 files, 1672 passed, 1 skipped.
- No test was weakened or deleted: the three changed app/editor-host.test.ts assertions tighten `resolves.toBeUndefined()` / bare awaits to `resolves.toBe(true|false)`.
- Scope: the fix commit touches only the files of findings 1-3 and 6 plus the review file. No baseline entry, BASELINE_SIZE or composition-root change.
- Not run: full suite, `pnpm build`, E2E (deliver's).
