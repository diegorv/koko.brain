---
summary: "In-memory registry of the mod actions an Auto Organize rule can run, keyed by namespaced action id."
---

## Responsibility

Owns the registry of actions that Auto Organize rules may run on a note: the RuleAction and RuleActionTarget types and ruleActionsStore with list, get, register (which returns a cleanup) and reset. It does not load mods, parse manifests, parse rules or run anything itself. The mods host decides which actions are registered and Auto Organize decides when to run them. It lives in core because features may not import plugins, so the two meet here.

## Key files

- `src/lib/core/rule-actions/rule-actions.store.svelte.ts`: The whole module: the types and ruleActionsStore.
- `src/lib/plugins/mods/mods-host.service.ts`: Producer: when a mod adds an action whose id is in the manifest's ruleActions, registers it here, and removes it when the mod action is disposed.
- `src/lib/features/auto-organize/auto-organize.service.ts`: Consumer: looks up the rule's action id and runs the action on the note.
- `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte`: Consumer: builds the action picker from the registry and flags a saved action that is no longer registered.

## State

- ruleActionsStore: module-level $state.raw array of RuleAction entries, in memory only

## Collaborators

- `src/lib/plugins/mods`: mods-host.service.ts registers actions listed in a loaded mod's manifest ruleActions and unregisters them on dispose.
- `src/lib/features/auto-organize`: Reads the registry with get and list to run actions and to offer them in the rule editor.

## Gotchas

- Registration is gated by the mod manifest: the mods host registers an action only when its id is in the manifest's ruleActions list.
- register replaces an existing entry with the same id, and the returned cleanup removes only the exact entry it added, so a stale cleanup does not remove a newer registration.
- register stores a shallow copy of the action, so later changes to the passed object do not affect the registry.
- The store makes no IPC calls and listens to no events. Any IPC happens inside the registered run callbacks, which belong to the mods host.
