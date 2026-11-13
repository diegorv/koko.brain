# module card src/lib/plugins/kanban
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/plugins/kanban ' codemap/modules
module src/lib/plugins/kanban plugins files 12 in-modules 1 out-modules 6 pub 5/74 ipc 0/0 card ~1.2k
## neighbors
dep src/lib/app -> src/lib/plugins/kanban 4
dep src/lib/plugins/kanban -> src/lib/components 2
dep src/lib/plugins/kanban -> src/lib/core/filesystem 7
dep src/lib/plugins/kanban -> src/lib/core/markdown-editor 2
dep src/lib/plugins/kanban -> src/lib/core/vault 1
dep src/lib/plugins/kanban -> src/lib/features/rail-shell 1
dep src/lib/plugins/kanban -> src/lib/utils 10
in2 src/lib/plugins/kanban 1 modules: src/routes(2)
out2 src/lib/plugins/kanban 4 modules: src/lib/contracts(4) src/lib/core/settings(2) src/lib/core/editor(1) src/lib/core/trash(1)
## entry files
entry src/lib/plugins/kanban/kanban.service.ts ext-in3 src/lib/app/boot.ts src/lib/app/commands.ts src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/plugins/kanban/KanbanView.svelte ext-in1 src/lib/app/EditorView.svelte
## files
file src/lib/plugins/kanban/KanbanCard.svelte component L264 module src/lib/plugins/kanban in1 t0
file src/lib/plugins/kanban/KanbanCardText.svelte component L82 module src/lib/plugins/kanban in2 t0
file src/lib/plugins/kanban/KanbanDatePicker.svelte component L146 module src/lib/plugins/kanban in1 t0
file src/lib/plugins/kanban/KanbanLane.svelte component L399 module src/lib/plugins/kanban in1 t0
file src/lib/plugins/kanban/KanbanListView.svelte component L60 module src/lib/plugins/kanban in1 t0
file src/lib/plugins/kanban/KanbanTableView.svelte component L82 module src/lib/plugins/kanban in1 t0
file src/lib/plugins/kanban/KanbanView.svelte component L623 module src/lib/plugins/kanban in1 t4
file src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte component L91 module src/lib/plugins/kanban in2 t1
file src/lib/plugins/kanban/kanban.logic.ts logic L942 module src/lib/plugins/kanban in7 t7
file src/lib/plugins/kanban/kanban.service.ts service L90 module src/lib/plugins/kanban in4 t7
file src/lib/plugins/kanban/kanban.store.svelte.ts store L47 module src/lib/plugins/kanban in2 t6
file src/lib/plugins/kanban/kanban.types.ts types L106 module src/lib/plugins/kanban in7 t0
## public
sym src/lib/plugins/kanban/KanbanView.svelte:1 component KanbanView props:markdownContent,onContentChange,onOpenWikilink L623
sym src/lib/plugins/kanban/kanban.service.ts:18 fn createKanbanFile(parentPath: string): Promise<string> L3 | Creates a new `.kanban` file with an empty board (To Do, In Progress, Done).
sym src/lib/plugins/kanban/kanban.service.ts:27 fn registerKanbanFolderCreator(): () => void L9 | Adds "New Kanban Board" to the Files navigator's folder menu: the rail shell may not import plugins (ADR 0003).
sym src/lib/plugins/kanban/kanban.service.ts:38 fn resetKanban(): void L4 | Resets all kanban state (called during vault teardown)
sym src/lib/plugins/kanban/kanban.service.ts:49 fn clearLinkedContentCache(): void L3 | Clears the linked content cache so card previews re-read from disk.
## stores
store src/lib/plugins/kanban/kanban.store.svelte.ts:15 kanbanStore esc:0
## effects
fx-count svelte.$effect 6
fx-count tauri-fs.readTextFile 1
fx-count timer.requestAnimationFrame 2
## debt
-
