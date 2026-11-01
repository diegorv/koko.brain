# 57: Derive the palette shortcut labels and reserved keys from the keybinding registrations

**What to build:** Issue 22 (squash e83855ba) moved the wiring into `src/lib/app/` but left the shortcut-label derivation out, planning to put it in Issue 25, which is `wontfix` and does not describe it. A shortcut is still declared more than once: Cmd+Shift+N is in `src/lib/app/global-keybindings.ts:138` and again in the palette's command list (`src/lib/app/command-palette…:261`; find the exact file under `src/lib/app/`). Derive the shortcut labels the palette shows, and `RESERVED_KEYBINDINGS`, from the keybinding registrations, so a rebinding or a new shortcut is declared once.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`.

**Source:** review of Issue 22 (`.scratch/architecture-stability/work/22/review.md`, finding 2, minor), 2026-11-01.

- [x] Every palette shortcut label comes from the registration that binds it; no shortcut string is written twice under `src/lib/app/`
- [x] `RESERVED_KEYBINDINGS` is derived from the same registrations
- [x] A test fails when a palette command shows a shortcut no registration binds

## Notes

- **Size:** S.

## Comments

- 2026-11-01, branch `issue/57-derive-palette-shortcut-labels`: added a `KeyCombo` type and `toCodeMirrorKey` writer; Copy Link to Block declares its shortcut once as a combo; palette shortcut labels and `RESERVED_KEYBINDINGS` are derived from the keybinding registrations (`shortcutFor` throws on an unbound command, covered by a test). Fix round: documented when `shortcutFor` throws (3edd77ce). Tests: pnpm check 0 errors; global-keybindings.test.ts 61/61; full suite at 3edd77ce 408 files, 9648 passed, 1 skipped, 1 todo, 0 failed; pnpm build ok. Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
