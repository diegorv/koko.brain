# 15: Log the tab-switch scroll path so the fresh-tab scroll-down can be diagnosed

**Status:** resolved

Priority: P3 (instrumentation for an investigation; a second render wave of about 170 ms on fresh tabs)

**What to build:** The logging that lets the owner's next session show the cause. No fix in this Issue: the agent cannot run the app, so the cause is found from the owner's log and a fix goes into a follow-up Issue. Fresh tabs report a first visible range that starts well below the top (fruit fly: `1657-4535` at 17:54:50.356, Laya: `858-3888` at 50.700), right after the previous tab was at the top, and then draw a second wave (`[NAV] click -> next paint 171ms` at 50.536). Saved tabs restored at the top show no second wave (docReplace to first frame 24 ms against 121 ms). The F deep dive blamed the previous tab's scrollTop; the verifier refuted that (Radar's frame showed visible ranges from 0 before fruit fly's dispatch), and the CodeMirror scroll anchor maps to pos 0 at scrollOffset 0 (`@codemirror/view` `index.js:6349-6360,8296-8310`). The cause is unknown.

Add `debug('TAB_SWITCH', ...)` lines in the tab-switch path (`MarkdownEditor.svelte`), one per step, with the tab path: `scrollDOM.scrollTop` and `view.viewport` right before the doc replace, right after it, after the scroll restore, and in the next two animation frames; the saved scroll state used (or that none was found, for a fresh tab); and any other code that writes `scrollTop` or dispatches `scrollIntoView` during the switch (find them by reading the path, and log each). Use `debug()`, so the lines cost nothing with the debug log off. No note text in any line. A candidate fix for later is `scrollIntoView(0)` in the dispatch, which `getViewport` honours (`index.js:6505-6508`); do not ship it here.

**Blocked by:** 03

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/core/markdown-editor/MarkdownEditor.svelte (TAB_SWITCH dispatch and scroll restore), node_modules/@codemirror/view/dist/index.js:6349-6360,6496-6508,8296-8310

- [x] Failing first: a tab switch to a fresh tab emits the TAB_SWITCH scroll lines (before replace, after replace, after restore, two frames) with scrollTop and viewport values, through the real `debug()` with the log setting on; none with it off
- [x] Every other `scrollTop` writer or `scrollIntoView` dispatch on the switch path is listed in Notes with file:line and logs a line
- [x] No log line carries note text
- [x] Not verified by the agent: the owner opens a few fresh reading-list notes with the debug log on and the cause is read from that log (follow-up Issue for the fix)

## Notes

- Blocked by 03 so the leftover cost is layout only, not embed `resolveLink`.
- Research: `.scratch/ui-responsiveness/research/F-deep-dive.md` (fix 2), `F-verify.md` (amplifier section).
- Log lines: every line is `[FRONT-END:TAB_SWITCH] scroll <step>, path: <path> scrollTop: <n> viewport: <from>-<to>`; steps `before replace`, `after replace`, `after focus`, `frame 1`, `after restore`, `frame 2`, `frame 3`, `event` (a scroll event on `scrollDOM` from the switch until frame 3), plus `scroll saved view state: ... | none (fresh tab)`. Nothing is read with the debug log off (`logTabScroll`, `MarkdownEditor.svelte:244`).
- scrollTop writers / scrollIntoView on the switch path, each with its log line:
  - `MarkdownEditor.svelte:440-444` scroll restore in frame 1: `frame 1` / `after restore`.
  - `MarkdownEditor.svelte:480-484` pending-scroll `EditorView.scrollIntoView` (a switch with an anchor, `open-note-at.service.ts:48`, `app/editor-host.ts:34`): `pending scrollIntoView pos=N before|dispatched` (both show the pre-scroll scrollTop: CodeMirror writes it in its next measure, so `frame 3` shows the result).
  - `@codemirror/view` 6.43.15 `index.js:5297-5302` focus observer: on a focus event with `scrollTop == 0` it writes back `inputState.lastScrollTop` (set by any scroll event, `index.js:4989-4992`; `inputState` survives `setState`). Reached by `view.focus()` at `MarkdownEditor.svelte:417` when the editor was not focused (sidebar click). Logged by `after focus` and `event`. Lead worth checking first in the owner's log.
  - `index.js:8296-8310` measure-loop scroll-anchor correction (`scrollTop += diff`, or `= scrollHeight` when `scrollAnchorPos < 0`) and `index.js:8289-8293` / `3482-3486` pending `scrollTarget`: inside CodeMirror, logged by `event` lines.
  - Not on the switch path: `wikilink-navigation.ts:43` (same-note anchor), `MarkdownEditor.svelte:300-304` (mount restore).

- 2026-11-03, branch issue/15-fresh-tabs-open-scrolled-down: TAB_SWITCH scroll lines (before/after replace, after focus, frames 1-3, after restore, scroll events, pending scrollIntoView) logged through `debug()` behind the log setting, in MarkdownEditor.svelte, with a test for log on and off. Fix round named the pending-scroll step and tested the log-off guard. Tests: pnpm check 0 errors; MarkdownEditor.test.ts 13/13; full suite at 9256675c exit=0 (10325 passed, 1 skipped, 1 todo, build OK). Reviews: round 1 APPROVED, round 2 APPROVED (one optional comment-wording nit, not applied).
