# 103: A meta-bind button stops its remaining actions when an open action fails

**Migrated from:** `.scratch/audit-2026-11-04/issues/10-metabind-open-failure-stops-actions.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). Low: it needs a button whose open action fails. It goes first in the shared action switch that Issue 48 changes next.

**Audit check at `5f8003d67`:** still_present (content, low). The open case awaits followWikilinkInfo and breaks out of the switch, so executeButtonAction returns true whatever happened (src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:103-120). followWikilink returns void and ignores host.createNote's boolean (wikilink-navigation.ts:17-22); followWikilinkInfo returns void and swallows errors (:45-66). The click loop stops only on false (meta-bind-button-widget.ts:37-39).

**Stale in the text below:** The open case is now at meta-bind-button-widget.ts:103-120 (Issue says :101-111); it also gained refuseOpen for empty, non-wikilink and unsafe links, which already return false. Overlaps Issue 48 (same open/updateMetadata sequence); land them together or in order.

**What to build:** A button with [open [[Missing]], updateMetadata status=done] whose open target fails (create error, unreadable file) no longer writes status=done into the button's own note. The remaining actions stop, as the executeButtonAction docstring already promises for createNote. Fix: followWikilink in src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts returns whether a note opened (it propagates host.createNote's boolean, and openLink success). followWikilinkInfo returns that result. The open case in meta-bind-button-widget.ts:101-111 returns false on failure.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, added on 2026-11-06 because first-wave Issue 104 is blocked by it.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: in src/tests/lib/core/markdown-editor/editor-host.test.ts style (fake EditorHost, an allowed boundary mock), doc with frontmatter `status: todo`, host.resolveLink returns null and host.createNote resolves false, button actions [open '[[Missing]]', updateMetadata status=done]. After the click, view.state.doc still contains `status: todo`. It fails today.
- [ ] Test: a successful open followed by updateMetadata still runs the second action.
- [ ] Existing followWikilinkClick callers keep working (their return value is ignored).
- [ ] Frontend gate green.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 1 of the parallel plan.
- **Finding `metabind-shared-view`:** not-real. The claimed corruption (A's doc copied into tab B) needs the shared EditorView to still hold A while activeIndex already points at B. The tab-switch write is synchronous and the MarkdownEditor doc replace is synchronous. Svelte flushes it in a microtask queued at the state write, which runs before the awaited continuation of the button loop, so updateMetadata dispatches into B's own state. Adjacent real defect, low severity: an `open` action whose target fails to open or create still returns true, so the next updateMetadata writes into the button's own note.
- **Open question D9, not part of this ticket: after a successful `open`, `updateMetadata` writes into the newly opened note because the EditorView is shared. Should it always target the button's own note (Meta Bind behaviour)? If yes, that is a separate ticket.**
- Adjacent defect found while refuting metabind-shared-view. The audit's claimed cross-tab corruption is not real (synchronous tab switch plus microtask flush ordering). openLink (app/editor-host.ts:105-108) returns void and openFileInEditor swallows read errors, so reporting open failure may need openFileInEditor to return a boolean. Keep the change minimal.
- **Size:** S.

## Comments

- 2026-11-06: migrated from `.scratch/audit-2026-11-04/issues/10-metabind-open-failure-stops-actions.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
