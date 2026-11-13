# file card src/lib/features/collection/view-row-set.port.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/view-row-set.port.ts ' codemap/files
file src/lib/features/collection/view-row-set.port.ts other L65 module src/lib/features/collection in4 t2
## imports
imp src/lib/features/collection/view-row-set.port.ts:1 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionViewDef,type:PropertyIndexRecord
## imported-by
imp src/lib/app/boot.ts:9 -> src/lib/features/collection/view-row-set.port.ts registerViewRowSetPort
imp src/lib/features/collection/CollectionView.svelte:14 -> src/lib/features/collection/view-row-set.port.ts getViewRowSetPort
imp src/lib/features/collection/collection-block-widget.ts:5 -> src/lib/features/collection/view-row-set.port.ts getViewRowSetPort
imp src/lib/plugins/mods/mod-query.service.ts:4 -> src/lib/features/collection/view-row-set.port.ts getViewRowSetPort
## reach
in2 src/lib/features/collection/view-row-set.port.ts 5 files in 3 modules: src/lib/app(3) src/lib/plugins/mods(1) src/routes(1)
out2 src/lib/features/collection/view-row-set.port.ts 1 files in 1 modules: src/lib/features/collection(1)
## tests
test src/tests/lib/app/boot.test.ts imports src/lib/features/collection/view-row-set.port.ts
test src/tests/lib/plugins/mods/mod-query.service.test.ts imports src/lib/features/collection/view-row-set.port.ts
## symbols
sym src/lib/features/collection/view-row-set.port.ts:13 interface ViewRowSetPort L34 | The rail's rule for the rows of a `.view`, which the collection editor follows so its "N results" match the rail's list and the navigator count, and which an i…
sym src/lib/features/collection/view-row-set.port.ts:55 fn registerViewRowSetPort(port: ViewRowSetPort): () => void L6 | Installs the port a `.view` in the collection editor uses.
by src/lib/features/collection/view-row-set.port.ts:registerViewRowSetPort <- src/lib/app/boot.ts:61 in registerAppPorts call
sym src/lib/features/collection/view-row-set.port.ts:63 fn getViewRowSetPort(): ViewRowSetPort | null L3 | The installed port, or null when none is registered (the editor then runs the plain query).
by src/lib/features/collection/view-row-set.port.ts:getViewRowSetPort <- src/lib/features/collection/CollectionView.svelte:256 in queryResult=$derived call +1
by src/lib/features/collection/view-row-set.port.ts:getViewRowSetPort <- src/lib/features/collection/collection-block-widget.ts:120 in CollectionBlockWidget.toDOM call
by src/lib/features/collection/view-row-set.port.ts:getViewRowSetPort <- src/lib/plugins/mods/mod-query.service.ts:50 in createModQuery call
