# 01: click-reveal mermaid "line after the diagram" fails intermittently on CI

**What to build:** Find why `e2e/specs/live-preview/click-reveal/mermaid.spec.ts:79` ("clicking the line after the diagram moves the cursor there and keeps it rendered") sometimes puts the cursor on an empty line on the Linux CI runner, and fix the app or the test, whichever is wrong.

**Blocked by:** none

**Status:** needs-info

- [ ] A second CI failure is captured with the line positions at click time (add a temporary log of the "After line." `.cm-line` top, the SVG height and `view.lineBlockAt(pos).top + view.documentTop` right before and after the click; reach the view through `document.querySelector('.cm-content').cmTile.root.view`).
- [ ] The cause is named with evidence from that capture, not inferred.
- [ ] The fix makes the test pass on CI across at least 3 consecutive Main checks runs, and the temporary logging is removed.

## Notes

Observed:
- Main checks run 45709227505 on `ef2e7ed3d`, shard E2E 2/4: failed on the first try and both retries with `Expected: "After line."`, `Received: ""` (the active line is blank).
- Main checks run 45711732259 on `be1563fef`, same shard: passed on the first try. `b258da466` (the mermaid style rescope) also passed. So it is intermittent, not caused by one commit.
- The same failing run also had `click-reveal/meta-bind-button-error.spec.ts:61` fail once and pass on retry, so click-reveal tests in general look timing-sensitive on CI.

From the trace of the failing run (artifact `playwright-report-2`, expires 2026-12-02):
- Playwright reported the "After line." click target as visible and stable and clicked it at y=447.17. Earlier in the same test, before the SVG rendered, "End line." was clicked at y=368.67, so everything below the diagram moved down once the SVG landed.
- Locally (macOS, Chromium) the same line sits at y=435 with the SVG 152 px tall: the Linux layout differs, probably font metrics in the diagram.

Ruled out (local, only this test, 1 worker):
- Plain run: 3/3 pass.
- 6x CPU throttling through CDP `Emulation.setCPUThrottlingRate`: 4/4 pass; the line does not move between locate and click.
- Missing `view.requestMeasure()` in `MermaidWidget` after the async render (the embed and image widgets in `widgets.ts` call it): with CodeMirror's scroller `ResizeObserver` disconnected, the height map still matched the DOM right after the SVG appeared, so CodeMirror re-measures on its own. Adding the call would not change this test.

Ideas not yet tried: run only this spec on the Linux runner via a workflow_dispatch job with the logging above and `--repeat-each=20`; compare the SVG height on Linux to macOS.
