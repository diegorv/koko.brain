# module card src/lib/components
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/components ' codemap/modules
sections: neighbors, entry files, files, debt
module src/lib/components components files 96 in-modules 30 out-modules 1 pub 0/0 ipc 0/0 card ~6k
## neighbors
dep src/lib/app -> src/lib/components 5
dep src/lib/core/layout -> src/lib/components 1
dep src/lib/core/markdown-editor -> src/lib/components 2
dep src/lib/core/settings -> src/lib/components 30
dep src/lib/features/auto-organize -> src/lib/components 11
dep src/lib/features/backlinks -> src/lib/components 2
dep src/lib/features/collection -> src/lib/components 13
dep src/lib/features/command-palette -> src/lib/components 1
dep src/lib/features/event-calendar -> src/lib/components 15
dep src/lib/features/file-history -> src/lib/components 4
dep src/lib/features/file-icons -> src/lib/components 3
dep src/lib/features/note-action-bar -> src/lib/components 1
dep src/lib/features/note-list -> src/lib/components 1
dep src/lib/features/outgoing-links -> src/lib/components 1
dep src/lib/features/properties -> src/lib/components 4
dep src/lib/features/quick-switcher -> src/lib/components 1
dep src/lib/features/rail-shell -> src/lib/components 10
dep src/lib/features/search -> src/lib/components 3
dep src/lib/features/tags -> src/lib/components 2
dep src/lib/features/tasks -> src/lib/components 12
dep src/lib/features/todoist-sync -> src/lib/components 6
dep src/lib/features/type-definitions -> src/lib/components 6
dep src/lib/plugins/kanban -> src/lib/components 2
dep src/lib/plugins/mods -> src/lib/components 8
dep src/lib/plugins/one-on-one -> src/lib/components 1
dep src/lib/plugins/periodic-notes -> src/lib/components 2
dep src/lib/plugins/queryjs -> src/lib/components 2
dep src/lib/plugins/table-of-contents -> src/lib/components 1
dep src/lib/plugins/templates -> src/lib/components 1
dep src/routes -> src/lib/components 1
dep src/lib/components -> src/lib/utils.ts 54
in2 src/lib/components 0 modules: -
out2 src/lib/components 1 modules: src/lib/utils(1)
## entry files
entry src/lib/components/ui/button/index.ts ext-in35 src/lib/app/SettingsPanel.svelte src/lib/core/settings/sections/AppearanceSection.svelte src/lib/core/settings/sections/EditorSection.svelte src/lib/core/settings/sections/SentrySection.svelte src/lib/core/settings/sections/ThemeEditor.svelte more importers 30 not shown: src/lib/features/collection(5) src/lib/features/event-calendar(5) src/lib/core/settings(3) +11 modules: q importers src/lib/components/ui/button/index.ts
entry src/lib/components/ui/input/index.ts ext-in28 src/lib/core/settings/sections/EditorSection.svelte src/lib/core/settings/sections/FileHistorySection.svelte src/lib/core/settings/sections/FilesSection.svelte src/lib/core/settings/sections/HeadingTypographyEditor.svelte src/lib/core/settings/sections/OneOnOneSection.svelte more importers 23 not shown: src/lib/core/settings(6) src/lib/features/auto-organize(3) src/lib/features/tasks(3) +7 modules: q importers src/lib/components/ui/input/index.ts
entry src/lib/components/ui/switch/index.ts ext-in18 src/lib/app/LabsSection.svelte src/lib/core/settings/sections/FileHistorySection.svelte src/lib/core/settings/sections/FilesSection.svelte src/lib/core/settings/sections/PeriodicNotesSection.svelte src/lib/core/settings/sections/SentrySection.svelte more importers 13 not shown: src/lib/core/settings(3) src/lib/features/auto-organize(3) src/lib/features/event-calendar(2) +5 modules: q importers src/lib/components/ui/switch/index.ts
entry src/lib/components/ui/context-menu/index.ts ext-in9 src/lib/core/markdown-editor/EditorTabs.svelte src/lib/core/markdown-editor/MarkdownEditor.svelte src/lib/features/collection/CollectionView.svelte src/lib/features/note-list/NoteRowMenu.svelte src/lib/features/rail-shell/FilesNavigator.svelte more importers 4 not shown: src/lib/plugins/kanban(2) src/lib/features/rail-shell(1) src/lib/features/tasks(1): q importers src/lib/components/ui/context-menu/index.ts
entry src/lib/components/ui/dialog/index.ts ext-in9 src/lib/features/event-calendar/EventDialog.svelte src/lib/features/event-calendar/EventShortcutsDialog.svelte src/lib/features/file-history/FileHistoryDialog.svelte src/lib/features/file-icons/IconPicker.svelte src/lib/features/tasks/TasksView.svelte more importers 4 not shown: src/lib/features/type-definitions(2) src/lib/features/todoist-sync(1) src/lib/plugins/mods(1): q importers src/lib/components/ui/dialog/index.ts
entry src/lib/components/ui/dropdown-menu/index.ts ext-in9 src/lib/features/collection/toolbar/CalendarConfigPanel.svelte src/lib/features/collection/toolbar/FilterPanel.svelte src/lib/features/collection/toolbar/FilterRow.svelte src/lib/features/collection/toolbar/SortPanel.svelte src/lib/features/note-action-bar/NoteActionBar.svelte more importers 4 not shown: src/lib/features/tasks(3) src/lib/features/properties(1): q importers src/lib/components/ui/dropdown-menu/index.ts
entry src/lib/components/ui/popover/index.ts ext-in9 src/lib/core/settings/sections/EditorSection.svelte src/lib/features/collection/CollectionView.svelte src/lib/features/event-calendar/EventPopover.svelte src/lib/features/properties/RelationshipSearch.svelte src/lib/features/rail-shell/RailArchivedMenu.svelte more importers 4 not shown: src/lib/features/rail-shell(3) src/lib/features/tags(1): q importers src/lib/components/ui/popover/index.ts
entry src/lib/components/ui/scroll-area/index.ts ext-in8 src/lib/app/AppShell.svelte src/lib/app/SettingsPanel.svelte src/lib/core/settings/sections/TrashSection.svelte src/lib/features/file-history/DiffViewer.svelte src/lib/features/file-history/SnapshotList.svelte more importers 3 not shown: src/lib/features/file-icons(1) src/lib/features/search(1) src/lib/features/tasks(1): q importers src/lib/components/ui/scroll-area/index.ts
entry src/lib/components/ui/command/index.ts ext-in7 src/lib/core/settings/sections/EditorSection.svelte src/lib/features/command-palette/CommandPalette.svelte src/lib/features/quick-switcher/QuickSwitcher.svelte src/lib/plugins/mods/ModActionPicker.svelte src/lib/plugins/mods/ModDialogHost.svelte more importers 2 not shown: src/lib/plugins/one-on-one(1) src/lib/plugins/templates(1): q importers src/lib/components/ui/command/index.ts
entry src/lib/components/ui/select/index.ts ext-in7 src/lib/core/settings/sections/HeadingTypographyEditor.svelte src/lib/core/settings/sections/UpdateSection.svelte src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte src/lib/features/event-calendar/EventCalendarSection.svelte more importers 2 not shown: src/lib/features/todoist-sync(1) src/lib/plugins/queryjs(1): q importers src/lib/components/ui/select/index.ts
entry src/lib/components/ui/separator/index.ts ext-in5 src/lib/features/backlinks/BacklinksPanel.svelte src/lib/features/collection/toolbar/FilterPanel.svelte src/lib/features/outgoing-links/OutgoingLinksPanel.svelte src/lib/features/properties/PropertiesView.svelte src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte
entry src/lib/components/ui/collapsible/index.ts ext-in4 src/lib/core/layout/SidebarSection.svelte src/lib/features/backlinks/BacklinksPanel.svelte src/lib/features/collection/toolbar/FilterPanel.svelte src/lib/features/tags/TagItem.svelte
entry src/lib/components/ui/tooltip/index.ts ext-in3 src/lib/features/event-calendar/EventCalendarHeader.svelte src/lib/features/event-calendar/EventCalendarView.svelte src/lib/plugins/periodic-notes/DailyNoteButton.svelte
entry src/lib/components/ui/resizable/index.ts ext-in1 src/lib/app/AppShell.svelte
## files
file src/lib/components/ui/button/button.svelte component L82 module src/lib/components in1 t0
file src/lib/components/ui/button/index.ts other L17 module src/lib/components in35 t0
file src/lib/components/ui/collapsible/collapsible-content.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/collapsible/collapsible-trigger.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/collapsible/collapsible.svelte component L11 module src/lib/components in1 t0
file src/lib/components/ui/collapsible/index.ts other L13 module src/lib/components in4 t0
file src/lib/components/ui/command/command-dialog.svelte component L40 module src/lib/components in1 t0
file src/lib/components/ui/command/command-empty.svelte component L17 module src/lib/components in1 t0
file src/lib/components/ui/command/command-group.svelte component L32 module src/lib/components in1 t0
file src/lib/components/ui/command/command-input.svelte component L26 module src/lib/components in1 t0
file src/lib/components/ui/command/command-item.svelte component L20 module src/lib/components in1 t0
file src/lib/components/ui/command/command-link-item.svelte component L20 module src/lib/components in1 t0
file src/lib/components/ui/command/command-list.svelte component L17 module src/lib/components in1 t0
file src/lib/components/ui/command/command-loading.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/command/command-separator.svelte component L17 module src/lib/components in1 t0
file src/lib/components/ui/command/command-shortcut.svelte component L20 module src/lib/components in1 t0
file src/lib/components/ui/command/command.svelte component L28 module src/lib/components in2 t0
file src/lib/components/ui/command/index.ts other L37 module src/lib/components in7 t0
file src/lib/components/ui/context-menu/context-menu-checkbox-item.svelte component L43 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu-content.svelte component L45 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu-group-heading.svelte component L21 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu-group.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu-item.svelte component L27 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu-label.svelte component L24 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu-portal.svelte component L7 module src/lib/components in2 t0
file src/lib/components/ui/context-menu/context-menu-radio-group.svelte component L16 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu-radio-item.svelte component L33 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu-separator.svelte component L17 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu-shortcut.svelte component L20 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu-sub-content.svelte component L20 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu-sub-trigger.svelte component L29 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu-sub.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu-trigger.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/context-menu.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/context-menu/index.ts other L52 module src/lib/components in9 t0
file src/lib/components/ui/dialog/dialog-close.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/dialog/dialog-content.svelte component L45 module src/lib/components in1 t0
file src/lib/components/ui/dialog/dialog-description.svelte component L17 module src/lib/components in1 t0
file src/lib/components/ui/dialog/dialog-footer.svelte component L20 module src/lib/components in1 t0
file src/lib/components/ui/dialog/dialog-header.svelte component L20 module src/lib/components in1 t0
file src/lib/components/ui/dialog/dialog-overlay.svelte component L20 module src/lib/components in1 t0
file src/lib/components/ui/dialog/dialog-portal.svelte component L7 module src/lib/components in2 t0
file src/lib/components/ui/dialog/dialog-title.svelte component L17 module src/lib/components in1 t0
file src/lib/components/ui/dialog/dialog-trigger.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/dialog/dialog.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/dialog/index.ts other L34 module src/lib/components in11 t1
file src/lib/components/ui/dropdown-menu/dropdown-menu-checkbox-group.svelte component L16 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-checkbox-item.svelte component L43 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte component L29 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-group-heading.svelte component L22 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-group.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte component L27 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-label.svelte component L24 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-portal.svelte component L7 module src/lib/components in2 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-radio-group.svelte component L16 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-radio-item.svelte component L33 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-separator.svelte component L17 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-shortcut.svelte component L20 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-sub-content.svelte component L20 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-sub-trigger.svelte component L29 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-sub.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/dropdown-menu.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/dropdown-menu/index.ts other L54 module src/lib/components in9 t0
file src/lib/components/ui/input/index.ts other L7 module src/lib/components in28 t0
file src/lib/components/ui/input/input.svelte component L52 module src/lib/components in1 t0
file src/lib/components/ui/popover/index.ts other L17 module src/lib/components in9 t1
file src/lib/components/ui/popover/popover-content.svelte component L24 module src/lib/components in1 t0
file src/lib/components/ui/resizable/index.ts other L13 module src/lib/components in1 t0
file src/lib/components/ui/resizable/resizable-handle.svelte component L50 module src/lib/components in1 t0
file src/lib/components/ui/resizable/resizable-pane-group.svelte component L20 module src/lib/components in1 t0
file src/lib/components/ui/scroll-area/index.ts other L10 module src/lib/components in9 t0
file src/lib/components/ui/scroll-area/scroll-area-scrollbar.svelte component L31 module src/lib/components in1 t0
file src/lib/components/ui/scroll-area/scroll-area.svelte component L43 module src/lib/components in1 t0
file src/lib/components/ui/select/index.ts other L37 module src/lib/components in7 t0
file src/lib/components/ui/select/select-content.svelte component L45 module src/lib/components in1 t0
file src/lib/components/ui/select/select-group-heading.svelte component L21 module src/lib/components in1 t0
file src/lib/components/ui/select/select-group.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/select/select-item.svelte component L38 module src/lib/components in1 t0
file src/lib/components/ui/select/select-label.svelte component L20 module src/lib/components in1 t0
file src/lib/components/ui/select/select-portal.svelte component L7 module src/lib/components in2 t0
file src/lib/components/ui/select/select-scroll-down-button.svelte component L20 module src/lib/components in2 t0
file src/lib/components/ui/select/select-scroll-up-button.svelte component L20 module src/lib/components in2 t0
file src/lib/components/ui/select/select-separator.svelte component L18 module src/lib/components in1 t0
file src/lib/components/ui/select/select-trigger.svelte component L29 module src/lib/components in1 t0
file src/lib/components/ui/select/select.svelte component L11 module src/lib/components in1 t0
file src/lib/components/ui/separator/index.ts other L7 module src/lib/components in6 t1
file src/lib/components/ui/separator/separator.svelte component L21 module src/lib/components in1 t1
file src/lib/components/ui/switch/index.ts other L7 module src/lib/components in18 t0
file src/lib/components/ui/switch/switch.svelte component L29 module src/lib/components in1 t0
file src/lib/components/ui/tooltip/index.ts other L19 module src/lib/components in3 t0
file src/lib/components/ui/tooltip/tooltip-content.svelte component L52 module src/lib/components in1 t0
file src/lib/components/ui/tooltip/tooltip-portal.svelte component L7 module src/lib/components in2 t0
file src/lib/components/ui/tooltip/tooltip-provider.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/tooltip/tooltip-trigger.svelte component L7 module src/lib/components in1 t0
file src/lib/components/ui/tooltip/tooltip.svelte component L7 module src/lib/components in1 t0
## debt
-
