# 03: QueryJS tables: Prev and Next work, tables scroll, buttons show focus

**Origin:** design review 2026-11-17, proposals P82, P09 (QueryJS half) (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/collection-queryjs.html` (P82, P09), research `.scratch/ux-quick-wins/research/verdict-collection.md` (T3) and `breakdown.md` (old ticket 04). The inline collection block half of P09 is ticket 14.

**What to build:**

1. **Prev and Next survive the click.** `mousedown` `stopPropagation` on the pager buttons (`src/lib/plugins/queryjs/kb-ui.ts:526-538`), the pattern the Run button already uses (`src/lib/plugins/queryjs/queryjs-block-widget.ts:217`, Retry at `:329`). Without it the widget is revealed and destroyed before the click fires. The container-level guard (open-itens 086's other variant) stays out: it would change every control a script appends.
2. **Tables scroll.** `kb.table` (`src/lib/plugins/queryjs/kb-api.ts:316-346`) and the non-paginated `kb.ui.table` append a `cm-lp-table-scroll` div holding the `<table>` and still return the `<table>` (public contract `src/lib/plugins/queryjs/contract/kb-api.v1.ts:623-730`). The paginated `kb.ui.table` keeps returning its `cm-lp-qjs-table-wrapper` div as the container's first child; inside it the `<table>` sits in the scroll div and the Prev and Next controls stay outside it, so they do not scroll away.
3. **No mid-word breaks for dates and numbers.** `renderValue` (`kb-api.ts:489-523`) gives KBDateTime, Date and number cells a nowrap class (a new `number` branch; today numbers fall through to the `String` branch). Edit only those branches: the array branch belongs to open-itens 060. The `kb.list` and `kb.paragraph` callers of `renderValue` get the class too, which is harmless. Mirror it in `KBUI.defaultRenderValue` if that fallback renders those types.
4. **Focus rings.** `.cm-lp-qjs-run:focus-visible` and `.cm-lp-qjs-table-nav-btn:focus-visible` copy the `--ring` box-shadow of `.cm-lp-meta-bind-btn:focus-visible` (`src/lib/core/markdown-editor/extensions/live-preview/styles.ts:734-736`). Edit only the qjs rules in `styles.ts` (`:917`, `:954-996`).
5. **Script compatibility, stated.** A vault QueryJS script that relies on the returned table being a direct child of `kb.container` changes behaviour: selectors such as `:scope > table` or `container.firstElementChild` now find the scroll div. A script that moves the returned table elsewhere leaves an empty zero-height scroll div in `kb.container`. Mods that call `ctx.kb()` with a detached container (`help/documentation/mods/10-querying-the-index.md:44`) mount outside the editor, where the theme rules do not apply, so they get the wrapper with no styling. The ticket records this; it does not add an opt-out.

Not in this ticket: ellipsis on QueryJS cells (arbitrary script output, truncation would hide user data); `file.folder` stays absolute; the `renderValue` array branch (open-itens 060). This ticket covers item 1 of open-itens 086 only; 086 stays open.

**Size:** S.

**Blocked by:** none

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [x] Failing test first: port "pager Next survives its click and turns the page" from `.scratch/archived/live-preview-audit/repro/interactions/widget-click.test.ts:105-115` into a new test under `src/tests/lib/plugins/queryjs/` (real CodeMirror, set up like `src/tests/lib/features/collection/collection-block-click.test.ts`: `mountMarkdownView` plus `livePreviewExtensions`): the widget stays drawn, the indicator reads `Page 2 of 3`, the cursor does not move. Same for Prev. It fails today.
- [x] `src/tests/lib/plugins/queryjs/kb-ui.test.ts:753` (`expect(result).toBe(container.firstElementChild)`, "returns the table element") fails once the container's first child is the scroll div. It is changed on purpose to `expect(result.parentElement).toBe(container.firstElementChild)` plus a check that the parent has `cm-lp-table-scroll`; the `result.tagName === 'TABLE'` line stays. `:619` (`container.firstElementChild` read as the table for `th` lookups) is adjusted the same way.
- [x] `kb.ui.table` and `kb.table` still return a `TABLE` (`kb-api.test.ts:719` unchanged) whose parent is the scroll div inside the container; a paginated `kb.ui.table` returns the wrapper as the container's first child, with the nav outside the scroll div (the `nth-child` nav selectors at `kb-ui.test.ts:791-801` stay green).
- [x] A `KBDateTime`, a `Date` and a number cell carry the nowrap class; a string cell does not (`kb-api.test.ts`).
- [x] Both buttons have a `:focus-visible` rule using `--ring`; the radius ladder is unchanged (`styles.test.ts`); `kb-api-contract` and `queryjs-block-widget` tests pass.
- [x] A test pins the compatibility note: a script that moves the returned table leaves an empty scroll div in `kb.container` and nothing throws.
- [x] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P82.** QueryJS table Prev and Next probably destroy the widget on mouse click (unverified lead). They do not stop mousedown (live-preview rule 11); the tests use `.click()` and cannot catch it. Verify in the app first; if paging fails, stop mousedown propagation and add a mousedown-based test. Validation: keep. The Run buttons in the same widget already carry the fix. The archived real-CodeMirror repro confirms the lead, so no app check is needed first.
- **P09 (QueryJS half).** Result tables in notes break words mid-word and cannot scroll, and the Run and Prev/Next buttons have no focus-visible style. Header, date and number cells get `nowrap`, each table gets an `overflow-x: auto` container, the buttons get a `:focus-visible` ring. Leave `file.folder` absolute. Validation: revise.

## Problem

On a dashboard note the Prev and Next buttons do not page: the first mousedown puts the cursor in the widget and reveals the source, the widget is destroyed, and the click lands on nothing. Wide result tables overflow the note with no scroll, and dates and numbers split across lines. Run and Prev/Next show no focus ring when reached by keyboard.

## Evidence

Checked at `085b23c5d`.

- `src/lib/plugins/queryjs/kb-ui.ts:526-538`: `prev.onclick` and `next.onclick` with no mousedown handler. `queryjs-block-widget.ts:177-179` `ignoreEvent()` returns false; `:217` Run and `:329` Retry already stop mousedown.
- `.scratch/archived/live-preview-audit/repro/interactions/widget-click.test.ts:105-115`: real-CodeMirror repro that fails today (kept in open-itens 086).
- `styles.ts:954-967` `.cm-lp-qjs-table`, `:917` `.cm-lp-qjs-run`, `:984` `.cm-lp-qjs-table-nav-btn` have no `:focus-visible`; the pattern to copy is `:734-736`.
- `kb-api.ts:316-346` `kb.table`; `kb-ui.ts:411-554` `kb.ui.table`; `kb-api.ts:489-523` `renderValue`. The month grid and linear calendar of the collection block reuse the class `cm-lp-collection-table` (`collection-block-widget.ts:203-205,304-306`), so every new rule here keys on `cm-lp-table-scroll` or a qjs class, never on that shared class.

## Sequence with

Ticket 08 (next in the `styles.ts` chain, widget rules elsewhere in the file), 13 and 14 (same file, collection and callout rules); one at a time, never in parallel worktrees. Ticket 14 adds the same `cm-lp-table-scroll` class for the inline collection block: whichever lands first defines it. Open-itens 060 edits `renderValue`'s array branch next to this ticket's branches.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): none. The script compatibility note in What to build item 5 is the coverage check's finding, not an owner question.
- 2026-11-18, delivered from branch issue/03-queryjs-tables-prev-next-work-tables: the QueryJS table pager keeps its widget through a mouse click (Prev and Next turn pages, cursor stays), result tables sit in a `cm-lp-table-scroll` div with dates and numbers on one line, and both pager buttons get a `--ring` focus-visible rule. Full suite 654 files, 17383 passed, 56 skipped, 1 todo (exit 0). Review round 1: APPROVED (one nit, no change needed, see review.md Resolution).
