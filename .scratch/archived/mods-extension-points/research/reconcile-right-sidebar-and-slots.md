## Verdict

CHANGES PLAN (EP-05 only, one real gap found while checking the sidebar code; the haiku report did not state it. M3 unchanged.)

## Verified changes

1. EP-05 "Host owns the container" (plan line 141) and its Test line (144), "Risk and bound" (143).
   - Wrong or missing: the plan says `mount` runs "on first open" and the test says "Mount once across tab switches". It does not account for collapse. `SidebarSection` is collapsible only when `open` is defined, and then wraps the body in `Collapsible.Content` (`src/lib/core/layout/SidebarSection.svelte:56-63`). The bits-ui 2.20.2 content part renders only while `present` is true, and `present = forceMount || root.open` (`node_modules/bits-ui/dist/bits/collapsible/collapsible.svelte.js:52-55`; `collapsible-content.svelte` renders its `<div>` only through the presence state). `forceMount` is not passed by `SidebarSection` or the shadcn wrapper (`src/lib/components/ui/collapsible/collapsible-content.svelte:1-7` forwards props but `SidebarSection` sets none). So collapsing a section removes the host container div, and the mod's DOM and listeners go with it, while the host still believes the panel is mounted and the mod still holds nodes.
   - Not read: `contentPresence.shouldRender` internals (animation delay), so "removed immediately" vs "removed after transition" is unverified. Either way the div is destroyed.
   - Proposed change, line 141: replace "mount on first open, abort, cleanup and empty on teardown" with: "the container div sits in the `SidebarSection` body; `mount` and its cleanup are tied to that element's lifetime (a Svelte action or `{@attach}`: mount when the div is created, run cleanup and abort when it is destroyed). Collapse, pane loss (Kanban/canvas trip, `AppShell.svelte:264`), `hidesRightSidebar` tabs, mod unload and vault change all take the same teardown path; opening again calls `mount` again." Keep the plan's `untrack` and try/catch.
   - Proposed change, line 143: "Mod state must live outside the DOM, since `mount` re-runs when the pane returns" becomes "...when the pane returns or the section is reopened".
   - Proposed change, line 144: "Mount once across tab switches" becomes "Mount once across note-tab switches while open; collapse runs cleanup and aborts the signal; reopening mounts again". Keep the other cases.
   - Why it matters: without it, a mod that attaches `document` listeners in `mount` leaks them on every collapse, and a mod that renders once and never again shows an empty section after reopen. Built-in precedent: `OutgoingLinksPanel` also resets on collapse (`src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:30-35`).
   - Easier route that also removes the plan's "open state lives in the mods store" need for the collapse case only: none. Open state is still needed for the pane-recreated case (`AppShell.svelte:264`), so line 141's store stays.

2. EP-05 Scope (minor, optional): add one line "A mod section has no Settings > Layout switch; the user hides it by collapsing or disabling the mod." Source: built-in panels each have a `layout.*Visible` flag (`src/lib/core/settings/settings.types.ts:96-104`) and a switch (`src/lib/features/rail-shell/LayoutSection.svelte:127-161`); the plan is silent. Owner call; no code change implied.

## Scout claims refuted

- "The registry has to live in `core/` because `AppShell` is the composition root and `core/` may not import features": wrong premise. `app/` may import plugins (`src/tests/lib/architecture/layer-rules.test.ts:155-162`, `AppShell.svelte:47,49` already import `plugins/`), and `app/` is only barred from being imported (`:165-182`). The plan's `plugins/mods/mod-sidebar.store.svelte.ts` is valid.
- "Cost M, new core registry, new `LayoutSettings` key per mod panel": the plan has no `core/` file and needs no key; the registry is in `plugins/mods`, and no persisted key is required.
- "The contract versioning rule was not verified (additive is minor)": the rule exists for mods at `src/lib/plugins/mods/contract/mod-api.v1.ts:14-16` (additive member, no bump). Moot for EP-05, which goes on unstable `ctx.labs`; `HOST_UNSTABLE = ['app','kb']` is at `mod-api-contract.test.ts:63`, as the plan says.
- "`LayoutSection.svelte` per-panel switches duplicate the AppShell list, so a registry would make them one": true, but a built-in registry is out of scope; the plan correctly leaves built-ins alone.
- Haiku line numbers for AppShell (`264-295`, `277-291`) and `NoteInfo` under `propertiesVisible` are right; toggle button is at about `:184-195`, not `:187-192` (drift only).

## Confirmed, already in the plan (no change)

- Sidebar hard-coded, no registry: `AppShell.svelte:276-291`. Plan's anchors `:264`, `:274`, `:290` match the file.
- Hidden on calendar/tasks/tags/graph/canvas/view/kanban: `layout.logic.ts:15-38`; plan decision 3 and "Absent on Kanban and canvas" cover it. `toggleRightSidebar` no-ops there (`layout.service.ts:30-34`).
- Disposal via `disposable()` and `assertLive` (`mods-host.service.ts:98-115`); vault change handled by `assertLive`.
- Reuse of `core/layout/SidebarSection.svelte` and `watch` on `activeTabPath` instead of per-keystroke effects.
- Foreign DOM under `[data-right-sidebar]`: both reports leave it unverified; M3 is the right test.

## Still unverified

- Whether bits-ui removes the `Collapsible.Content` div immediately or after a transition (presence internals not read); both give the same fix.
- Whether `ScrollArea` (`AppShell.svelte:276`) tolerates a tall mod section, and whether foreign DOM survives re-render (M3).
- `staleRailPinFix` / `lens.logic.js` and the `28-mods.md` text: not read; not needed for this cluster.
- Nothing was run.
