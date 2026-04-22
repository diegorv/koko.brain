---
type: ADR
id: "0005"
title: "Svelte 5 runes with getter-based stores (no $derived in stores)"
status: active
date: 2026-04-22
---

## Context

Svelte 5 introduced runes (`$state`, `$derived`, `$effect`). The natural model for a store is a module that holds `$state` variables and exposes `$derived` values for computed state. Svelte components pick this up through fine-grained tracking.

However, the project runs its unit tests in **vitest** with Node.js + jsdom — no Svelte component tree is mounted. In that environment, `$derived` values do not update synchronously after a `$state` mutation: the derivation is scheduled and reads return the pre-mutation value. This silently breaks tests that mutate state then assert on derived values. The bug is especially pernicious because the same code works in the Svelte runtime.

The project also wanted to avoid Svelte 3/4-style `writable()` + `.subscribe()` stores, which force components into imperative subscribe/unsubscribe dances and fight against the runes model everywhere else.

## Decision

Stores must use **`$state` for reactive state and plain getters for computed values — never `$derived` inside a store**. Getters reading `$state` still track reactively in Svelte components via the fine-grained property-access tracking runes provide.

Canonical pattern (`docs/PATTERNS.md:11-25`):

```typescript
// example.store.svelte.ts
let items = $state<string[]>([]);

export const exampleStore = {
  get items() { return items; },
  // CORRECT — computed as getter, works in both Svelte and vitest
  get count() { return items.length; },
  get isEmpty() { return items.length === 0; },
  setItems(v: string[]) { items = v; },
};

// WRONG — $derived doesn't update synchronously in vitest
// let count = $derived(items.length);
```

Real example: `src/lib/features/backlinks/note-index.store.svelte.ts:70-113` exposes `noteIndex`, `noteContents`, `reverseIndex`, `isLoading` as getters; `setNoteIndex`, `setNoteContents`, `updateNoteEntry`, `reset` as methods. No `$derived` in the file.

`CLAUDE.md` Quick Reference rule 3 enforces the discipline at review time: *"Use getters, not `$derived` in stores — `$derived` doesn't work in vitest; every computed getter must have a test."*

## Alternatives considered

- **`$derived` everywhere**: idiomatic Svelte 5 but silently breaks vitest assertions. We considered switching to a Svelte-component-based test harness; that trades one problem (stale derivations) for another (forcing every service test to mount a component). Rejected.
- **Writable stores + `.subscribe()` (Svelte 3/4 style)**: works in vitest but fights the rune model in every component; infectious once introduced. Rejected.
- **Pinia-style stores via a third-party library**: adds a dependency and a paradigm that does not match the rest of Svelte 5 idioms. Rejected.
- **Testing only at the E2E level**: too slow; we need sub-second feedback on store logic.

## Consequences

- Store authors must remember the rule; every computed getter must have a dedicated test (`CLAUDE.md` Quick Reference rule 3). The testing gate in `docs/TESTING.md` Step 0 enforces this.
- Getters execute on every access. For cheap computations (`items.length`, `map.get(x)`) the cost is negligible; for expensive aggregations, the getter author must memoize manually inside the module (e.g., `noteIndexStore`'s `reverseIndex` is maintained incrementally rather than recomputed per read — see ADR-0009).
- The store pattern is infectious in the other direction: setters return `void`, getters read state, and reactive dependencies in components are the same whether the value comes from `$state` directly or a getter wrapping it.
- `$derived` is still used freely in `.svelte` components where the test harness mounts the component, and in per-component reactive expressions.
- Re-evaluation triggers: Svelte fixes `$derived`'s synchronous semantics in non-DOM environments; vitest ships a Svelte-aware runner that handles derivations correctly; a future rune replaces both `$state` and getters with a primitive that works in both contexts.
