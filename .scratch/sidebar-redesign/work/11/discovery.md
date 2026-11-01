# Issue 11 discovery: the rail shell remembers the active rail item

No `spec.md`; the source is `PRD.md` (Persistence, Q20). Same settings pattern as `work/10` (`railPanelsVisible`);
only the key and the fallback differ.

## Files that change
- `core/settings/settings.types.ts:54-80`, `settings.store.svelte.ts:52-66`: `layout.railItem: string` (default
  `'inbox'`). The loader spreads `parsed.layout` over the defaults (`settings.service.ts:79-82`), so old files load
  with Inbox. `updateLayout` already persists through the settings save effect.
- `features/rail-shell/lens.logic.ts:8-16`: `DEFAULT_RAIL_ITEM = 'inbox'` and `restoreRailItem(saved: unknown)`
  -> `{ item, lens }`: a known built-in key (inbox, favorites, archive) gives its lens; anything else (unknown key,
  blank, non-string from a hand-edited file) gives the default item and `INBOX_LENS`.
- `core/layout/AppShell.svelte:88-91,111-117`: the local `railItem` / `railLens` `$state` becomes a `$derived` of
  `restoreRailItem(settingsStore.layout.railItem)`; `onSelect` writes `updateLayout({ railItem })`.
- No UI is added, so the theme-token criterion holds by construction (Rail.svelte is unchanged).

## Plan (test-first)
1. `lens.logic.test.ts`: `restoreRailItem` for each known key, unknown key, empty string, undefined, non-string.
2. `settings.service.test.ts`: missing key loads `'inbox'`; a saved `'archive'` is restored; round trip:
   `updateLayout({ railItem: 'favorites' })` -> `saveSettings` -> written JSON fed back to `loadSettings` restores it.
3. E2E `rail-shell.spec.ts`: picking Archive writes `layout.railItem: 'archive'` to settings.json; opening a vault
   whose settings carry `shell: 'rail', railItem: 'favorites'` highlights Favorites and lists the Favorites lens;
   a saved unknown item opens on Inbox.

## Prior art
`settings.service.test.ts` "restores hidden rail panels across a restart", `lens.logic.test.ts` built-in lens tests,
`rail-shell.spec.ts` (`savedFile`, `chooseLayout`).

## Defaults taken
- The rail item key alone is saved: today every rail item maps to exactly one lens, so the lens is derived from it.
  The lens tickets add their own `layout` key for the target (PRD Persistence), each with its own fallback.
- The fallback stays Inbox (`DEFAULT_RAIL_ITEM`); the Today ticket changes that one constant.
- The saved key is not rewritten on fallback: the stale value stays until the user picks an item (no extra write).

## Risks
- If settings finish loading after AppShell mounts, the derived value updates, so the list switches lens once.
