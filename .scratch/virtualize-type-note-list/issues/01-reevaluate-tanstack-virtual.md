# Re-evaluate TanStack Virtual once its Svelte 5 adapter is fixed

Status: needs-info

## Context

TypeNoteList virtualization shipped with `virtua` (VList, `virtua/svelte`).
The user prefers TanStack Virtual long-term, but as of 2026-06-11 the
`@tanstack/svelte-virtual` adapter has an open Svelte 5 bug
(https://github.com/TanStack/virtual/issues/866): the list renders empty
unless a workaround calls the private `$virtualizer._willUpdate()` from a
hand-rolled mounted state. PeerDeps allow `svelte ^5.0.0` since 3.13.28, but
the adapter is built on Svelte 3/4 stores, not runes. Decision recorded in
conversation on 2026-06-11: keep virtua, re-evaluate later.

## Trigger to act

TanStack/virtual #866 closed (or the adapter rewritten for runes / snippets).

## What re-evaluation involves

- Confirm the adapter renders without private-API workarounds on Svelte 5.
- Compare against the shipped virtua integration in
  `src/lib/features/type-definitions/TypeNoteList.svelte` (children snippet,
  per-row divider inside item, blank-area contextmenu via
  `closest('[data-note-row]')`).
- TanStack is headless: switching means hand-wiring the scroller, absolute
  item positioning, and `measureElement` for the variable-height rows
  (pills + date line). Only worth it if ecosystem benefits materialize.
- The regression contract lives in
  `src/tests/lib/features/type-definitions/TypeNoteList.perf.test.ts`
  (bounded mounted-row count, content assertions, 1500ms click ceiling) and
  must pass unchanged in spirit with any replacement.
