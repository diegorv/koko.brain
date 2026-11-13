# file card src/lib/features/collection/toolbar/CalendarConfigPanel.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/toolbar/CalendarConfigPanel.svelte ' codemap/files
file src/lib/features/collection/toolbar/CalendarConfigPanel.svelte component L144 module src/lib/features/collection in1 t0
## imports
imp src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:2 -> src/lib/components/ui/dropdown-menu/index.ts DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem
## imported-by
imp src/lib/features/collection/CollectionView.svelte:32 -> src/lib/features/collection/toolbar/CalendarConfigPanel.svelte default
## reach
in2 src/lib/features/collection/toolbar/CalendarConfigPanel.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/collection/toolbar/CalendarConfigPanel.svelte 17 files in 1 modules: src/lib/components(17)
## symbols
sym src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:1 component CalendarConfigPanel props:dateProperty,endDateProperty,weekStartDay,colorProperty,availableProperties,onDatePropertyChange,onEndDatePropertyChange,onWeekStartDayChange,onColorPropertyChange L144
by src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:default <- src/lib/features/collection/CollectionView.svelte:604 in (markup) mount
## mounts
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:50 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:51 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:59 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:61 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:72 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:73 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:81 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:82 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:86 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:98 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:99 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:107 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:109 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:122 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:123 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:131 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:132 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/CalendarConfigPanel.svelte:136 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
## mounted-at
mount src/lib/features/collection/CollectionView.svelte:604 CalendarConfigPanel -> src/lib/features/collection/toolbar/CalendarConfigPanel.svelte
