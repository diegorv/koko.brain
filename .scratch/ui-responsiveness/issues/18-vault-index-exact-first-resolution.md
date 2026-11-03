# 18: Rust `VaultIndex` resolves a target with an extension to the file it names

**Status:** needs-triage

Priority: P3 (correctness; backlinks and outgoing links disagree with the editor)

**What to build:** Issue 16 made the TS resolvers (`resolveWikilink` / `resolveWikilinkCached`, `src/lib/core/filesystem/wikilink-resolution.logic.ts`) try the exact file first for a target with an extension, then fall back to the note-name rule. Rust `resolve_with_cache` (`src-tauri/src/vault/index.rs`) still keys only on the extension-stripped note name. A path-style `[[a/foo.md]]` among notes with the same name now opens `/vault/a/foo.md` in the editor, while backlinks and outgoing links (Rust) can credit the first `foo.md`; `![[foo.png]]` with `foo.md` earlier in the tree is credited to `foo.md`. Apply the same exact-first rule to `VaultIndex`, then the e2e mock `e2e/mocks/vault-index.ts` (which reuses the TS cache) matches Rust again.

**Blocked by:** 16

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` (+ the frontend gate if a DTO changes)

**Source:** review finding 2 of Issue 16 (`.scratch/ui-responsiveness/work/16/review.md`, kept in git history after delivery)

- [ ] Failing first: a Rust test where `[[foo.png]]` with `a/foo.md` before `b/foo.png` credits `b/foo.png`
- [ ] Bare `[[foo]]` still credits `foo.md`; existing index tests stay green
- [ ] The Rust doc comment on `resolve_with_cache` still describes the TS mirror correctly

## Notes
