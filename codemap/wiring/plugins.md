# wiring plugins: registries and facets defined in plugins, who registers and who fires
cols: reg <id> sink <loc> | stores <binding> <mutation> | doc <text> · reg <id> facet <loc> · reg <id> read-by <loc> <name> · reg <id> fired-by <loc> in <fn> <- <loc> in <fn> · reg <id> registered-at <loc> in <fn> args=<text> -> <callbacks> · reg <id> invoked-at <loc> in <fn> · grep: grep -rF -- 'reg <id> ' codemap/wiring
reg src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.place sink src/lib/plugins/mods/mod-commands.store.svelte.ts:37 | stores placements assign | doc Marks a registered action for the palette until this placement is disposed.
reg src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.place read-by src/lib/plugins/mods/mod-commands.store.svelte.ts:21 modCommandsStore.list
reg src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.place fired-by src/lib/app/commands.ts:418 in getBuiltInCommands
reg src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.place registered-at src/lib/plugins/mods/mods-host.service.ts:220 in createModContext args=actionKey(actionId) -> src/lib/plugins/mods/mods-host.service.ts:createModContext
reg src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.place invoked-at src/lib/plugins/mods/mods-host.service.ts:830 in loadMod
reg src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.register sink src/lib/plugins/mods/mod-commands.store.svelte.ts:26 | stores placements assign, commands assign | doc Registers an action, replacing its id; cleanup removes only this registration.
reg src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.register read-by src/lib/plugins/mods/mod-commands.store.svelte.ts:21 modCommandsStore.list
reg src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.register read-by src/lib/plugins/mods/mod-commands.store.svelte.ts:37 modCommandsStore.place
reg src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.register fired-by src/lib/app/commands.ts:418 in getBuiltInCommands
reg src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.register fired-by src/lib/plugins/mods/mods-host.service.ts:220 in createModContext
reg src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.register registered-at src/lib/plugins/mods/mods-host.service.ts:550 in createModContext args={ id: actionKey(entry.id), label: `${manifest.name}: ${entry.title}`, run: () =… -> src/lib/plugins/mods/mods-host.service.ts:createModContext
reg src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.register invoked-at src/lib/plugins/mods/mods-host.service.ts:830 in loadMod
