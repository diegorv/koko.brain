---
type: ADR
id: "0034"
title: "Stores expose getters; a getter may return a module-level $derived"
status: active
date: 2026-11-01
---

## Context

ADR-0005 banned `$derived` in stores because "`$derived` values do not update synchronously" under vitest. That claim no longer holds. With Svelte 5.57.2 and vitest 5.0.5 under `vitest.config.ts`, a module-level `$derived` / `$derived.by` read through a store getter returns the fresh value right after a `$state` write, with no `flushSync()` and no mounted component. Two test files pin it, one per Svelte runtime that vitest resolves:

- `src/tests/lib/svelte-derived-sync.test.ts`: the default node environment, where most store tests run. Vitest compiles `.svelte.ts` for the Svelte server runtime there, and a module-level derived re-runs its function on every read (`node_modules/svelte/src/internal/server/index.js:495-511`: "deriveds created outside [render] are not" memoized). Reads are fresh but not cached.
- `src/tests/lib/svelte-derived-sync.client.test.ts`: `// @vitest-environment jsdom`, the client runtime the app runs. Reads are fresh and memoized between writes, with or without a subscribed `$effect`.

Both use the fixture `src/tests/fixtures/derived-sync.svelte.ts`. Replacing its getters with a value cached on first read fails 6 of the 8 tests (checked by hand once, 2026-11-01).

Getters are still required at the module boundary. Svelte refuses to compile an exported derived: `node_modules/svelte/src/compiler/errors.js:134`, "Cannot export derived state from a module. To expose the current derived value, export a function returning its value" (`derived_invalid_export`).

## Decision

**Stores keep exposing state and computed values through getters; a getter may return a module-level `$derived` / `$derived.by` when memoizing the computation pays off.** Plain getters that compute on read stay the default for cheap values.

```typescript
// example.store.svelte.ts
let items = $state<Item[]>([]);
const byTag = $derived.by(() => groupByTag(items)); // memoized in the app

export const exampleStore = {
	get items() { return items; },
	get count() { return items.length; },  // cheap: plain getter
	get byTag() { return byTag; },          // costly: getter over $derived
	setItems(v: Item[]) { items = v; },
};
```

- **No mass migration.** Existing getters stay as they are. A getter moves to a `$derived` only when a change touches it and the computation is worth caching.
- **Every computed value keeps its test**, whether it is a plain getter or a getter over a `$derived` (`docs/TESTING.md` Step 0).

## Alternatives considered

- **Keep ADR-0005's ban**: rests on a claim the probe tests refute, and makes every costly aggregation hand-memoize inside the module. Rejected.
- **Export the `$derived` directly**: the compiler rejects it (`derived_invalid_export`). Not available.
- **Migrate every computed getter to `$derived`**: churn in every store for no measured gain; most getters are `items.length`-cheap. Rejected.

## Consequences

- Memoization is a client-runtime property. Store tests in the default node environment read through the server runtime, where the derived re-runs per read: they pin values, not caching. A test that needs to see the caching runs under jsdom, like `svelte-derived-sync.client.test.ts`.
- The manual memoization ADR-0005 forced (e.g. the incremental reverse index, ADR-0009) is still valid; a `$derived` is an extra option, not a required rewrite.
- `$derived` in `.svelte` components is unchanged.
- Re-evaluation triggers: either probe test fails after a Svelte or vitest bump; Svelte allows exporting derived state from a module; vitest stops resolving the server runtime under node.
- Supersedes [ADR-0005](0005-svelte-runes-getter-stores.md).
