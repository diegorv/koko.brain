# module card src/lib/features/tags
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/tags ' codemap/modules
module src/lib/features/tags features files 8 in-modules 1 out-modules 7 pub 4/21 ipc 1/0 card ~0.9k
## neighbors
dep src/lib/app -> src/lib/features/tags 3
dep src/lib/features/tags -> src/lib/components 2
dep src/lib/features/tags -> src/lib/contracts 1
dep src/lib/features/tags -> src/lib/core/editor 2
dep src/lib/features/tags -> src/lib/core/settings 3
dep src/lib/features/tags -> src/lib/core/vault 1
dep src/lib/features/tags -> src/lib/features/search 1
dep src/lib/features/tags -> src/lib/utils 5
in2 src/lib/features/tags 1 modules: src/routes(1)
out2 src/lib/features/tags 1 modules: src/lib/features/rail-shell(1)
## entry files
entry src/lib/features/tags/tags.service.ts ext-in2 src/lib/app/commands.ts src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/features/tags/TagsView.svelte ext-in1 src/lib/app/EditorView.svelte
## files
file src/lib/features/tags/TagColorDot.svelte component L19 module src/lib/features/tags in1 t0
file src/lib/features/tags/TagColorPicker.svelte component L110 module src/lib/features/tags in1 t0
file src/lib/features/tags/TagItem.svelte component L71 module src/lib/features/tags in1 t0
file src/lib/features/tags/TagsView.svelte component L91 module src/lib/features/tags in1 t1
file src/lib/features/tags/tags.logic.ts logic L123 module src/lib/features/tags in2 t1
file src/lib/features/tags/tags.service.ts service L167 module src/lib/features/tags in3 t3
file src/lib/features/tags/tags.store.svelte.ts store L29 module src/lib/features/tags in2 t3
file src/lib/features/tags/tags.types.ts types L16 module src/lib/features/tags in3 t0
## public
sym src/lib/features/tags/TagsView.svelte:1 component TagsView L91
sym src/lib/features/tags/tags.service.ts:26 fn buildTagIndex(): Promise<void> L32 | Builds the tag tree from the Rust `VaultIndex`.
sym src/lib/features/tags/tags.service.ts:149 fn toggleTagsTab(): void L10 | Toggles the Tags tab: opens if closed, closes if active, focuses if open but not active.
sym src/lib/features/tags/tags.service.ts:161 fn resetTags(): void L7 | Resets all tag state and cancels any pending scheduled rebuild.
## stores
store src/lib/features/tags/tags.store.svelte.ts:9 tagsStore esc:0
## effects
fx-count svelte.$effect 1
fx-count timer-wrap.debounce 1
fx-count timer.setTimeout 1
ipc-count ipc:get_all_tags_v2 1
## debt
-
