VERDICT: APPROVED

# Review: calendar-feature issue 14 (E2E vault-index mock parity)

Reviewed `git diff main...HEAD` (0bf8dc4a, 5d3063d7, cbe644d0) against the Issue, plan Task 13 (`plan-2026-10-28.md:326-338`) and the Rust commands in `src-tauri/src/commands/vault.rs` and `src-tauri/src/vault/entry.rs`.

## Test evidence (run by the reviewer)

- `pnpm check`: 192 files, 0 errors, 0 warnings. `e2e/` is outside svelte-check, so this does not type-check the mocks.
- `bash scripts/e2e.sh e2e/specs/file-operations.spec.ts e2e/specs/file-explorer.spec.ts e2e/specs/tasks-view.spec.ts e2e/specs/folder-notes.spec.ts e2e/specs/calendar-plugin.spec.ts e2e/specs/editor-state-persistence.spec.ts`: 17 passed, no `Unknown invoke command` warning. This is a subset. The full suite is deliver's job.
- A throwaway vitest probe drove `invoke()` from `e2e/mocks/tauri-core.ts` against `virtualFS`. I deleted it afterwards and did not commit it. It checked:
  - `isA` for `_type`, bare `type`, empty `_type` with a populated `type`, a numeric `type`, no frontmatter, and a non-ASCII first letter.
  - Save flow: one emit, then no emit on a second index call with no new write.
  - `create_note`, which always emits and leaves no hook entry.
  - `remove_note_from_index`, which emits once and then does not emit again.
  - `rename_note` for a file, a folder (`/v/dir`; the sibling `/v/dirty.md` is untouched), a `.canvas` file, and a call with no prior disk op. The last two return `null`.
  - The no-op `remove_note_from_index(from)` after a rename, which does not emit.
  All passed. Findings 1-3 come from this probe.
- No test file is added or changed. The ticket limits the mock commit to the two mock files, and no vitest suite covers `e2e/mocks/`. The test verdict therefore rests on the E2E specs listed above plus the probe.

## Acceptance criteria

- [x] **`buildEntry` sets `isA`, mirroring `extract_is_a`.** Met: `e2e/mocks/vault-index.ts:174-182` and `:209`. It reads `_type`, then bare `type`, needs a non-empty string, uppercases the first code point and keeps the rest, which matches `normalize_type_casing` (`parsing.rs:85-91`). The probe confirmed the results Event, Meeting, Task (from the empty `_type` falling back to `type`), null, null and Éclair.
- [x] **The hooks record each `UpdateResultV2` in an exported `lastHookResult`.** Met: `vault-index.ts:461-476`. `onWrite` records `update(path)`. `onRemove` records `remove(path)`. `onRename` records `remove(old)` under `old` and `update(new)` under `new`.
- [x] **`handleCreateNote` takes and discards the hook result, then always emits `{ changed: true, affected: [path], version }`.** Met: `tauri-core.ts:58-66`. It returns the result, as Rust returns `UpdateResult`.
- [x] **The update and remove handlers use the hook result (else compute) and emit only when `changed`.** Met: `tauri-core.ts:124-136`, matching `vault.rs:307` and `vault.rs:891`.
- [x] **`HANDLERS` gains `rename_note`, which emits `{ changed: true, affected: [from, to], version }` when the removal changed.** Met: `tauri-core.ts:144-157` and `:314`. It returns `null` otherwise, mirroring `Option<UpdateResult>`. It also reads keys under `from + '/'`, which goes past the literal "removal result for from". See finding 4: this is accepted.
- [x] **Every emit goes through `window.__e2e.events.emit`.** Met: `emitIndexUpdated` at `tauri-core.ts:32-36` uses the same guarded call as `handleToggleTaskStatus` (`:118-120`).
- [x] **The change is one isolated commit touching only the two mock files.** Met: `git show --stat 5d3063d7` lists only `e2e/mocks/tauri-core.ts` and `e2e/mocks/vault-index.ts`.
- [ ] **The full `bash scripts/e2e.sh` passes, and the commit body records why it ran.** Pending for deliver. The commit body gives the reason (listener refresh, `tauri-listeners.service.ts:121-138`, and the `docs/TESTING.md:148` scope). The full suite has not run yet. Only the 17-test subset above has.
- [ ] **Gate green, and one commit in the full CLAUDE.md format.** Commit format met: 5d3063d7 has Context, Problem, Solution, Behavior and Files with line ranges, plus the Co-Authored-By trailer. Gate pending for deliver.

