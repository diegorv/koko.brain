VERDICT: APPROVED

# Issue 16 review: live-preview invariants harness

Reviewed `git diff main...HEAD` (69725870, 49f9fe96, 4f5d31f7): the diff adds
`src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts`,
`.../live-preview/fixtures/edge-corpus.md` and `.scratch/architecture-stability/work/16/discovery.md`.
It does not change app code, `layer-baseline.json`, `BASELINE_SIZE`, the composition roots or `ledger.md`.
No `spec.md` exists for architecture-stability.

## Acceptance criteria

- [met] The edge corpus contains at least: — `fixtures/edge-corpus.md`: `[a](\n/url)` at lines 4-5, `![a](\n/url)` at 7-8, `[a\nb](/url)` at 10-11. Nested callouts at 23-29, with `> > > three deep inside the callout` at 29 (and `> > > >` at 27). `%%` lines inside a ```` ```matlab ```` fence at 38-42. A ```` ```queryjs ```` fence inside a `````md` fence at 50-54 (plus mermaid and meta-bind-button fences). Hard breaks followed by a line at 78-83. A bullet list directly under frontmatter at 85-92. `edgeCorpus()` (test:88-97) splits on `@@@` headers, and each document runs as its own case (8 edge cases in the verbose run).
- [met] Invariants: — Each document is checked by `checkInvariants` (test:239-271) at mount, after the cursor move and after each of the 7 steps (test:320-373), over every entry of `view.state.facet(EditorView.decorations)`; function entries are evaluated with the view (test:141-145). Coverage per invariant: **No throws:** mount, step and decoration-evaluation throws are caught and recorded (test:402-424), and a "plugin crashed" console.error is recorded too (test:294, 409). **No duplicate marks:** checked per source (test:251-256). The generated document produces split visible ranges `[{0,2153},{4407,4424}]` (my probe). With the `seenNodes` dedupe line removed from inline-formatting-plugin.ts:135, the harness fails with `source 13 duplicates mark:...:cm-lp-highlight` (my mutation). **No hidden syntax on touched lines:** checked at test:257-263, and the line-start rule at test:302-312. With `lastLine` in reveal.ts:53 changed to always return `line.number`, 20 of 26 cases fail with `revealed by a range ending at its start` (my mutation). **Release matches a fresh view:** the two release steps compare against a fresh view, clipped to the shared visible ranges (test:208-221, 315-318). **Fenced code:** no widget other than CodeBlockWidget may sit inside FencedCode (test:230-236, 264-267). **Document listeners:** checked per (listener, type) pair, with the four widgets asserted present (test:433-477).
- [met] Mutation check on the fixes that still reverse-apply cleanly (121db924, e5be43d7, 8d01b605, 92815cde): with each reverted locally, the harness fails. Record them in the commit message — I re-ran each one myself (`git show <sha> -- src/lib | git apply -R`, harness, `git checkout -- src/lib`; the worktree was clean afterwards). 121db924: 1 failed (edge multi-line links and images). e5be43d7: 25 failed. 8d01b605: 1 failed (edge handler-fault). 92815cde: 1 failed (listener case). All four are recorded in the 49f9fe96 commit message.
- [met] Runtime is under 10 s — My run of `pnpm vitest run .../invariants-harness.test.ts`: Duration 7.05 s, 26/26 passed. The slowest case is 09-code-blocks.md at 444 ms (verbose probe), well below the per-test timeout.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts`: exit 0, 26 passed. My test verdict rests on this file. The branch changes no app code, so there are no other test files of changed code to run. The full suite (`pnpm vitest run && pnpm build`) was not run here; that is deliver's job.
- Probes: a temporary copy of the harness, deleted afterwards, logged every console.error call across the green run (none), the generated document's visible ranges (split in two), and the drag flag right after each synthetic mousedown (always set).
- Gate criterion (`pnpm check` + `pnpm vitest run` + `pnpm build`): `pnpm check` passes. The suite and the build are deliver's to run.

## Findings

1. **minor**: `src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts:399,409`. The console.error spy silences every call but fails only on messages containing `plugin crashed`. CodeMirror reports other exceptions through `logException` as a bare `console.error(e)`, for example a throw inside a live-preview `domEventHandlers` handler (the mousedown, mouseup or dragstart in mouse-selecting.ts), or a `view.dispatch` from such a handler that throws. Those are swallowed and never fail the harness, which weakens "dispatching never throws" for dispatches that come from event handlers. A green run makes zero console.error calls (probe), so the fix carries no flakiness cost: record any call as a problem, with its first argument, instead of filtering on `plugin crashed`.
2. **nit**: `src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts:346,356`. Neither release step asserts that the drag flag is set after the synthetic `mousedown`. If mousedown ever stopped arming the flag, `afterRelease` would pass vacuously. The probe shows it is armed today. Fix: record `drag flag not set by mousedown` when `view.state.field(mouseSelectingField)` is false right after `mouse('mousedown', ...)`.
3. **nit**: `src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts:465-472`. Listener accounting keys on (listener, type) and ignores the `capture` option. An `addEventListener(t, fn, true)` paired with a `removeEventListener(t, fn)` would count as removed, although the browser keeps the listener. No live-preview document listener passes `capture` today (callout-field.ts:104-106, mouse-selecting.ts:43). Fix: include `typeof opts === 'boolean' ? opts : !!opts?.capture` in the key.

## Resolution

All three findings were correct and are fixed in `invariants-harness.test.ts`:

1. `pluginCrashed` is replaced by `consoleErrors`: every `console.error` call during a step is recorded as `console.error: <first argument>`, so exceptions CodeMirror logs from DOM event handlers now fail the harness.
2. Both release steps call `pressMouse`, which records `drag flag not set by mousedown` when `mouseSelectingField` is false right after the synthetic mousedown.
3. The document-listener accounting keys on (listener, type, capture), with capture read from a boolean or an options object.

`pnpm check` exit 0; the harness file passes 26/26.
