# 19: Prevent colliding moves and renames from replacing notes

**What to build:** Concurrent path changes preserve both sources, with manual/mod collisions refused and Auto Organize selecting an available numbered destination.

**Blocked by:** none
**Files:** src/lib/core/filesystem/fs.service.ts, src/lib/core/filesystem/fs.logic.ts, src/lib/core/filesystem/path-change.service.ts, src/lib/features/auto-organize/auto-organize.service.ts, src/lib/features/auto-organize/auto-organize.logic.ts, src/lib/plugins/mods/, src/lib/contracts/commands.ts, src-tauri/src/commands/, src-tauri/src/utils/fs.rs, src-tauri/src/lib.rs, src/tests/lib/core/filesystem/, src/tests/lib/features/auto-organize/, src/tests/lib/plugins/mods/, src-tauri/tests/vault_file_ops_test.rs, src-tauri/tests/utils_fs_test.rs, src-tauri/tests/commands/files_test.rs, docs/adr/0025-rust-vault-index.md
**Status:** needs-triage
**Priority:** P1
**Gate:** Both with real-filesystem contention tests.

## Decision required

The native utility and command-test paths are potential implementation/test destinations after platform triage, not evidence of existing no-clobber coverage.

The owner previously accepted this race outside the numbering fix. This ticket requests reconsideration, not correction of a violated old requirement. Approve supported platforms/filesystems and safe refusal where exclusive rename is unavailable. Keep current cross-volume refusal unless separately approved.

## Acceptance criteria

- [ ] Two concurrent sources targeting one destination leave winner bytes and loser source bytes intact.
- [ ] A destination appearing after preflight causes an atomic collision refusal, including an existing empty directory.
- [ ] Cover move-versus-rename and manual, mod, and automatic callers through the same guarantee.
- [ ] Auto Organize retries collisions reported by actual numbered attempts with a bound; manual/mod operations do not overwrite or silently rename.
- [ ] Preserve suffix policy, excluded notes, self-identity checks, one final path change for rename-and-move, downstream properties/mod actions, and one informative numbered-move toast from the predecessor.
- [ ] Preserve unchanged sources on missing-parent, permission, unsupported-operation, and cross-device failures.
- [ ] Failed disk operations trigger no successful tab/tree/index settlement; successful operations retain existing ownership and order.
- [ ] Distinguish native collision errors from failures after a successful move; never retry an arbitrary post-move error as a naming collision.
- [ ] Do not substitute a frontend reservation or second existence check for a filesystem-level no-replace guarantee.
- [ ] A narrow native operation must explicitly account for ADR-0025's existing disk/index ownership boundary.

## Provenance

Supersedes pending scope of [open-itens 233](../../open-itens/issues/233-auto-organize-move-collision-numbers-the-note.md). Ordinary numbering is already delivered elsewhere; its broader retained criteria and accepted race are accounted for here. [Evidence](../evidence.md#no-clobber).

## Comments

The scope/platform decision above is required before implementation.
