# module card src/lib/features/auto-organize
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/auto-organize ' codemap/modules
module src/lib/features/auto-organize features files 8 in-modules 1 out-modules 12 pub 4/61 ipc 0/0 card ~1.2k
## neighbors
dep src/lib/app -> src/lib/features/auto-organize 2
dep src/lib/features/auto-organize -> src/lib/components 11
dep src/lib/features/auto-organize -> src/lib/core/editor 4
dep src/lib/features/auto-organize -> src/lib/core/filesystem 4
dep src/lib/features/auto-organize -> src/lib/core/frontmatter 4
dep src/lib/features/auto-organize -> src/lib/core/note-creator 1
dep src/lib/features/auto-organize -> src/lib/core/rule-actions 2
dep src/lib/features/auto-organize -> src/lib/core/settings 4
dep src/lib/features/auto-organize -> src/lib/core/vault 4
dep src/lib/features/auto-organize -> src/lib/features/collection 18
dep src/lib/features/auto-organize -> src/lib/features/file-icons 13
dep src/lib/features/auto-organize -> src/lib/features/type-definitions 2
dep src/lib/features/auto-organize -> src/lib/utils 6
in2 src/lib/features/auto-organize 1 modules: src/routes(1)
out2 src/lib/features/auto-organize 3 modules: src/lib/contracts(5) src/lib/types(3) src/lib/core/trash(1)
## entry files
entry src/lib/features/auto-organize/AutoOrganizeSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/features/auto-organize/auto-organize.service.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
## files
file src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte component L378 module src/lib/features/auto-organize in1 t0
file src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte component L549 module src/lib/features/auto-organize in1 t1
file src/lib/features/auto-organize/AutoOrganizeSection.svelte component L218 module src/lib/features/auto-organize in1 t1
file src/lib/features/auto-organize/auto-organize.logic.ts logic L971 module src/lib/features/auto-organize in4 t5
file src/lib/features/auto-organize/auto-organize.service.ts service L777 module src/lib/features/auto-organize in2 t4
file src/lib/features/auto-organize/auto-organize.store.svelte.ts store L59 module src/lib/features/auto-organize in3 t5
file src/lib/features/auto-organize/auto-organize.types.ts types L116 module src/lib/features/auto-organize in7 t0
file src/lib/features/auto-organize/type-lifecycle-rules.ts other L62 module src/lib/features/auto-organize in1 t1
## public
sym src/lib/features/auto-organize/AutoOrganizeSection.svelte:1 component AutoOrganizeSection L218
sym src/lib/features/auto-organize/auto-organize.service.ts:113 fn loadAutoOrganizeConfig(vaultPath: string): Promise<void> L24 | Loads auto-organize config from .kokobrain/auto-organize-rules.json.
sym src/lib/features/auto-organize/auto-organize.service.ts:250 fn toggleAutoOrganizeHook(enabled: boolean): (() => void) | null L13 | Dynamically enables or disables the auto-organize after-save hook.
sym src/lib/features/auto-organize/auto-organize.service.ts:755 fn resetAutoOrganize(): void L23 | Resets all auto-organize state (called during vault teardown)
## stores
store src/lib/features/auto-organize/auto-organize.store.svelte.ts:9 autoOrganizeStore esc:0
## effects
fx-count svelte.$effect 2
fx-count tauri-fs.exists 11
fx-count tauri-fs.mkdir 3
fx-count tauri-fs.readTextFile 2
fx-count tauri-fs.writeTextFile 1
fx-count timer.setTimeout 3
## debt
-
