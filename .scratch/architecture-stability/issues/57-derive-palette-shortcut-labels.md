# 57: Derive the palette shortcut labels and reserved keys from the keybinding registrations

**What to build:** Issue 22 (squash e83855ba) moved the wiring into `src/lib/app/` but left the shortcut-label derivation out, planning to put it in Issue 25, which is `wontfix` and does not describe it. A shortcut is still declared more than once: Cmd+Shift+N is in `src/lib/app/global-keybindings.ts:138` and again in the palette's command list (`src/lib/app/command-palette…:261`; find the exact file under `src/lib/app/`). Derive the shortcut labels the palette shows, and `RESERVED_KEYBINDINGS`, from the keybinding registrations, so a rebinding or a new shortcut is declared once.

**Blocked by:** none

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`.

**Source:** review of Issue 22 (`.scratch/architecture-stability/work/22/review.md`, finding 2, minor), 2026-11-01.

- [ ] Every palette shortcut label comes from the registration that binds it; no shortcut string is written twice under `src/lib/app/`
- [ ] `RESERVED_KEYBINDINGS` is derived from the same registrations
- [ ] A test fails when a palette command shows a shortcut no registration binds

## Notes

- **Size:** S.
