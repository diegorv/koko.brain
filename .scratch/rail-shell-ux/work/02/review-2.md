VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `extractViewIcon` (src/lib/features/file-icons/file-icons.logic.ts:142-159) rebuilds `fields` from `Object.entries(parsed)`, mapping `icon` / `color` / `title_color` through `VIEW_ICON_ALIASES` onto `_icon` / `_color` / `_title_color`. Entries come in document order, so the later of a key and its alias wins, which matches Rust's `result.insert(canonicalize_key(key), ...)` loop (src-tauri/src/vault/parsing.rs:799) and the alias table in src-tauri/src/vault/aliases.rs:18-22. The alias lookup is a Map, so `constructor` and similar keys map to themselves. Three new logic tests (alias-only body, `_icon` with an unprefixed `color`, `_icon` followed by `icon`) pass. |
| 2 | minor | rejection stands (accepted, documented) | The ADR-0009 amendment (docs/adr/0009-incremental-indexing-reverse-index.md:72) now says that a full rebuild after an outside edit leaves the dedupe signature stale, that the risk is accepted as rare and recoverable, and that clearing the signatures in the watcher's full-rebuild branch would close it. The round-1 reviewer offered this outcome. No code change, consistent with CLAUDE.md § Simplicity (a rare, visible, recoverable glitch). |
| 3 | nit | resolved | The comment at type-definitions.service.ts:290 now reads "Every writer that rewrites an existing `.view` goes through here." `createView` still goes through `createFile`, so the comment is accurate. |
| 4 | nit | resolved | CLAUDE.md § Indexing & Watcher rule 6 lists `the .view rewriters via type-definitions.service::writeViewFile` among the write paths. |
| 5 | (ratchet, not a finding) | correct | src/tests/lib/raw-write-ratchet.test.ts:45-48: the two `.view` reasons become one `writeViewFile` entry. type-definitions.service.ts has exactly two raw `writeTextFile(` sites, in source order :219 (renameType) and :293 (writeViewFile), which matches the two reasons. The list got shorter and no allowance was added, so the ratchet is not weakened. |

## Acceptance criteria re-checked

- [met] Change icon and Remove icon on a view update the row icon without the full rebuild: with the real file-icons consumer registered, after `updateViewIcon` `fileIconsStore.getFrontmatterIcon(viewPath)` holds the new icon, colour and title colour, and after `removeViewIcon` it is undefined. The file-icons consumer reads a `.view`'s `_icon` / `_color` / `_title_color` from the whole body parsed as YAML; `.md` handling is unchanged (service test, plus a logic test for the `.view` read, including a body that does not parse, which gives no icon and no throw) — the alias fold only adds keys before the same `extractIconFromParsedFrontmatter` / `extractIconColorsFromParsedFrontmatter` calls, and the canonical-key path is unchanged. The existing unparseable, empty and non-mapping guards come before the fold. The file-icons logic and service tests and the type-definitions service tests pass.
- [met] ADR-0009's Consequences bullet that says the `.view` writers stay off the owner gets a dated amendment saying they now route through it and why the consumers no longer clobber `.view` state; the bullet itself is kept as history — docs/adr/0009-incremental-indexing-reverse-index.md:72: the original text is kept, and the 2026-11-04 amendment now also records the accepted dedupe-signature gap.

## Findings

None open or new.

## Checks run by the reviewer

- `pnpm check` (worktree root): exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/file-icons/ src/tests/lib/raw-write-ratchet.test.ts src/tests/lib/features/type-definitions/`: exit 0, 16 files, 453 tests passed.
- No layer-baseline entry, `BASELINE_SIZE` change or composition root added. Scope: every change traces to a round-1 finding or to the ratchet failure.
- Not run: the full vitest suite and `pnpm build` (both are deliver's). Not checked: the frontend YAML parser on a literal duplicate key (the same key twice). The tests cover only a key next to its alias, which are distinct YAML keys.