## Findings

1. **Low.** `e2e/mocks/vault-index.ts:245-250`. The mock's `update` decides `changed` from size, outgoing links, tags and frontmatter only. Rust compares the whole `NoteEntry` (`index.rs`: `old_entry.as_ref() != Some(&entry)`), which includes tasks, wordCount, snippet and mtime.
   - Effect: an edit that leaves the size unchanged records `changed: false`, so no `vault-index-updated` is emitted. Examples are typing `- [ ]` -> `- [x]` in the editor, or swapping a word for one of the same length. Rust would emit in both cases. The probe confirmed it: `hi there` -> `hi thorn` gave `changed=false`.
   - The logic predates this diff and the ticket's bullets do not cover it. It only matters now because emits depend on `changed`. Event edits change frontmatter, so the calendar feature is not affected.
   - Fix (non-blocking): open a follow-up, or also compare `tasks` / `wordCount` / `snippet` in `changed`. Either way it needs its own full-suite run.
2. **Low.** `vault-index.ts:471-475` and `tauri-core.ts:144-157`. Following the ticket, `onRename` records `update(new)` under the new path, but no handler ever consumes it, because `rename_note` only takes `from`-side keys.
   - The probe left `/v/b.md`, `/v/dir2/x.md`, `/v/dir2/y.md` and `/v/q.canvas` in the map.
   - A later `update_note_in_index(to)` with no write before it would be handed that stale `changed: true` and emit once. No current caller does this, because every save writes first and overwrites the entry. This is the "one extra refetch" the plan already accepts.
   - Fix (optional): have `handleRenameNote` also take and discard the `to` / `to + '/'` keys.
3. **Low.** `vault-index.ts:464`. `onPopulate` (fired by `populate` and `reset`) rebuilds the index but does not clear `lastHookResult`.
   - The probe wrote `/v/a.md`, re-populated, then called `update_note_in_index`. It got the stale `changed: true` and emitted.
   - Only a spec that writes and then repopulates within one page load can hit this. `vault-picker.spec.ts` may switch vaults.
   - Fix (optional): `onPopulate: () => { lastHookResult.clear(); vaultIndex.rebuildAll(); }`.
4. **Info (accepted).** `tauri-core.ts:147-151`. The `from + '/'` prefix walk goes slightly past the ticket's "removal result for from". It is needed: `virtualFS.rename` fires `onRename` only per child (`virtual-fs.ts:202-225`), so a lookup on `from` alone would never emit for a folder move. Rust's `rename_note_inner` walks `from` plus `from/` (`vault.rs:940-975`). The probe showed the sibling `/v/dirty.md` is not swept. No change needed.
5. **Info (accepted).** `tauri-core.ts:62` and `:154`. The `create_note` and `rename_note` payloads follow the ticket, not Rust:
   - Rust `create_note` emits `update_note_in_index_inner`'s result, which is `changed: false` for a non-markdown path.
   - Rust `rename_note` emits the last per-key `UpdateResult`.
   Both Rust commands emit under the same conditions as the mock. The only consumer reads only `payload.version` (`tauri-listeners.service.ts:143`), so this has no behavioral effect. No change needed.

## Scope, rules

- Scope: only the two mock files plus the scratch docs. No source, store or test-policy changes, and nothing outside the ticket except finding 4, which is justified.
- CLAUDE.md: tabs are used. JSDoc is on `extractIsA`, `lastHookResult`, `takeHookResult`, `emitIndexUpdated` and `handleRenameNote`. The imports follow the existing relative `../../src/lib/types/vault-v2.types` pattern. Layer and error-handling rules do not apply to E2E mocks.
