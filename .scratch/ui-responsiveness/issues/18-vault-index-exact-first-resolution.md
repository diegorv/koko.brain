# 18: Rust `VaultIndex` resolves a target with an extension to the file it names

**Status:** resolved

Priority: P3 (correctness; backlinks and outgoing links disagree with the editor)

**What to build:** Issue 16 made the TS resolvers (`resolveWikilink` / `resolveWikilinkCached`, `src/lib/core/filesystem/wikilink-resolution.logic.ts`) try the exact file first for a target with an extension, then fall back to the note-name rule. Rust `resolve_with_cache` (`src-tauri/src/vault/index.rs`) still keys only on the extension-stripped note name. A path-style `[[a/foo.md]]` among notes with the same name now opens `/vault/a/foo.md` in the editor, while backlinks and outgoing links (Rust) can credit the first `foo.md`; `![[foo.png]]` with `foo.md` earlier in the tree is credited to `foo.md`. Apply the same exact-first rule to `VaultIndex`, then the e2e mock `e2e/mocks/vault-index.ts` (which reuses the TS cache) matches Rust again.

**Blocked by:** 16, 17

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` (+ the frontend gate if a DTO changes)

**Source:** review finding 2 of Issue 16 (`.scratch/ui-responsiveness/work/16/review.md`, kept in git history after delivery)

- [x] Failing first: a Rust test where `[[foo.png]]` with `a/foo.md` before `b/foo.png` credits `b/foo.png`
- [x] Bare `[[foo]]` still credits `foo.md`; existing index tests stay green
- [x] Failing first: a Rust test where `[[b/foo.png]]` with `x/b/foo.png` before `b/foo.png` credits `b/foo.png`
- [x] The Rust doc comment on `resolve_with_cache` still describes the TS mirror correctly

## Notes

- Mirror the final TS rule, including Issue 17's step: a path-style target tries the exact vault-relative path first, then the suffix match, then the note-name rule. Blocked by 17 so Rust copies the rule once, after the TS side settles.

## Comments

- 2026-11-03, branch `issue/18-vault-index-exact-first-resolution`: Rust `VaultIndex` resolution now tries the exact vault-relative path first for targets with an extension or path, then suffix, then note name (mirrors TS). Review round 1 fixes: doc comments on `rename_note_inner`, `get_outgoing_links_v2` and `OutgoingLink.resolved_path` (regenerated binding), e2e mock passes the vault root, retro scan in `update_entry` filters with `any()` first. Tests: cargo test exit 0 (1262 passed, 4 ignored), clippy clean, pnpm check clean, full suite at 366dca9f exit 0 (10364 passed). Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
