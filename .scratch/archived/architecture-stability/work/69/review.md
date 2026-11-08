VERDICT: APPROVED

## Acceptance criteria

- [met] Every `vault-index-updated` emit under `e2e/specs/` sends a full `UpdateResult`, typed, with no `as any` — `grep -rn "vault-index-updated" e2e/specs` lists 9 emits: event-calendar.spec.ts:84, :233, :277, :341, event-calendar-tasks.spec.ts:20, event-calendar-day-drag.spec.ts:24, event-calendar-path-identity.spec.ts:20 and event-calendar-focus.spec.ts:27 emit `e2e.vaultIndex.rescanResult()`, and tasks-view.spec.ts:93 emits `e2e.vaultIndex.update(p, c)`. All 9 go through `const e2e = window.__e2e`, and `e2e/types/global.d.ts` now types `events` as `E2eEventBus` (`e2e/mocks/tauri-event.ts:29-41`, `emit<K extends keyof EventMap>(event: K, payload: EventMap[K])`). `rescanResult()` (`e2e/mocks/vault-index.ts:275-277`) returns all six `UpdateResult` fields. No emit block uses `as any`.
- [met] A spec that emits the old shape fails `pnpm check` (check with a scratch edit, not committed) — I ran my own probe. I replaced event-calendar-tasks.spec.ts:20 with `{ changed: true, affected: [], version: e2e.vaultIndex.version }`, and `pnpm check` exited 1 with `20:42 "Type '{ changed: true; affected: never[]; version: number; }' is missing the following properties from type 'UpdateResult': upserted, removed, fullRescan"`. I restored the file with `git checkout` and `git status` was clean afterwards. The probe can fail only because `tsconfig.json:23` now includes `e2e`. Before this branch no spec was type-checked.
- [met] The full E2E suite passes (`bash scripts/e2e.sh`) — the targeted run passed: `bash scripts/e2e.sh` on the 5 event-calendar specs plus tasks-view.spec.ts and live-preview/arrow-reveal.spec.ts gave `58 passed`, exit=0 (log /tmp/i69-review-e2e.log). Those are every spec the diff touches. The full suite is deliver's to run. I did not take the build report's 298/298 as evidence.

## Checks run by the reviewer

- `pnpm check` at 632bc6a2: exit 0, `212 FILES 0 ERRORS 0 WARNINGS`.
- Scratch old-shape probe: exit 1, 1 error (see criterion 2). Reverted.
- Targeted E2E (`bash scripts/e2e.sh` with the 7 specs above): 58 passed, exit 0.
- No vitest file or app code (`src/`, `src-tauri/`) changed, so vitest, `pnpm build` and cargo are out of scope. `git diff main...HEAD --stat` touches only `e2e/`, `tsconfig.json` and the Issue's work folder.
- Semantics check: the listener (`src/lib/app/tauri-listeners.service.ts:270-273`, `refresh` at :246-253) runs `fullRefresh()` when `fullRescan` is true. That is the refresh these specs got before Issue 65. `rescanResult()` reads `monotonicVersion` after `populate` has bumped it through `onPopulate` → `rebuildAll` (`e2e/mocks/vault-index.ts:522-525`), so it reports the post-rebuild version, the same as the mock's `scan_vault_v2_cached` (`e2e/mocks/tauri-core.ts:108-110`).
- Layer baseline, BASELINE_SIZE and composition roots: untouched.

## Findings

1. nit, `tsconfig.json:23` and `e2e/types/global.d.ts:1-28`: both files are outside the Issue's Files list (`e2e/specs/,e2e/mocks/vault-index.ts`). The edits are needed for criterion 2: without the wider include and the typed bus, no spec payload is type-checked. The same goes for `e2e/specs/live-preview/arrow-reveal.spec.ts:1-2`, the one error the wider include surfaces. Not scope creep. Fix: none; mention the gate widening in the squash commit body.
2. nit, `e2e/specs/event-calendar.spec.ts:79`, `event-calendar-path-identity.spec.ts:15`: the JSDoc says the helper "announces them the way Rust does". Rust announces a watcher or IPC change with `upserted` paths. It sends `fullRescan` only after `scan_vault_v2*`. The payload is a deliberate default (discovery.md, Defaults), but the comment overstates it. Fix (optional): "announces them as a full rescan, the way Rust does after `scan_vault_v2*`".
3. nit, `e2e/specs/tasks-view.spec.ts:59, :109` and `e2e/specs/folder-notes.spec.ts:14-16`: `(window as any).__e2e` remains for `fs` reads and `dialog` calls. None of these is a `vault-index-updated` emit, so criterion 1 holds. A future emit added through `(window as any)` would bypass the new type check, though. Fix (optional, follow-up): retype these to `window.__e2e`.

## Resolution

1. Accepted, no code change: the squash commit body names the gate widening (`tsconfig.json` now includes `e2e`, `e2e/types/global.d.ts` types the event bus, `arrow-reveal.spec.ts` fixed for the error that surfaced).
2. Fixed: the `seedEvents` JSDoc in `event-calendar.spec.ts`, `event-calendar-path-identity.spec.ts` and `event-calendar-focus.spec.ts` (same phrase) now says the helper announces the notes as a full rescan, the way Rust does after `scan_vault_v2*`.
3. Deferred, not fixed here: the remaining `(window as any).__e2e` uses in `tasks-view.spec.ts` and `folder-notes.spec.ts` are `fs` / `dialog` calls, not `vault-index-updated` emits, so criterion 1 holds; retyping them is a follow-up outside this Issue's scope.
