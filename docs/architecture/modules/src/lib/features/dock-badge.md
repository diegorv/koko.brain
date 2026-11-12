---
summary: "Mirrors the inbox count onto the macOS dock badge through the Tauri window API."
---

## Responsibility

Owns two steps: computing the badge value (null when the setting is off, otherwise the inbox count) in dock-badge.logic.ts, and applying it to the current window in dock-badge.service.ts, where null, 0 or a negative value clears the badge. It does not own the inbox definition (type-definitions), the setting (core/settings), which entries are passed in (AppShell excludes the system folder), or the Settings toggle (rail-shell). It has no store and no IPC command.

## Key files

- `src/lib/features/dock-badge/dock-badge.logic.ts`: dockBadgeCount(enabled, entries): null when disabled, otherwise getInboxCount(entries).
- `src/lib/features/dock-badge/dock-badge.service.ts`: applyDockBadge(value): calls getCurrentWindow().setBadgeCount, clearing for null, 0 or negative; logs and swallows failures.
- `src/lib/app/AppShell.svelte`: Only production caller: an effect reads the setting and typeDefinitionsStore entries and calls applyDockBadge inside untrack().
- `src/lib/features/type-definitions/inbox-workflow.logic.ts`: getInboxCount, shared with the rail Inbox lens.

## State

- No store or persistent state. The enabled flag is settingsStore.dockBadgeInboxCount, owned by core/settings.
- The badge value lives in OS state on the app window.

## Collaborators

- `src/lib/features/type-definitions`: getInboxCount computes the number.
- `src/lib/core/settings`: Source of the dockBadgeInboxCount flag.
- `src/lib/app`: AppShell.svelte runs the effect that calls dockBadgeCount and applyDockBadge.
- `src/lib/features/rail-shell`: LayoutSection.svelte hosts the Settings toggle.
- `src/lib/utils`: error() logs under the DOCK-BADGE tag.

## Gotchas

- The clear rule is split: dockBadgeCount returns null when disabled, and applyDockBadge clears for null, 0 or negative. Passing 0 does not show a badge.
- applyDockBadge catches and logs every failure and does not rethrow, because the badge is cosmetic.
- The system folder is excluded by AppShell (excludeSystemFolder) before entries reach dockBadgeCount; the logic does not filter it.
- AppShell wraps applyDockBadge in untrack() and ignores the returned promise.
- The badge uses the JavaScript window API only. No Rust code sets it, so there is no command to keep in sync.
