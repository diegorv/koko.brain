# file card src/lib/utils/inflight.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/inflight.ts ' codemap/files
file src/lib/utils/inflight.ts other L173 module src/lib/utils in5 t1
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:8 -> src/lib/utils/inflight.ts serializeWithRerun
imp src/lib/core/vault/vault-entries.service.ts:2 -> src/lib/utils/inflight.ts versionGated
imp src/lib/features/backlinks/backlinks.service.ts:3 -> src/lib/utils/inflight.ts dedupeInflight,isStillCurrentPath
imp src/lib/features/outgoing-links/outgoing-links.service.ts:3 -> src/lib/utils/inflight.ts dedupeInflight,isStillCurrentPath
imp src/lib/plugins/mods/mods-host.service.ts:17 -> src/lib/utils/inflight.ts serializeWithRerun
## reach
in2 src/lib/utils/inflight.ts 13 files in 9 modules: src/lib/app(4) src/lib/plugins/mods(2) src/lib/features/backlinks(1) src/lib/features/event-calendar(1) src/lib/features/outgoing-links(1) +4 modules: q impact src/lib/utils/inflight.ts --depth 2
out2 src/lib/utils/inflight.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/inflight.test.ts imports src/lib/utils/inflight.ts mirror
## symbols
sym src/lib/utils/inflight.ts:27 fn dedupeInflight<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>, keyFn: (...args: TArgs) => string): (...ar… L21 | Wraps an async function so that concurrent calls sharing the same derived key collapse into a single in-flight Promise.
by src/lib/utils/inflight.ts:dedupeInflight <- src/lib/features/backlinks/backlinks.service.ts:170 in fetchBacklinksV2 call +2
by src/lib/utils/inflight.ts:dedupeInflight <- src/lib/features/outgoing-links/outgoing-links.service.ts:91 in fetchOutgoingLinksV2 call
sym src/lib/utils/inflight.ts:65 fn serializeWithRerun(task: () => Promise<void>): () => Promise<void> L23 | Wraps an async task so runs never overlap.
by src/lib/utils/inflight.ts:serializeWithRerun <- src/lib/app/lifecycle/app-lifecycle.service.ts:506 in initializeVault call
by src/lib/utils/inflight.ts:serializeWithRerun <- src/lib/plugins/mods/mods-host.service.ts:1030 in requestReload call
sym src/lib/utils/inflight.ts:90 interface VersionGated L13 | A memoized async read whose cache entry is keyed on a caller-supplied version.
sym src/lib/utils/inflight.ts:124 fn versionGated<T>(fn: () => Promise<T>, versionOf: () => number): VersionGated<T> L32 | Memoizes a single-value async read, keyed on a monotonic version the caller supplies.
by src/lib/utils/inflight.ts:versionGated <- src/lib/core/vault/vault-entries.service.ts:26 in vaultEntriesMemo call
sym src/lib/utils/inflight.ts:171 fn isStillCurrentPath(fetchedPath: string, currentPath: string | null): boolean L3 | Returns true when the IPC result fetched for `fetchedPath` is still relevant to `currentPath` (the active tab): either no tab is active (e.g. headless tests) o…
by src/lib/utils/inflight.ts:isStillCurrentPath <- src/lib/features/backlinks/backlinks.service.ts:158 in fetchBacklinksV2Inner call +2
by src/lib/utils/inflight.ts:isStillCurrentPath <- src/lib/features/outgoing-links/outgoing-links.service.ts:79 in fetchOutgoingLinksV2Inner call
