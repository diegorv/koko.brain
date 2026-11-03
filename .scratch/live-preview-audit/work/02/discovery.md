# Issue 02 discovery: collection row / pill / bar click reveals source

No `spec.md` exists for live-preview-audit; the Issue and `audit-2026-11-02.md` are the source.

## Files that change

- `src/lib/features/collection/collection-block-widget.ts`
  - `:235` calendar pill, `:352` linear-calendar bar, `:419` table row `tr`:
    each also gets a `mousedown` listener that calls `preventDefault()` +
    `stopPropagation()`, through one small module helper
    (`stopEditorMousedown(el)`), the `attachAddButtons` pattern
    (`widgets.ts:421-436`). The event never bubbles to CodeMirror's
    contentDOM handler, so the cursor stays put and the widget is not revealed.
  - `ignoreEvent()` (`:380-382`) and the `click` handlers stay as they are.
- New test `src/tests/lib/features/collection/collection-block-click.test.ts`:
  the collection cases of `.scratch/live-preview-audit/repro/interactions/widget-click.test.ts`
  (same `realClick` + `mount` harness, `test-helpers` import fixed to
  `../../core/markdown-editor/test-helpers`), plus a calendar pill case, a
  linear-calendar bar case, and a control: mousedown on the header
  (`.cm-lp-collection-header`, outside rows/pills/bars) still moves the cursor
  and reveals the source.

## Prior art

- Harness: the repro file above; `table-empty-cells.test.ts` (Issue 01) for the mount helpers.
- Date pinning for calendar/linear views: `collection-block-widget.test.ts:298-330`
  (`vi.useFakeTimers({ toFake: ['Date'] })` + `setSystemTime`).

## Risks / defaults

- Fake Date timers vs `withFullParse` (which swaps `Date.now`): the repro's
  queryjs cases are left out (not this Issue). For pill/bar cases, records are
  dated in the current month instead of faking timers, so `Date.now` stays real.
- preventDefault on mousedown also blocks text selection drag starting on a row;
  matches the other interactive controls. Default taken.
- The "Clicking elsewhere" control uses the header element; a press there is
  not stopped, so CodeMirror places the cursor at the widget position.
