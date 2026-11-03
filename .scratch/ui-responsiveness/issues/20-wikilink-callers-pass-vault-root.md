# 20: Every TS wikilink resolver caller passes the vault root

**Status:** ready-for-agent

Priority: P3 (correctness, rare: needs two files with the same name under folders whose trailing segments match)

**What to build:** Issue 17 gave `resolveWikilink` / `resolveWikilinkCached` (`src/lib/core/filesystem/wikilink-resolution.logic.ts`) an optional `vaultRoot`, so a path-style target with an extension (`[[b/foo.png]]`, `[[folder/note.md]]`) tries the exact vault-relative path before the path-suffix match. Only the editor host (`src/lib/app/editor-host.ts`) passes it. The other callers still pick the first suffix match, so with `/vault/x/b/foo.png` before `/vault/b/foo.png` an editor click opens `/vault/b/foo.png` while these resolve to `/vault/x/b/foo.png`:

- `src/lib/plugins/queryjs/queryjs.logic.ts` (`outlinks`)
- `src/lib/plugins/graph-view/graph-view.logic.ts`
- `src/lib/plugins/kanban/kanban.service.ts` (linked cards)
- `src/lib/features/rail-shell/lens.logic.ts` (two call sites)
- `src/lib/features/note-list/NoteRow.svelte` (pills)
- `src/lib/core/frontmatter/properties.logic.ts` (property wikilinks)

Fix: thread `vaultStore.path` (or the vault path the caller already has) into each call. `.logic.ts` callers take it as a parameter; they must not import the store.

**Blocked by:** 17

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** review finding 1 of Issue 17 (`.scratch/ui-responsiveness/work/17/review.md`, kept in git history after delivery)

- [ ] Failing first: for each caller above, a test with `/vault/x/b/foo.png` before `/vault/b/foo.png` where `[[b/foo.png]]` resolves to `/vault/b/foo.png`
- [ ] No `.logic.ts` file gains a store import

## Notes

- Triage (2026-11-03): applies the owner's Issue 17 decision (exact vault-relative path first, suffix match as fallback) to the remaining TS callers; no new decision needed.
- Issue 18 applies the same rule to the Rust `VaultIndex`; this Issue covers only the TS callers.
