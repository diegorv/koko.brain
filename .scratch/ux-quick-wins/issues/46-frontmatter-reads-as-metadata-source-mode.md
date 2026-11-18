# 46: Frontmatter reads as metadata in source mode

**Origin:** design review 2026-11-17, proposal P11 (the source-mode part; the canvas card half is ticket 04), prototype `.scratch/design-review/prototypes/editor-authoring.html`, research `.scratch/ux-quick-wins/research/verdict-editor.md` (E3) and `breakdown.md` (old ticket 46).

**What to build:**

1. **A source-only line decoration.** A new `ViewPlugin` in a new folder `src/lib/core/markdown-editor/extensions/source-frontmatter/` (`source-frontmatter.ts` and an `index.ts`, the shape of `extensions/callout/callout.ts` and `index.ts`) reuses `findFrontmatterBlock` and `FRONTMATTER_FENCE_RE` from `extensions/live-preview/parsers/frontmatter.ts:10-32`; it adds no new parsing module. Lines from the opening `---` to the closing `---` get the class `cm-source-frontmatter`. It recomputes on `docChanged` only. No class when line 1 is not a fence, when the fence is unclosed, or for a later `---` in the body.
2. **Wired into source mode only.** `sourceModeExtensions()` (`src/lib/core/markdown-editor/setup/editor-extensions.ts:99-107`) gains it, next to `calloutDecoration()`. Live preview does not install it, so its decorations are not touched.
3. **The theme rule lives in that new file.** An `EditorView.baseTheme` in `source-frontmatter.ts` sets the lines and their descendant spans (`.cm-source-frontmatter, .cm-source-frontmatter span`) to body font size, normal weight and `var(--syntax-meta)` (`src/app.css:300`). The precedent is `wikilinkStyles` in `extensions/wikilink/decoration.ts:63-80`. It is not in `live-preview/styles.ts`, which is the live-preview theme and is in the 03, 08, 13, 14 edit chain, so this ticket adds no edge to that chain. The rule must beat the heading highlight on the span: the YAML above the closing `---` parses as a setext H2, and `sourceHeadingSize` (`highlight-styles.ts:51-58`) gives that span `fontSize: var(--heading-h2-font-size, 1.618em)`.
4. **Stated exception.** The ticket-sizing rule excludes "editor decoration rework". This adds one new decoration in source mode only and changes no live-preview plugin; read `docs/agents/live-preview-rules.md` before starting (rules 4 and 5 on `update()` cost apply in spirit: no scan on pure scroll or selection change).

Not in this ticket: keys styled apart from values in source mode (polish on top of this, later); the canvas card preview (ticket 04); any change to live preview's frontmatter field (`frontmatter-field.ts`) or to how frontmatter is written.

**Size:** S.

**Blocked by:** none

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh live-preview/source-mode.spec.ts and bash scripts/e2e.sh source-mode-toggle.spec.ts (the surface is the source-mode editor).

- [x] Failing test first, `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts` (real CodeMirror view via `mountMarkdownView`, as the file does): in source mode `---\n_type: Meeting\n---\n# Title` puts `cm-source-frontmatter` on lines 1 to 3 and not on line 4; live preview puts it on none; the mode compartment swap toggles it. The `legacyClasses` helper (`:459-465`) gains a `frontmatter` count on purpose, so its four `toEqual` assertions (`:470,479,490,493`) gain the key.
- [x] No class for a doc that does not start with `---`, for an unclosed fence, or for a body `---` after the block; typing the closing fence adds the class and deleting it removes it.
- [x] The new theme has a rule for `.cm-source-frontmatter` and its spans with `font-weight: normal` and `var(--syntax-meta)`, asserted by collecting the rule strings from the exported extension (the approach of `themeRules()` in `live-preview/styles.test.ts`).
- [x] The decoration is not rebuilt on a selection-only or scroll-only update (spy on the builder or count decoration objects across a selection change).
- [x] `e2e/specs/live-preview/source-mode.spec.ts` and `e2e/specs/source-mode-toggle.spec.ts` pass. Owner eye check: a typed note in source mode, light and dark, including a note with a long frontmatter.
- [x] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P11 (source-mode part).** Frontmatter renders as a giant heading in source mode and on canvas note cards: the closing `---` turns the YAML into a setext H2. Proposal: in source mode, decorate the frontmatter range at body size in the meta colour, with keys styled apart from values; canvas cards strip frontmatter through a logic-layer wrapper around `stripFrontmatter`. Validation: keep. Here only the source-mode range (keys apart from values waits); the canvas half is ticket 04, which absorbs open-itens 050.

