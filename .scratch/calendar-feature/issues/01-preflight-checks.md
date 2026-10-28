# 01: Pre-flight answers recorded for the agent-verifiable checks

**What to build:** Notes > Pre-flight log in the plan records a sourced answer (the package file read, the `node -e` output, or the probe result) for every pre-flight check an agent can run headless: the bits-ui Popover and Dialog props, the svelte-sonner toast action, the lucide deep icon paths, the yaml `Document` / `visit` API, the CodeMirror keymap grep for the calendar toggle, jsdom pointer events and the runtime time-zone switch, the state of the overlapping plans, and the Playwright clock and `timezoneId`. Every ticket whose check came back "no" already names its Notes > Risks fallback, so later tickets build on verified APIs instead of expected ones. No source file changes.

**Plan reference:** Task 1 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 30-54). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done. The "add the plan" part of Task 1 already landed in 4da82a3, so this ticket covers the checks (a) to (h) except the two WebView key checks of (e) (lines 42-43), which are ticket 02.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `.scratch/calendar-feature/plan-2026-10-28.md` (modify; Notes > Pre-flight log, lines 1333-1334)
- `.scratch/calendar-feature/issues/*.md` (modify, only the tickets a "no" switches to a fallback)

**Gate:** none (no source change). `git diff --cached --stat` lists only the plan file and any ticket file switched to a fallback.

- [x] If `node_modules` was absent, `pnpm install --frozen-lockfile` ran first and `pnpm-lock.yaml` is unchanged; the log names the package paths read for each answer
- [x] (a) bits-ui 2.19.5: the log names the `Popover.Content` prop that anchors to a non-trigger element or a virtual rect (expected `customAnchor`), whether a `Popover.Portal` part exists under `node_modules/bits-ui/dist/bits/popover/`, and that the prop passes through the `{...restProps}` spread of `src/lib/components/ui/popover/popover-content.svelte:10, 23`; and whether `onOpenAutoFocus` / `onCloseAutoFocus` (with `preventDefault`) exist on both `Popover.Content` and `Dialog.Content` and pass through `src/lib/components/ui/dialog/dialog-content.svelte:16, 33` (feeds tickets 26 and 27)
- [x] (b) svelte-sonner 1.2.1: the log says whether `toast(msg, { action: { label, onClick } })` works (feeds tickets 24, 29 and 31)
- [x] (c) `@lucide/svelte`: the log says whether the deep paths `icons/calendar-range`, `icons/map-pin` and `icons/triangle-alert` exist (feeds ticket 21's tab icon and the `calendar-range` icon in tickets 32 and 33)
- [x] (d) yaml 2.9.0: the log holds the one-off `node -e` output showing whether `new Document({ date: '2026-11-10', start: '09:30' }).toString()` emits both values bare, and says whether `parseDocument(raw, { uniqueKeys: false })` plus `visit` expose `comment` / `commentBefore` on the document and on nodes, a `YAMLMap` or `YAMLSeq` nested inside a `YAMLSeq`, repeated keys within one map's `items`, and `anchor` on nodes plus `Alias` nodes (feeds ticket 12)
- [x] (e) bullet 1: the log says whether `Mod-Shift-c` / `Shift-Mod-c` is absent from the `@codemirror/commands` defaultKeymap, the `@codemirror/search` searchKeymap, the `@codemirror/autocomplete` completionKeymap and `core/markdown-editor/setup/editor-extensions.ts:91-105` (feeds ticket 31)
- [x] (f) the log says whether jsdom 30.1.3 implements `PointerEvent` and `Element.setPointerCapture`, and whether assigning `process.env.TZ = 'America/New_York'` at runtime in a vitest 4 test changes `new Date(2026, 2, 8, 10).getTimezoneOffset()` and switches back on restore (feeds ticket 30; tickets 05 and 08 consume it only through `describe.runIf`)
- [x] (g) the log records which tickets under `.scratch/sveltekit-3-migration/issues/` are closed (05 decides `$lib` versus `#lib`, 02 bumps bits-ui and runed, time-gated to about 2026-10-30), the bits-ui and runed versions resolved in `pnpm-lock.yaml` today (expected `bits-ui@2.19.5`, `runed@0.35.1`), and which tasks of `.scratch/p2p-sync/plan-2026-08-25.md` are done; this is the baseline for the bits-ui re-check in tickets 26 and 27, while the `$lib` / `#lib` rule is re-checked live by each ticket (lines 931-932)
- [x] (h) Playwright 1.64, from `node_modules/playwright-core/types/types.d.ts`: the log says whether `page.clock.install({ time })` before `page.goto` keeps time flowing from that instant (so `Date.now`-based windows such as recent-save marks still expire), and whether the chromium project honors `test.use({ timezoneId })` (feeds ticket 21 and every later write E2E through the fixture)
- [x] Every "no" switched the affected ticket file to its fallback in Notes > Risks item 4 (lines 1250-1257), and the log names the ticket changed: (a) no anchor prop: a feature-local fixed-position card; `onCloseAutoFocus` missing: focus the block from the `onOpenChange(false)` callback after a `tick()`; (b) plain toasts; (c) `calendar-days` and `alert-triangle`; (d) the raw-line heuristic that refuses more often; (e) Cmd+Shift+Y; (f) no jsdom pointer events: logic-only drag tests plus E2E; runtime `process.env.TZ` ignored: the DST blocks skip through `describe.runIf` and the Task 21 `timezoneId` E2E spec carries the DST check; (h) `install` freezes time: `page.clock.setFixedTime` in the read-only specs and `page.clock.runFor` where recent-save windows matter; `timezoneId` ignored: `TZ` pinned for the spec through `scripts/e2e.sh` arguments, and recorded
- [x] Gate green (no source change; `git diff --cached --stat` lists only the plan file and any switched ticket file); one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 11:04 — discovery — plan written to work/01/discovery.md; only the plan log and ticket 30 (if (f) says no) change — 636991c8
- 2026-10-28 11:05 — implement — Pre-flight log filled for (a)-(h) minus ticket 02's two WebView checks; one "no" ((f) no `setPointerCapture` in jsdom) switched ticket 30 to logic-only drag tests; (h) answered from source, no 1.64 browser installed — abf710b5
- 2026-10-28 11:10 — review — VERDICT: APPROVED; all criteria met, answers re-verified independently; 4 low/info clarifications + 1 nit in work/01/review.md — f1d9cab5
