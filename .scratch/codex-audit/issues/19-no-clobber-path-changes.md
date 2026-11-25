# 19: Prevent colliding moves and renames from replacing notes

**What to build:** Concurrent path changes preserve both sources, with manual/mod collisions refused and Auto Organize selecting an available numbered destination.

**Blocked by:** None (scope/platform decision required before implementation).
**Status:** needs-triage
**Priority:** P1
**Gate:** Both with real-filesystem contention tests.

## Decision required

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
