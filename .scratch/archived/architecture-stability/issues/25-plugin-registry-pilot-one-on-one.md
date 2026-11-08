# 25 (wontfix unless 22 is too big): Plugin registry pilot

**What to build:** Nothing on its own. The verification on 2026-11-01 dropped the `KokoPlugin` / `BUILT_IN_PLUGINS` pilot:
- After issue 22 moves app-lifecycle, global-keybindings, AppOverlays and SettingsPanel into `src/lib/app/`, 4 of the 5 one-on-one imports become legal app-to-plugin imports.
- The only remaining violation is `features/command-palette` importing 6 plugin modules, and issue 22 now builds the palette's plugin commands in `app/`.
- Disposer ownership already exists (`unregisterNoteChangeConsumers`), and the action-bar store is already a registry. A new registry mechanism would fix one edge.

This number is kept only as the split target for the command-palette and shortcut work if issue 22 grows too large.

**Blocked by:** 22

**Status:** wontfix

**Gate:** n/a

**Source:** verification notes in `.scratch/architecture-stability/plan-2026-11-01.md`

## Notes

- **Revisit** only if third-party plugins or runtime toggles become a real requirement.
