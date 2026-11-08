VERDICT: APPROVED

# Issue 23 re-review, round 2

Range reviewed: `git diff 088464ba..HEAD` (1c769881, ae328958, 444e3c1a, 46bdda5d).

## Previous findings

| # | Severity | Status | Evidence |
| --- | --- | --- | --- |
| 1 | blocker | resolved | `e2e/mocks/vault-index.ts:35-40` now imports `parseWikilinks` from `../../src/lib/core/filesystem/wikilink-resolution.logic`, merged into the existing import block; header comment at :10 updated. That module exports it (`wikilink-resolution.logic.ts:71`). My probe `tsc --ignoreConfig --noEmit --module esnext --moduleResolution bundler --target es2022 --skipLibCheck e2e/mocks/vault-index.ts e2e/mocks/tauri-core.ts` no longer reports TS2305. Its only error is TS2741 (`organized` missing in `NoteEntry`), and the same probe in the main checkout reports the same TS2741, so it predates this branch; it is a type-only error that esbuild erases, so it does not stop the module from linking. No other `e2e/` import points at a path this branch moved. |
| 2 | minor | resolved | `src-tauri/src/vault/parsing.rs:1037` points at `src/lib/core/filesystem/wikilink-resolution.logic.ts:72-102`. Lines 72-102 are exactly the `parseWikilinks` body (the signature through the closing brace). The comment sits on a private fn, not a `#[ts(export)]` type, so no bindings change. |
| 3 | minor | resolved | ADR 0009:71 and ADR 0029:104 now place `toggleFavoriteForPath` in `features/properties/lifecycle.service.ts`. `grep -rn toggleFavoriteForPath docs src/lib` finds no other stale location. Rewording dropped a comma in ADR 0009 (new nit 1). |
| 4 | minor | resolved | ADR 0032:75 names `core/frontmatter`, consistent with rows :76-77. |
| 5 | nit | resolved | `lifecycle.service.ts:9`, `properties.service.ts:3-13` and `PropertiesView.svelte:14-20` now put the `#lib/core/frontmatter` imports in the `#lib` group, ahead of features and relative imports. I checked the other four files too and agree they were already in order. The `properties.service.ts` hunk also moves the two `#lib/utils` imports and `./properties.store.svelte` below the frontmatter imports. That is only a reorder, still `#lib` before relative, with no import added or dropped. |

## Acceptance criteria re-checked

- [not met] `grep -rn "#lib/features/properties/" src/lib/core` is empty, and the properties, icon and sidebar E2E specs pass — the grep is empty (exit 1). The round-1 cause of the E2E failure is fixed (finding 1 resolved: the mock's import resolves, and the tsc probe shows only the TS2741 that main also has). I did not run `bash scripts/e2e.sh`, and the Issue's gate leaves it to deliver, so this stays unverified until deliver runs it.

## Findings

1. **nit** `docs/adr/0009-incremental-indexing-reverse-index.md:71`: the rewrite dropped the separator before the third item: "`link-updater.service.ts` (post-rename wikilink rewrite) `type-definitions.service.ts` (`renameType`'s open-tab rewrite) and ...". Fix: add a comma after "(post-rename wikilink rewrite)".

No regressions found. No test was weakened or deleted, and no baseline entry, `BASELINE_SIZE` increase or composition root was added. The fix commits touch only the files the five findings named, plus the review file.

## Checks run

- `pnpm check`: exit 0, 212 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/properties src/tests/lib/architecture src/tests/lib/features/note-list src/tests/lib/features/file-icons`: exit 0, 25 files, 410 tests passed.
- The tsc probe on the E2E mocks, run in the worktree and in the main checkout (see finding 1 in the table).
- Not run: `cargo test`, since the only Rust change is a doc comment on a non-exported fn; the full suite, `pnpm build` and `bash scripts/e2e.sh` are left to deliver.

## Resolution

- Finding 1 (nit, ADR 0009:71): fixed. Added the comma after "(post-rename wikilink rewrite)".
- Acceptance criterion 4 (E2E left unverified by the reviewer): deliver ran `bash scripts/e2e.sh` at 7a0fbab1: 290 passed, exit 0 (log: brain.worktrees/test-logs/architecture-stability/23-deliver-e2e.log).
