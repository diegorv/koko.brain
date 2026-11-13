# module card src/lib/features/tasks
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/tasks ' codemap/modules
module src/lib/features/tasks features files 14 in-modules 2 out-modules 10 pub 7/135 ipc 2/0 card ~1.5k
## neighbors
dep src/lib/app -> src/lib/features/tasks 5
dep src/lib/features/event-calendar -> src/lib/features/tasks 1
dep src/lib/features/tasks -> src/lib/components 12
dep src/lib/features/tasks -> src/lib/contracts 2
dep src/lib/features/tasks -> src/lib/core/editor 5
dep src/lib/features/tasks -> src/lib/core/filesystem 1
dep src/lib/features/tasks -> src/lib/core/settings 4
dep src/lib/features/tasks -> src/lib/core/vault 3
dep src/lib/features/tasks -> src/lib/features/file-icons 3
dep src/lib/features/tasks -> src/lib/features/type-definitions 1
dep src/lib/features/tasks -> src/lib/types 2
dep src/lib/features/tasks -> src/lib/utils 16
in2 src/lib/features/tasks 1 modules: src/routes(2)
out2 src/lib/features/tasks 2 modules: src/lib/core/frontmatter(1) src/lib/core/markdown-editor(1)
## entry files
entry src/lib/features/tasks/tasks.service.ts ext-in3 src/lib/app/commands.ts src/lib/app/global-keybindings.ts src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/features/tasks/TasksView.svelte ext-in1 src/lib/app/EditorView.svelte
entry src/lib/features/tasks/task-status.logic.ts ext-in1 src/lib/features/event-calendar/EventTaskChip.svelte
entry src/lib/features/tasks/tasks.store.svelte.ts ext-in1 src/lib/app/commands.ts
## files
file src/lib/features/tasks/SourcesPanel.svelte component L496 module src/lib/features/tasks in1 t0
file src/lib/features/tasks/TaskLists.svelte component L294 module src/lib/features/tasks in1 t0
file src/lib/features/tasks/TasksView.svelte component L1213 module src/lib/features/tasks in1 t2
file src/lib/features/tasks/task-headings.logic.ts logic L71 module src/lib/features/tasks in2 t1
file src/lib/features/tasks/task-metadata.types.ts types L1 module src/lib/features/tasks in7 t0
file src/lib/features/tasks/task-query.logic.ts logic L1508 module src/lib/features/tasks in6 t9
file src/lib/features/tasks/task-row-edit.logic.ts logic L38 module src/lib/features/tasks in1 t2
file src/lib/features/tasks/task-status.logic.ts logic L70 module src/lib/features/tasks in6 t4
file src/lib/features/tasks/task-views.logic.ts logic L355 module src/lib/features/tasks in4 t6
file src/lib/features/tasks/tasks-keys.logic.ts logic L112 module src/lib/features/tasks in3 t1 | The Tasks view's keyboard model: which action a key on a row maps to, which row stays current when the list changes, and which row holds the tab stop.
file src/lib/features/tasks/tasks.logic.ts logic L207 module src/lib/features/tasks in4 t2
file src/lib/features/tasks/tasks.service.ts service L595 module src/lib/features/tasks in6 t16
file src/lib/features/tasks/tasks.store.svelte.ts store L195 module src/lib/features/tasks in5 t15
file src/lib/features/tasks/tasks.types.ts types L25 module src/lib/features/tasks in5 t0
## public
sym src/lib/features/tasks/TasksView.svelte:1 component TasksView props:onOpenWikilink L1213
sym src/lib/features/tasks/task-status.logic.ts:14 fn isTaskOpen(status: TaskStatus): boolean L3 | Whether a task in `status` is open: done and cancelled are closed, every other status is open.
sym src/lib/features/tasks/tasks.service.ts:143 fn loadSavedTasksView(): void L12 | Loads this vault's saved Tasks state (`tasksView`, `parseTasksViewState`): the global excludes, the saved views, and the active list, whose query it copies int…
sym src/lib/features/tasks/tasks.service.ts:547 fn openTasksTab(): void L14 | Opens or focuses the Tasks tab.
sym src/lib/features/tasks/tasks.service.ts:571 fn toggleTasksTab(): void L10 | Toggles the Tasks tab: opens if closed, closes if active, focuses if open but not active.
sym src/lib/features/tasks/tasks.service.ts:588 fn resetTasks(): void L8 | Resets all task state.
sym src/lib/features/tasks/tasks.store.svelte.ts:100 store tasksStore L96
## stores
store src/lib/features/tasks/tasks.store.svelte.ts:100 tasksStore esc:0
## effects
fx-count dom.scroll 1
fx-count svelte.$effect 6
ipc-count ipc:toggle_task_status 1
ipc-count ipc:write_task_text 1
## debt
-
