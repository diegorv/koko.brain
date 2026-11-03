# 15: Find why a freshly opened tab lands scrolled down and draws a second viewport

**Status:** needs-triage

Priority: P3 (investigation; a second render wave of about 170 ms on fresh tabs)

**What to build:** A diagnosis, then a fix if the cause is clear. Fresh tabs report a first visible range that starts well below the top (fruit fly: `1657-4535` at 17:54:50.356, Laya: `858-3888` at 50.700), right after the previous tab was at the top, and then draw a second wave (`[NAV] click -> next paint 171ms` at 50.536). Saved tabs restored at the top show no second wave (docReplace to first frame 24 ms against 121 ms). The F deep dive blamed the previous tab's scrollTop; the verifier refuted that (Radar's frame showed visible ranges from 0 before fruit fly's dispatch), and the CodeMirror scroll anchor maps to pos 0 at scrollOffset 0 (`@codemirror/view` `index.js:6349-6360,8296-8310`). The cause is unknown.

Start with logging in the tab-switch path (`[TAB_SWITCH]` in `MarkdownEditor.svelte`): scrollTop before and after the doc replace, the saved scroll state used, and the first `view.viewport`. Then decide on a fix (for example `scrollIntoView(0)` in the dispatch, which `getViewport` honours, `index.js:6505-6508`).

**Blocked by:** 03

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/core/markdown-editor/MarkdownEditor.svelte (TAB_SWITCH dispatch and scroll restore), node_modules/@codemirror/view/dist/index.js:6349-6360,6496-6508,8296-8310

- [ ] Cause found and written in Notes, with the log lines that prove it
- [ ] If fixable: failing test first (a fresh tab dispatch ends with scrollTop 0 and one viewport draw), then the fix
- [ ] If not fixable here: Notes say why, and the Issue closes as wontfix or moves on

## Notes

- Blocked by 03 so the leftover cost is layout only, not embed `resolveLink`.
- Research: `.scratch/ui-responsiveness/research/F-deep-dive.md` (fix 2), `F-verify.md` (amplifier section).
