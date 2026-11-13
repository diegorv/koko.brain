---
summary: "Command palette overlay: ranks and runs app commands and keeps the recently used list."
---

## Responsibility

Owns the palette's open state, the persisted list of recently run command ids, query-based filtering and ranking of an AppCommand list, and running a selected command with error reporting (console error plus toast). It does not own the command registry (the list is a prop), the Cmd+P binding, or shortcut dispatch; the shortcut field is only rendered as a label. It makes no IPC calls and listens to no events.

## Key files

- `src/lib/features/command-palette/CommandPalette.svelte`: Dialog component: takes the commands prop, filters and ranks it, and runs the selected command.
- `src/lib/features/command-palette/command-palette.logic.ts`: filterAndRankCommands: recent-first then alphabetical for an empty query, fuzzy score with a recent boost for a query.
- `src/lib/features/command-palette/command-palette.store.svelte.ts`: Open state and recent command ids, mirrored to localStorage.
- `src/lib/features/command-palette/command-palette.types.ts`: AppCommand and CommandShortcut, the contract every command producer satisfies.
- `src/lib/features/command-palette/command-palette.service.ts`: resetCommandPalette, called from app lifecycle teardown.

## State

- commandPaletteStore: isOpen (memory) and recentCommandIds (memory, mirrored to localStorage key kokobrain:recent-commands as a JSON array, capped).
- The localStorage entry is per viewer and is removed by reset().

## Collaborators

- `src/lib/app`: commands.ts builds the AppCommand list; AppOverlays mounts the palette; global-keybindings binds Cmd+P to toggle; app-lifecycle calls resetCommandPalette.
- `src/lib/utils`: fuzzyMatch scores labels; formatShortcut renders shortcut labels.
- `src/lib/components/ui`: shadcn-svelte Command primitives render the dialog, input, list and items.

## Gotchas

- Recent ids are recorded before command.action() runs, so a command that then fails still moves to the top of the recent list.
- The Command dialog uses shouldFilter={false}; ordering comes only from filterAndRankCommands.
- Recent ids that match no current command are skipped when ranking but stay in the stored list, so renaming a command id orphans its recent entry.
- With a query, the recent boost applies only when a recent command's fuzzy score is within a small margin of a non-recent one.
- The recent list is read once at module load. Every localStorage access is wrapped in try/catch, and a failed read falls back to an empty list.
- The shortcut is display-only here. Changing a shortcut means changing its registration in src/lib/app.
- Failures are reported with console.error and a toast in CommandPalette.svelte, not through the debug and error helpers in utils/debug.ts.
