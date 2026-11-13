# file card src/lib/core/layout/SidebarSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/layout/SidebarSection.svelte ' codemap/files
file src/lib/core/layout/SidebarSection.svelte component L72 module src/lib/core/layout in4 t1
## imports
imp src/lib/core/layout/SidebarSection.svelte:4 -> src/lib/components/ui/collapsible/index.ts *
## imported-by
imp src/lib/features/backlinks/BacklinksPanel.svelte:9 -> src/lib/core/layout/SidebarSection.svelte default
imp src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:8 -> src/lib/core/layout/SidebarSection.svelte default
imp src/lib/features/properties/PropertiesView.svelte:11 -> src/lib/core/layout/SidebarSection.svelte default
imp src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:7 -> src/lib/core/layout/SidebarSection.svelte default
## reach
in2 src/lib/core/layout/SidebarSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/layout/SidebarSection.svelte 3 files in 1 modules: src/lib/components(3)
## tests
test src/tests/lib/core/layout/SidebarSection.test.ts imports src/lib/core/layout/SidebarSection.svelte mirror
## symbols
sym src/lib/core/layout/SidebarSection.svelte:1 component SidebarSection props:title,open=$bindable,onOpenChange,children L72
by src/lib/core/layout/SidebarSection.svelte:default <- src/lib/features/backlinks/BacklinksPanel.svelte:55 in (markup) mount
by src/lib/core/layout/SidebarSection.svelte:default <- src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:51 in (markup) mount
by src/lib/core/layout/SidebarSection.svelte:default <- src/lib/features/properties/PropertiesView.svelte:156 in (markup) mount
by src/lib/core/layout/SidebarSection.svelte:default <- src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:46 in (markup) mount
## mounted-at
mount src/lib/features/backlinks/BacklinksPanel.svelte:55 SidebarSection -> src/lib/core/layout/SidebarSection.svelte
mount src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:51 SidebarSection -> src/lib/core/layout/SidebarSection.svelte
mount src/lib/features/properties/PropertiesView.svelte:156 SidebarSection -> src/lib/core/layout/SidebarSection.svelte
mount src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:46 SidebarSection -> src/lib/core/layout/SidebarSection.svelte
