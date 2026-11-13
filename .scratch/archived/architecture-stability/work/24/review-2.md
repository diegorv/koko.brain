VERDICT: APPROVED

# Issue 24 re-review, round 2

Reviewed the fixes `git diff 85d12ee1..HEAD` (1da2f042, b8051b27, b2f0ca67). Outside `.scratch/`, only
`src/lib/plugins/queryjs/contract/kb-api.v1.ts` (a doc comment) and
`src/tests/lib/plugins/queryjs/kbapi-firewall.test.ts` changed. No app code, no `src-tauri/`, no
layer baseline, `BASELINE_SIZE` or composition-root change.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `kb-api.v1.ts:102-111` now limits the parity claim to what the fixture pins and lists octal, `.inf`/`.nan` and nested maps as known differences. My TS probe through `buildNoteRecord` (removed afterwards) gave `oct=15`, `inf=Infinity`, `nan=NaN` (all numbers) and no `nested` key. On the Rust side, `project_value` (`parsing.rs:805-815`) maps a `Map` to `Null`, and `parse_scalar` (`parsing.rs:942-972`) only accepts `i64`/`f64` `parse`, which rejects `0o17`, `.inf` and `.nan`, so they fall through to strings. The doc matches the code. |
| 2 | minor | resolved | `kbapi-firewall.test.ts:363-368` is a plain `it` that finds the case and runs `expect(c).toBeDefined()`. A rename now fails the test instead of skipping it. |
| 3 | minor | resolved | The doc comment at `kbapi-firewall.test.ts:341-348` says a new conditional injection needs a fixture case with an `injected` map that fires it. This was the optional fix the review asked for. |
| 4 | nit | rejection stands (alternative fix correct) | `aliases.rs:11` maps `type` to `_type`, `canonicalize_key` is applied in `parsing.rs:799`, and `project_note_record` (`vault.rs:748-750`) clones the canonical frontmatter, then overwrites `_type`. Rust never emits a `type` key, so `fullRecord()` was right. Changing `fullEntry.frontmatter` to `_type: 'person'` (line 203) is the correct fix. |
| 5 | nit | resolved | `addLocalAliases` (`kbapi-firewall.test.ts:108-127`) iterates to a fixed point over local type aliases and interfaces, and it runs on `kb-api.ts` before the signature check. The probe test at lines 129-139 pins `Wrap -> Raw -> NoteEntryV2`. The imported-name assertion now reads the pre-alias snapshot `importedDtoNames`, so it is unchanged in strength. |

## Acceptance criteria re-checked

- [met] A grep-style test checks that `contract/*.ts` and the exported KBAPI types import no `vault-v2` or generated-binding module — unchanged import checks; the signature scan got stronger (finding 5). `kbapi-firewall.test.ts` passes.
- [met] Adding a field to the Rust `NoteEntry` (dry run) leaves the KBPage snapshot green, and renaming `tags` fails to compile in `buildKBPage` — the widened-entry test still passes after the `fullEntry` frontmatter change. The compile half is untouched by the fixes (`queryjs.logic.ts` did not change), so the round-1 dry run still holds.
- [met] A test feeds the same frontmatter (including a multi-line value and an array with a quoted comma) through both property paths, and asserts identical `page.<key>` values or records the known differences in the contract doc. The `page._type` divergence is fixed by issue 38; this test pins it — the parity test cannot skip silently any more (finding 2), and the contract doc now records the known differences accurately (finding 1, probed on the TS side and read on the Rust side).
- [met] A new key injected by `project_note_record` (dry run) fails the page-root snapshot — the chain is unchanged, and its conditional-injection limit is now documented (finding 3).

## Checks I ran (worktree root, HEAD b2f0ca67)

- `pnpm check`: exit 0, 212 files, 0 errors.
- `pnpm vitest run src/tests/lib/plugins/queryjs/kbapi-firewall.test.ts src/tests/lib/plugins/queryjs/kb-api-contract.test.ts src/tests/lib/features/collection/collection.service.test.ts`: exit 0, 3 files, 50 passed.
- The full suite, `pnpm build` and cargo test are left to deliver. No `src-tauri/` change in the fixes.
- The worktree was clean after the probe (I deleted the probe file).

## Findings

None open or new.
