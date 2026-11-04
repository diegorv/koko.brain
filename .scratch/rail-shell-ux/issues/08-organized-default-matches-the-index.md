# 08: The note action bar treats a missing `_organized` as organized, like the index

**What to build:** A note with no `_organized` key is organized everywhere. Today Rust, the Inbox, the rail and dock badges and collections treat a missing key as organized, while the note action bar and `getLifecycleState` treat it as "inbox": the bar offers "Set note as organized" on a note that is not in the Inbox, and the first Cmd+E writes `true` and changes nothing visible. After this, the bar shows the organized state for such a note and Cmd+E moves it to the Inbox (writes `_organized: false`). The Rust doc comment and the generated binding stop saying "Default `false`".

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** both (IPC DTO doc comment): `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build`; commit the regenerated `src/lib/contracts/generated/` file.

- [ ] Failing test first: one fixture (a note without `_organized`, not archived) fed to both `getLifecycleState` / `isOrganized` and the Inbox predicate in `inbox-workflow.logic.ts` gives the same answer: organized, not in the Inbox (logic test)
- [ ] `_organized: false` is inbox and `_organized: true` is organized on both sides (same test)
- [ ] The action bar's organize toggle on a note without the key writes `_organized: false` and the note appears in the Inbox lens (component or service test, real stores)
- [ ] Existing tests that lock the old bar behaviour are updated with a note on why, not deleted
- [ ] `entry.rs` doc comment for `organized` says default `true`; `cargo test` regenerates `NoteEntry.ts` with the new JSDoc
- [ ] Help 25 describes the default the same way

## Notes

- **Cause (traced):** `src-tauri/src/vault/entry.rs:246-249` reads `_organized` with `.unwrap_or(true)` while its doc comment (`entry.rs:193`) says default `false`. `features/properties/lifecycle.logic.ts:7-24` returns `inbox` unless `_organized === true`. `features/note-action-bar/NoteActionBar.svelte:62,155-158` builds on it.
- **Interaction with Issue 16 (Explicit organization):** that Issue makes new notes write `_organized: false` when the switch is on, so the Inbox stays the place for new notes; this Issue only aligns how a missing key reads.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F09.
- **Size:** S.

## Comments
