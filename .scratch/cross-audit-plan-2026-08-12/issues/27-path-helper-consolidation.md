# Issue 27: Consolidate stem() and relativePath() into utils/path.ts

Status: ready-for-agent
Phase: P3 Track C step 2
Source: PONY #51 + #59 + #27 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track C — Filesystem/paths)
Blocked by: none

## What

Two path helpers are copied around the codebase: a filename-stem derivation (5 copies) and a
vault-relative-path derivation (4 copies). Consolidate both into the **existing**
`src/lib/utils/path.ts` as ONE change. The copies are not identical, so the behavioral deltas get
reconciled before anything is flipped.

## How

- **#51 + #59 + #27 as ONE change**, into the **EXISTING** `src/lib/utils/path.ts` — do not create a
  new module.
- Consolidate `stem()` (5 copies) and `relativePath()` (4 copies).
- **Reconcile the behavioral deltas FIRST**, before flipping any call site: the sibling-prefix
  handling and the `filePath === vaultPath` case differ between copies. Pick the correct behavior,
  pin it with a test, then flip.
- **Flip exactly 4 call sites**: `search.logic.ts:171`, `SearchResult.svelte:64`,
  `QuickSwitcher.svelte:82`, `RelationshipSearch.svelte:79`.
- **file-history's 3 sites stay UNFLIPPED** — those strings are SQLite snapshot keys (persisted
  identifiers), per ADR-0021. Changing them would invalidate existing snapshots.
- **Keep a named `extractVaultName` wrapper** — do not inline it away at its call sites.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Test collateral lands in the same commit as the source change, including the tests pinning the
  reconciled sibling-prefix and `filePath === vaultPath` behavior.
- Stage only the files related to this step (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- One commit, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with
  line ranges).

## Comments

### 2026-08-19 — implemented

**Red-green evidence.** Two probes added to the pre-existing `describe('getRelativePath')` blocks in
`search.logic.test.ts` and `quick-switcher.logic.test.ts`, run against unfixed code:

```
FAIL src/tests/lib/features/search/search.logic.test.ts > getRelativePath > returns the original path for a sibling directory sharing the vault prefix
AssertionError: expected 'ed/note.md' to be '/vaulted/note.md'
FAIL src/tests/lib/features/search/search.logic.test.ts > getRelativePath > returns the path unchanged when it equals the vault path
AssertionError: expected '' to be '/vault'
FAIL src/tests/lib/features/quick-switcher/quick-switcher.logic.test.ts > getRelativePath > returns the original path for a sibling directory sharing the vault prefix
AssertionError: expected 'ed/note.md' to be '/vaulted/note.md'
FAIL src/tests/lib/features/quick-switcher/quick-switcher.logic.test.ts > getRelativePath > returns the path unchanged when it equals the vault path
AssertionError: expected '' to be '/vault'
Test Files 2 failed (2) | Tests 4 failed | 86 passed (90)
```

After the change both duplicate bodies are gone, so the probes moved into
`describe('relativePath')` in `src/tests/lib/utils/path.test.ts` along with the seven pre-existing
assertions from the two deleted describes (argument order swapped to `(vaultPath, filePath)`;
three pairs were semantically identical and collapsed). Full gate green:
`pnpm check` 191 files 0 errors, `pnpm vitest run` 284 files / 6341 passed, `pnpm build` ok.

**Reconciliation.** `fs.logic.ts`'s body is the canonical `relativePath(vaultPath, filePath)`: strict
`vaultPath + '/'` prefix test, input returned unchanged otherwise. It is correct on both deltas the
issue names, and it is already the behavior of the five unflipped `fs.logic` call sites — notably
`trash.service.ts:47`, whose result is persisted as `TrashItem.originalPath` and re-joined on restore
at `trash.service.ts:104`. Adopting the loose body's `''`-on-equality there would corrupt a restore of
a trashed vault root. On the four flipped sites both deltas are unreachable today (search iterates
`noteContents` file keys; `flattenFileTree` only emits non-directory nodes), so the flip is
behavior-preserving in practice while removing latent corruption. Trailing-slash normalization was
deliberately NOT added: all three `vaultStore.open` producers originate from the Tauri directory
picker, and adding it would silently change the persisted trash `originalPath`.

**Discovery: the stem side is two derivations, not one.** The issue and the plan both describe
`stem()` with 5 copies, implying one derivation. The 5 named copies are actually two:

- basename, extension KEPT (`split('/').pop() ?? path`) — `fs.logic.ts::getFileName`,
  `editor.logic.ts::getFileName`, `vault.logic.ts::extractVaultName`. Byte-identical.
- stem, extension DROPPED — `link-updater.logic.ts::extractNoteName`,
  `search.logic.ts::getFileName`. Byte-identical.

Collapsing them into one function would silently strip extensions at `editor.service.ts:105` (every
tab title), `collection.logic.ts:28` (collection entry names) and `TypeNoteList.svelte:116`, whose own
`.replace(/\.view$/i, '')` depends on the suffix still being there. Resolved by adding BOTH
`basename()` and `stem()` to `utils/path.ts`, with `stem()` built on `basename()`. Reported rather
than silently reinterpreted.

**Discrepancy: relativePath consolidates 3 copies, not 4.** The issue says four copies but also
mandates that file-history's copy stay unflipped (ADR-0021 persisted SQLite `snapshots.file_path`
keys, plus the on-disk `.kokobrain/snapshots-backup/<relative>` tree). The effective consolidation is
three copies collapsing to one canonical, with file-history's fourth surviving as a deliberate
documented exception. `src/lib/features/file-history/**` and its test file are untouched.

**Discrepancy: all seven named helpers keep their names.** The issue states the "keep a named
wrapper" rule only for `extractVaultName`, but the "flip exactly 4 call sites" cap implies the same
for the other six: `fs.logic`'s five `getRelativePath` callers and every basename/stem caller are
untouched, so those helpers stay as one-line delegating wrappers rather than being inlined away.

**Mutation check.** Argument-order swap is the top silent-failure risk here (both params are
`string`, so `pnpm check` cannot catch a missed swap). Re-swapping `search.logic.ts:162` back to
`relativePath(filePath, vaultPath)` fails the pre-existing `performSearchOverFiles > filters by path`
test (expected 1 result, got 0), so that flip is pinned. The three `.svelte` flips have no unit
coverage (this repo has no component-rendering tooling) and were verified by reading the final diff.
The null-vault case at `SearchResult.svelte` is preserved: with `vaultPath === ''` the old loose body
and the new strict body both return the absolute path minus its leading slash.

**Follow-up worth an issue (not done here, out of scope).** Roughly seventeen inline
`split('/').pop()` occurrences remain across `src/lib` (calendar.logic, templates.logic,
type-note-list.logic, backlinks.logic, bookmarks.logic, deep-link.service, link-updater.service,
watcher-handler.service, tauri-listeners.service, search.service, search-hybrid.logic,
SearchResult.svelte, FileNode.svelte, GraphControls.svelte, FileHistoryDialog.svelte, and
`resolveFilePath` inside `path.ts` itself). They are inline inside larger functions rather than
helper copies, so flipping them would have blown past this issue's four-call-site cap. A follow-up
could route them through `basename()`/`stem()`.
