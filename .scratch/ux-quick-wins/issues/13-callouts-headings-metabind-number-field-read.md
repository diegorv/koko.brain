# 13: Callouts, headings and the meta-bind number field read cleanly

**Origin:** design review 2026-11-17, proposals P114 (part), P110 (part), P111, prototype `.scratch/design-review/prototypes/editor-authoring.html`, research `.scratch/ux-quick-wins/research/verdict-editor.md` (ticket E2) and `breakdown.md` (old ticket 08).

**What to build:** widget and style edits only, no decoration rework: the live-preview decoration set, its counts and its reveal rules stay as they are; the only plugin change is one extra custom property in an existing line decoration's `style`.

1. **Callout type label.** The callout line style gains `--callout-accent: <header.color>` next to `border-left-color` (`src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:171-174`). `.cm-lp-callout-type-label` (`.../styles.ts:495-508`) goes from `text-transform: lowercase` to `capitalize` and from `color: inherit` to `color: var(--callout-accent, inherit)`.
2. **Callout body not italic.** Body italics come from the quote highlight (`highlight-styles.ts:39`, `tags.quote`). Cancel them with the zero-specificity `:where(.cm-lp-callout) span { font-style: normal }` (a plain `.cm-lp-callout span` rule would outrank the single-class italic rules of the meta-bind and math error spans, `styles.ts:772,802-806,873`, because the theme is an `EditorView.baseTheme`), plus `.cm-lp-callout .cm-lp-italic, .cm-lp-callout .cm-lp-italic span { font-style: italic }` so authored emphasis, and bold inside it, stays italic.
3. **Heading space above.** `padding-top: var(--heading-hN-space-above, X)` on `.cm-lp-h1` to `.cm-lp-h3` only (`styles.ts:171-191`), starting at 0.6em, 0.5em and 0.4em, tuned by eye. h4 to h6 get none. The class is stable on reveal (`inline/handlers/heading-handler.ts:18,42`), so the padding does not jump on click. The per-level setting itself is deferred; the variable name lets it land without CSS changes.
4. **Number field width.** `.cm-lp-meta-bind-input[type="number"]` gets `field-sizing: content; min-width: 4ch; max-width: 16ch` (`styles.ts:783-794` is the shared rule and stays unchanged). Safari 26.2 and later support `field-sizing`; older WebKit keeps today's width. A field that falls back to `type="text"` for a value it cannot hold keeps today's width (`widgets.ts:1057-1060`).

Not in this ticket: a default callout title from the type name, chevron dimming (the chevron on every callout is the tested Phase 17 decision, `callout-field.ts:217`), a per-level heading setting (`settings.types.ts` is an mvp-claude file), date input chrome (WebKit internals).

**Size:** S

**Blocked by:** 08

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus `bash scripts/e2e.sh` for the specs below (they are existing specs; no selector changes).

- [x] Failing test first (`src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts`, `exactRule`): `.cm-lp-callout-type-label` contains `text-transform: capitalize` and `color: var(--callout-accent, inherit)`.
- [x] Failing test first (`plugins/callout-field.test.ts`, `computeCallouts`): the header line of a `[!warning]` callout carries `--callout-accent: ` plus the warning colour in its `style`; the existing decoration counts are unchanged.
- [x] The emitted theme has a `:where(.cm-lp-callout) span` rule with `font-style: normal` and no plain `.cm-lp-callout span` rule, and a `.cm-lp-callout .cm-lp-italic` rule with `font-style: italic`.
- [x] `.cm-lp-h1` to `.cm-lp-h3` contain `padding-top: var(--heading-h1-space-above` (and h2, h3); `.cm-lp-h4` to `.cm-lp-h6` contain no `padding-top`.
- [x] A `.cm-lp-meta-bind-input[type="number"]` rule has `field-sizing: content` and `min-width: 4ch`; the shared `.cm-lp-meta-bind-input` rule is unchanged.
- [x] E2E: `click-reveal/callout-text.spec.ts`, `click-reveal/callout-controls.spec.ts`, `click-reveal/heading.spec.ts`, `headings.spec.ts` and `click-reveal/meta-bind-*.spec.ts` pass. `callout-text.spec.ts:71,152` use `toHaveText` (textContent), so they stay green and cannot prove the capitalisation; the rule test and the eye check do.
- [ ] Owner eye check, recorded in the commit body (jsdom cannot show it): a callout with `*emphasis*` and a meta-bind error inside (both still italic, plain body), a yellow `warning` label readable in the light theme, heading spacing at the top of a note, a number control beside a select in WKWebView.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P114.** "Cancel the italics inside `.cm-lp-callout`. Show the type in its callout colour in Title case, and use the type name as the title when none is given. Keep the chevron on every callout." Part taken: italics and the coloured Title case label; the default title and chevron dimming are deferred.
- **P110.** "Add an optional 'space above' value to the per-level heading typography, applied as padding-top with a small default for H1-H3." Part taken: the padding with a CSS variable default, no setting.
- **P111.** "Size the number input to its content (`field-sizing: content`, min about 4ch)." The date input chrome part is deferred.

## Problem

The callout type word is lowercase, in the body colour, and the body inherits the quote italics, so a warning reads as a quote. Headings get no top space and sit closer to the text above than to their own content. The meta-bind number field is about 190 px wide.

## Evidence

Checked at 085b23c5d.

- `styles.ts:495-508` label rule, `:171-191` heading rules (no padding), `:783-794` input rule (no width), `:772,802-806,873` the error spans that a plain callout span rule would break.
- `callout-field.ts:171-174` the line decoration with `border-left-color` only.
- `highlight-styles.ts:39` the quote italics; `inline/markdown-highlight-style.ts:17` the `cm-lp-italic` class.
- `field-sizing` support: caniuse lists Safari 26.2 and later; the host runs macOS 26 (checked in the verdict, not in the running webview).

## Why blocked

- 08: it adds failure and progress rules (`.cm-lp-image-missing`, the mermaid placeholder) to the same `styles.ts` and edits `widgets.ts`; the live-preview theme is a serial chain (03, 08, 13, 14), never parallel worktrees.

## Sequence with

- 14 (inline collection block) edits the collection rules of `styles.ts`; it is blocked by this ticket.
- 03 (QueryJS tables) and 08 started the same `styles.ts` chain; the colour tickets (39, 40) may change `--lp-*` or `--callout-*` tokens that the coloured label reuses; the label's contrast depends on the callout colours.
- 46 (frontmatter in source mode) adds a source-mode rule and names the theme file it uses; check that file when 46 is scheduled.
- shell-sidebars-ux 33 edits `widgets.ts` mousedown sites; this ticket does not touch `widgets.ts`.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. No owner questions on this ticket.
- 2026-11-18, deliver (branch issue/13-callouts-headings-metabind-number-field-read): coloured, capitalised callout type label via `--cm-lp-callout-accent` (renamed from `--callout-accent`, which AC 1 and 2 name, to satisfy theme-css-contract.test.ts), plain callout body with italics kept, top padding for h1-h3, sized meta-bind number field. Tests: full suite at 86036c1fd passed (654 files, 17409 passed, 56 skipped, 1 todo); first run at 97a58f289 failed on the theme contract, fixed by the rename. Reviews: round 1 APPROVED, round 2 APPROVED. Owner eye check in WKWebView still pending.
