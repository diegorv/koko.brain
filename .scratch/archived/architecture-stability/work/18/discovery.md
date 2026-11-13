# 18 discovery: versioned KBAPI v1 contract

No spec.md for this feature; the Issue is the spec.

## Files that change
- New `src/lib/plugins/queryjs/contract/kb-api.v1.ts`: KBApiV1, KBUIV1, DataArrayV1<T>, ScriptDataArrayV1<T> (the Proxy-facing `DataArrayV1<T> & { [k: string]: DataArrayV1<unknown> }`), KBDateTimeV1, KBPageV1, KBLinkV1, KBTaskV1, KBElOptionsV1, AggregateStatsV1, the KBUI option types (moved from `kb-ui.types.ts`). Function-typed properties only. No imports.
- `queryjs.types.ts`: re-export/alias the V1 types (KBPage, KBLink, KBTask, KBElOptions, AggregateStats).
- `kb-ui.types.ts`: re-export the option types from the contract under their current names.
- `kb-api.ts:18` `implements KBApiV1`, `readonly version = 1`; param/return types switch to V1 interfaces where invariance needs it (getDaysInRange; table rows become a generic `R[] | DataArrayV1<R>` so `DataArray<string[]>` still fits).
- `kb-ui.ts:81` `implements KBUIV1`; `heatmap`, `table` params take `DataArrayV1`.
- `data-array.ts:8` `implements DataArrayV1<T>`; KBDateTime params -> KBDateTimeV1, groupBy rows -> DataArrayV1.
- `kb-datetime.ts:10` `implements KBDateTimeV1`; `hasSame(other: KBDateTimeV1)` reads `other.ts` instead of the private `_date` (a V1 param cannot reach privates).
- New `help/examples/queryjs-globals.d.ts` (outside tsconfig `include`): `declare const kb/dv` via `import()` types so the file stays a global script.
- New test `src/tests/lib/plugins/queryjs/kb-api-contract.test.ts`: version, surface snapshot.
- `help/documentation/13-queryjs.md:122-160,281` + new "API version and compatibility" section; `docs/adr/0010` amendment.

## Plan (commits)
1. Failing test: `kb.version`/`dv.version === 1` and the surface snapshot (red on version).
2. Contract file + implements + type re-exports + version (green, `pnpm check`).
3. Script globals file. 4. Docs + ADR amendment.

## Surface snapshot design
Per class: public names as `{ name: true }` objects typed `satisfies Record<keyof XV1, true>` (compile error when the contract and the list diverge), plus an explicit internal list (TS-private fields/methods, `_values`, `awaitAllPending`). Runtime set = `Reflect.ownKeys(prototype)` minus constructor + `Reflect.ownKeys(instance)`; asserted equal to public + internal. KBPage fixture built with the real `buildNoteRecord` + `buildKBPage`, frozen as `{ key: typeof }` for root and `file`.

## Prior art
- `src/tests/lib/plugins/queryjs/kb-api.test.ts:26-71` (makeRecord/createAPI fixtures, editor.service mock).

## Defaults taken
- Root keys `tags`, `organized`, `archived`, `favorite` stay out of the KBPageV1 type (they come from the record projection, which buildKBPage does not guarantee); the docs list them and the snapshot freezes them.
- Static members (`KBDateTime.tryParse`, KBUI private statics) are not script-reachable via `kb`, so not in the snapshot.
- `awaitAllPending` stays public in TS (the widget calls it) but is internal to the contract.

## Risks
- Scripts relying on the documented (wrong) behaviour; docs change only, no code behaviour changes.
