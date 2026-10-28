# 48: Case-only name collisions get a numbered file

**What to build:** `resolveTypedNoteTarget` and `createFile` dedupe names ignoring case, so creating "standup" next to an existing `Standup.md` on a case-insensitive volume yields `standup 1.md` instead of failing with `create-failed`.

**Blocked by:** None

**Status:** ready-for-agent

- `resolveTypedNoteTarget`: `src/lib/features/type-definitions/type-definitions.service.ts:48`. `createFile`: `src/lib/core/filesystem/fs.service.ts:121`.
- macOS APFS is case-insensitive by default; `exists()` is true for a case-only variant, so the current exact-match dedupe and the write disagree.

- [ ] Both dedupe paths compare names case-insensitively
- [ ] Tests: case-only collision gets ` 1`; distinct names unchanged

## Comments

- 2026-10-28 18:44 — discovery — fix the shared `generateUniqueName` to compare case-insensitively; unit + both service tests, no E2E (case-sensitive virtual FS) — 0da29ab9
