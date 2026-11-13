# 15: Rename rewrites only links that resolve to the renamed note, and keeps them resolving to it

**What to build:** When a user renames A/Old.md to A/Other.md while B/Other.md exists, backlinks keep pointing at A/Other, not B/Other. When a source links both [[A/Old.md]] and a bare [[Old]] that resolves to B/Old, only the link to A/Old changes. Fix in link-updater: before rewriting, resolve each wikilink in the source against the pre-rename vault path list with the shared resolver (buildResolutionCache + resolveWikilinkCached, wikilink-resolution.logic.ts, which mirrors Rust resolve_with_cache). Rewrite only the links that resolve to oldPath. Choose the new target text so it resolves to newPath against the post-rename path list: bare [[Other]] when the new stem is unique, otherwise the vault-relative path with extension, e.g. [[A/Other.md]]. The path list comes from the existing source (fsStore tree or vault entries) read before rename_note runs. Keep the rewrite ahead of rename_note (path-change.service.ts:179-186).

**Blocked by:** 04

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing test first: in link-updater.logic.test.ts (real resolver, no mocks), a rewrite for oldPath '/v/A/Old.md' -> '/v/A/Other.md' with vault paths ['/v/B/Other.md', '/v/A/Old.md'] produces a target that resolveWikilinkCached resolves to '/v/A/Other.md' against the post-rename list. Today the bare '[[Other]]' resolves to '/v/B/Other.md'.
- [x] Content '[[A/Old.md]] and [[Old]]', with bare 'old' resolving to '/v/B/Old.md', becomes a rewrite of the first link only. The second stays '[[Old]]'.
- [x] When the new stem is unique, the output is the bare form (no regression for the common case, and the existing link-updater tests stay green).
- [x] A service test (invoke and plugin-fs mocked, real fsStore and editorStore) covers the collision end to end through updateLinksAfterRename.
- [x] Rust/TS parity: the [[A/Other.md]] form resolves to the same path in Rust (cargo test next to rename_note_inner: after the re-key, idx.resolve(form) == '/v/A/Other.md').
- [x] The gate matches the change: frontend, plus cargo test if the Rust resolver changes.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 2 of the parallel plan.
- **Finding `link-bare-ambiguous`:** real, low. Root cause: The rewrite is name-based, not resolution-based. It always writes a bare [[newName]], and it rewrites every bare [[oldName]] in a source even when that link resolved to a different note. Bare resolution is first-path-wins in both the Rust and TS resolvers. A note renamed into a stem another note already owns therefore takes its backlinks to that other note. Also, a path form without an extension never disambiguates (basename fallback); only [[A/Other.md]] resolves exactly.
  Evidence: link-updater.logic.ts:30 builds '[[' + newName with no path. index.rs:511 update_entry does by_path.entry(key).or_insert_with: B/Other already holds 'other', so after rename_note (vault.rs:1122-1124) a bare [[Other]] resolves to B/Other. wikilink-resolution.logic.ts:91-97 buildResolutionCache is first-wins too, and :122-126 shows a path-qualified target without an extension falls back to the basename. The second scenario holds only when the source has [[A/Old.md]] (an exact hit, findExactFile :31-38) alongside a bare [[Old]] that resolves to B/Old. The source is then a backlink of A/Old, and line 27 rewrites the B/Old link too. Only that path is reachable. The skeptic's 'not reachable' covers the extensionless form only.
- **Blocking edge:** Both rewrite replaceWikilinks and its tests.
- **Owner decision (2026-11-04):** D4 (a): when the new stem collides with another note, write the vault-relative path with extension, e.g. `[[A/Other.md]]`. No resolver change.
- Blocked by Issue 04 because both rewrite replaceWikilinks and its tests. link-move-folder was judged not-real: the basename fallback keeps moved links resolving. The residual case it leaves (a pure move of a note linked as [[A/Note.md]] whose stem is shared, which loses its exact match) is the same root cause. Whoever implements this can extend the resolution-aware pass to same-stem moves if the owner wants it, but it is not required here.
- **Size:** M.

## Comments

- 2026-11-05, branch `issue/15-resolution-aware-link-rewrite`: rename now rewrites only wikilinks that resolve to the renamed note (checked with the real resolver against the pre-rename tree), and writes the vault-relative path form (`[[A/Other.md]]`) when the new stem collides with another note; bare form otherwise. Review 1 fixes: doc comment names the root-level limit, a logic test pins it, follow-up Issue 20 opened; `updateLinksAfterRename` doc states the tree-order dependence. Tests: pnpm check 0 errors; link-updater logic + service 61 passed; full suite at f8c82b6db exit=0, 11792 passed, build OK; cargo vault_file_ops_test 30 passed. Reviews: round 1 APPROVED (2 findings, fixed), round 2 APPROVED (no findings).