## Problem

In source mode a typed note opens with the whole `_type` and tags block drawn as a heading-sized line above the content, in the heading colour. The metadata looks like the title, and the real heading below it looks secondary.

## Evidence

Checked at `085b23c5d`.

- `extensions/live-preview/parsers/frontmatter.ts:10-32`: `FRONTMATTER_FENCE_RE` and `findFrontmatterBlock` (line 1 must be a fence; null when unclosed). `setup/editor-extensions.ts:177-183` scans the same fence for another purpose.
- `setup/editor-extensions.ts:99-107`: `sourceModeExtensions()` is `lineNumbers()`, `highlightActiveLineGutter()`, `wikilinkDecoration()`, `calloutDecoration()`, `syntaxHighlighting(sourceHeadingSize)`.
- `extensions/callout/callout.ts`: a source-only line-decoration `ViewPlugin` rebuilt on `docChanged || viewportChanged`; its `cm-callout` class has no theme rule anywhere under `src/lib` (its styling is inline). This ticket's class gets a real rule, in its own file.
- `highlight-styles.ts:51-58` `sourceHeadingSize`; `:17-20` (each editor mode has one heading size owner); `markdownHighlight` `tags.meta` colour `var(--syntax-meta)` (`:41`).
- `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts:444-495` the legacy source-mode decoration tests.
- Screenshot: `.scratch/design-review/screens/editor-source-mode-light.png`.

## Risk

There is no write path: the ticket adds a rendering decoration and writes nothing to the note, to the settings or to the index. The risk is in the editor surface the owner types in every day, in source mode only: a wrong range would colour body text as metadata (colour and weight only, the text is unchanged), a rule that loses the cascade to the heading highlight would leave the giant line in place, and a rebuild on every selection or scroll update would add cost on a large note. The by-eye check in a real typed note is part of done. It runs only when the owner names it (launch by number, never `--all`).

## Sequence with

Open-itens 002, 061, 089, 095 and 252 mention `setup/editor-extensions.ts`; this ticket edits only `sourceModeExtensions()`, and whether they touch it too was not checked: read them for overlap before running. Shell-sidebars-ux 25 makes source mode per tab and edits `EditorView.svelte` and the tab state, not this extension list. Ticket 04 builds the canvas half of P11 in `FileNode.svelte` and `canvas-markdown.logic.ts`; no shared file.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping, and for this ticket "tickets at the end, run only when named". Defaults (not individually answered): none in the old ticket. The theme file is named here (the new extension's own `baseTheme`), as the coverage check required.
- 2026-11-18, delivery (branch issue/46-frontmatter-reads-as-metadata-source-mode): new `source-frontmatter` extension, wired into `sourceModeExtensions()` only, puts `cm-source-frontmatter` on the frontmatter lines (fences included) and a base theme draws them at body size and weight in `--syntax-meta`; rebuilds only on doc changes. Tests: unit tests for the extension, `editor-extensions.test.ts` source/live-preview/swap cases, an E2E case in `source-mode.spec.ts`. Review round 1: APPROVED (one minor finding, the whole-doc line array per doc change, left as in live preview's `frontmatterField` for a follow-up; three nits, no change). Full suite: 662 files, 17715 passed, 56 skipped, exit 0. Owner eye check (light, dark, long frontmatter, wikilinks inside frontmatter now in the meta colour) still outstanding.
