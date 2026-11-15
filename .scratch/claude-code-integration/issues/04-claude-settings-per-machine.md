# 04: Claude Code settings per machine, not in the vault

**What to build:** Move the `claudeCode` settings Issue 01 added (`enabled`, `binaryPath`, `privacyAcknowledged`) out of `<vault>/.kokobrain/settings.json` into a per-machine store in `localStorage`, the way vault mods keep their on flag (`src/lib/plugins/mods/mods-enabled.store.svelte.ts:11-16`), and refuse an override path inside the open vault.

**Blocked by:** 01

**Status:** wontfix

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first: a `settings.json` carrying `claudeCode: { enabled: true, binaryPath: "<vault>/x/claude", privacyAcknowledged: true }` leaves the feature off, the override empty and the privacy notice unacknowledged after load.
- [ ] `claudeCode` is gone from `AppSettings`, `DEFAULT_SETTINGS` and the `settings.json` parse and write paths; a `claudeCode` key already in a vault's `settings.json` is ignored on load and dropped on the next write.
- [ ] A `claude-code-settings.store.svelte.ts` under `src/lib/features/claude-code/` holds the three values in one `localStorage` key (`kokobrain:claude-code`), machine-wide, read on startup with a pure parser in a `.logic.ts` (tested for valid, missing, malformed and wrong-typed input) and wrapped in try/catch like the mods store. Getters tested.
- [ ] The Settings section, its status check and every other reader use the new store.
- [ ] An override that is relative, or inside the open vault's folder after resolving `..` and symlinks (Rust side, in Issue 01's resolver), is refused with a message, and `claude_status` runs nothing. Rust test for both.

## Problem

Issue 01 persisted `claudeCode.*` through the settings store, whose file is `<vault>/.kokobrain/settings.json` (`src/lib/core/settings/settings.service.ts:13-18`). A vault copied or cloned from elsewhere can then arrive with the feature on, the privacy notice acknowledged and `binaryPath` pointing at a script it ships, and the Settings section runs that path on mount. ADR-0036 rejected the same placement for the mods flag for this reason (Alternatives considered). The name check in Issue 02 does not cover it: the vault can ship a file named `claude`.

## Comments

- 2026-11-14, from an automated security review of Issue 01's commits: ready-for-agent, runs before 02.
- 2026-11-14, owner: wontfix. The owner is the only user and writes every vault they open; settings in `.kokobrain/settings.json` are accepted (spec, Constraints).
