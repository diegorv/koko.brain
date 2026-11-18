VERDICT: APPROVED

Reviewed `git diff main...HEAD` (7d59793ff..b07b0a5f4) in the worktree. No `.scratch/finders-ux/spec.md` exists; the Issue's triage comment (depth resets on reopen, session state, not a setting) is the decision checked.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/plugins/graph-view/graph-view.store.test.ts`: `localDepth` defaults to 1, the setter clamps to 1-3 (0 becomes 1, 5 becomes 3), `reset()` returns it to 1. — graph-view.store.test.ts adds the default assertion in the initial-state case, "setLocalDepth sets a depth within 1 to 3", "setLocalDepth clamps to 1 to 3" (0 -> 1, 5 -> 3), and `setLocalDepth(3)` + `reset()` -> 1. Store: graph-view.store.svelte.ts `localDepth = $state(MIN_LOCAL_DEPTH)`, `setLocalDepth` clamps with `Math.min/Math.max`, `reset()` sets `MIN_LOCAL_DEPTH`. Not persisted (plain module `$state`). Passes.
- [met] Failing test first, `GraphView.test.ts` local mode: for a chain A-B-C centered on A, depth 1 shows 2 notes and depth 2 shows 3 (footer count), with no extra `invoke` call. — GraphView.test.ts "shows the second hop at depth 2 without fetching again": a->b->c plus unrelated d, centered on a, "2 notes" then `setLocalDepth(2)` -> "3 notes", "2 links", `invoke` call count unchanged. Probe: deleting `graphViewStore.localDepth;` from the rebuild effect in GraphView.svelte makes this test fail (restored afterwards). Implementation: `getBaseData` passes `graphViewStore.localDepth` to `getLocalGraph`; rebuild only calls `initSimulation` over cached `fullData`.
- [met] `GraphControls.test.ts`: the stepper shows only in local mode; Increase is disabled at 3 and Decrease at 1; clicking them changes `graphViewStore.localDepth`; the group and buttons have accessible names. — GraphControls.test.ts `depth stepper` block: "is hidden in global mode" (no `[role=group][aria-label="Link depth"]`), local mode shows value 1 with Decrease disabled, clicks step 1 -> 2 -> 3 (Increase disabled) -> 2 on the store. Group `aria-label="Link depth"`, buttons `aria-label="Decrease depth"` / `"Increase depth"`, shadcn `Button` (GraphControls.svelte:66-91).
- [met] Global mode ignores depth. — GraphView.test.ts "is ignored in global mode": global mode at depth 2 still shows "4 notes" and "2 links"; `getBaseData` only calls `getLocalGraph` when `mode === 'local'`.
- [met] `graph-view.service.test.ts`: with `localDepth` 3, closing the Graph tab and opening it again (`openGraphTab` and `toggleGraphTab`) gives depth 1; focusing the already open tab keeps 3. — graph-view.service.test.ts `local depth across reopen`: four cases (reopen via `openGraphTab`, reopen via `toggleGraphTab`, focus via each keeps 3). Probe: removing `graphViewStore.setLocalDepth(1)` from graph-view.service.ts makes the two reopen cases fail (restored afterwards). The reset sits only in the `addTab` branch; `GraphView` mount does not touch depth.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` run by this review: exit 0, 0 errors, 0 warnings. Targeted tests run by this review: `pnpm vitest run src/tests/lib/plugins/graph-view/` exit 0 (5 files, 114 tests) and `src/tests/scripts/sync-wiki-docs.test.ts` exit 0 (help docs). The full suite is deliver's to run.

## Findings

1. nit, src/lib/plugins/graph-view/GraphControls.svelte:65: the stepper shows in local mode even when `centerPath` is null, where `getBaseData` (GraphView.svelte:85-89) returns the full graph and the depth does nothing. The Issue only asks for "local mode only" and discovery records this as a default taken, so no change is required; if wanted, gate it on `graphViewStore.centerPath` too.
2. nit, src/tests/lib/plugins/graph-view/GraphControls.test.ts:226-234: the group and buttons are found by `aria-label` attribute selectors rather than by computed accessible name (role + name). It proves the attributes exist, which is what the criterion needs; no change required.

## Checks run by this review

- `pnpm check`: exit 0, 234 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/plugins/graph-view/`: exit 0, 5 files, 114 tests (graph-view.store.test.ts, graph-view.service.test.ts, GraphView.test.ts, GraphControls.test.ts, graph-view.logic test). The test verdict rests on these files.
- `pnpm vitest run src/tests/scripts/sync-wiki-docs.test.ts`: exit 0, 7 tests.
- Two mutation probes (above), both caught by the new tests; sources restored, worktree clean.
- No change to `src/tests/lib/architecture/layer-baseline.json` or `BASELINE_SIZE`; no `src-tauri/` change. No scope creep: the diff touches only the five files the Issue names plus their tests.

## Resolution

1. Rejected. Showing the stepper in local mode without a center is the default recorded in discovery.md ("shown only when `mode === 'local'` (also when no center is set)"), and the Issue asks only for "local mode only". Keeping it visible avoids the control appearing and disappearing as the active note changes; the depth is kept and applies as soon as a center is set.
2. Rejected. The `aria-label` selectors prove the accessible names the criterion asks for; the reviewer requires no change.
