# Issue 59: docs/LIVE-PREVIEW.md teaches a block plugin shape that no longer exists

Status: ready-for-agent
Phase: P5 (follow-up)
Source: reviewer follow-up surfaced during the cross-audit run, verified 2026-08-19 by triage
Blocked by: none

## What

CONFIRMED, and it is broader than the claim stated. `docs/LIVE-PREVIEW.md` was last written on
2026-05-25 (`61dcf71c docs(live-preview): add widget caching pattern section`). The two commits that
invalidated it landed on 2026-08-18: `bd6b1433 refactor(live-preview): collapse block ViewPlugin
bodies onto one factory` and `98b07714 feat(live-preview): unify the decorator kill-switch registry`.
The doc was never touched by either. It is the only "how to add a live-preview plugin" document, it
is linked from the root `CLAUDE.md` Documentation Index, and `docs/adr/0008-codemirror-live-preview-architecture.md`
(status `active`) already carries the correct version of the same material, so the repo currently
contradicts itself.

### Causal chain, by file:symbol

The defect is a documentation defect, so the chain runs through an author following the doc rather
than through a running call stack. Each row is the concrete divergence a reader would act on.

| What the doc says | What the code does |
| --- | --- |
| § Block ViewPlugin Template: hand-write `ViewPlugin.fromClass` with `update(u) { if (checkUpdateAction(u) === 'rebuild') ... }`, export it as `myBlockField` | `live-preview/core/block-decorator.ts::blockDecorator({ settingsKey, profileLabel, compute, rebuildOn?, gate? })`. Eleven of the twelve block decorators are its product (`audio-plugin`, `block-comment-field`, `block-math-field`, `callout-field`, `code-block-field`, `collection-block-field`, `mermaid-field`, `meta-bind-button-field`, `queryjs-block-field`, `table-field`, `video-plugin`). None of them writes a `ViewPlugin.fromClass` body |
| the template passes `checkUpdateAction(update)` with no second argument | `blockDecorator` passes `this.lastCursorLine`. `core/check-update-action.ts::checkUpdateAction(update, lastCursorLine?)` returns `'none'` for a selection change that stays on one line only when the argument is supplied. Without it every cursor move inside a line triggers a full-document `compute(state)` (perf rule 5) |
| the template has no `settingsKey` and no registration beyond "Add to `livePreviewExtensions()`" | registration is a three-place contract: a name in `core/decorator-names.ts::BLOCK_DECORATOR_NAMES`, the matching entry in `live-preview.ts::BLOCK_EXTENSIONS` (a total `Record<BlockDecoratorName, Extension>`), and `settingsKey` on the spec. `livePreviewExtensions()` installs block decorators by iterating `BLOCK_DECORATOR_NAMES` through `isDisabled()`, so a decorator pushed directly into `exts` bypasses `settingsStore.disabledDecorators` and ships with no Troubleshooting kill-switch, which is the isolation lever perf rule 6 tells a debugger to reach for |
| the template has no profiling | `blockDecorator` wraps `compute` in `core/profiling.ts::profileStart/profileEnd` under `profileLabel`, so a hand-written decorator is invisible to the `LP-PROFILE` logs |
| `frontmatter` is listed as a block ViewPlugin | `plugins/frontmatter-field.ts::frontmatterField` is a `StateField.define<DecorationSet>`, the one exception, and it profiles by hand |
| § Two Plugin Types: "Inline ViewPlugin, used for headings, bold/italic, links" | those are handlers now. `inline/inline-formatting-plugin.ts::makeInlineFormattingPlugin` is one plugin dispatching `NodeHandler` / `LineHandler` registries assembled in `inline/inline-extensions.ts::PRODUCTION_NODE_HANDLERS` / `PRODUCTION_LINE_HANDLERS`. Exactly four standalone inline ViewPlugins remain (`image-plugin`, `footnote-plugin`, `wikilink-embed-plugin`, `meta-bind-input-plugin`), and headings, bold/italic and links are not among them |
| § Two Plugin Types: inline range is `view.visibleRanges` | `core/expanded-ranges.ts::expandedVisibleRanges(view, 2000)`, used by `makeInlineFormattingPlugin` and by all four inline ViewPlugins |
| § Core Utilities: `checkUpdateAction(update)`, "All plugins use this in `update()`" | signature is `(update, lastCursorLine?)`, and the eleven block decorators do not call it themselves, they inherit the call from the factory |
| § Core Utilities: `isInsideBlockContext` suppresses inside `FencedCode`, `CodeBlock`, `HTMLBlock`, `CommentBlock` | `core/is-inside-block-context.ts::BLOCK_CONTEXT_TYPES` also holds `BlockMath` and `Frontmatter` |
| § Styling vs. Visibility Separation: two independent plugins, `inlineMarksPlugin` and `markdownStylePlugin` | neither symbol exists. `grep -rn "inlineMarksPlugin\|markdownStylePlugin" src` returns two prose mentions inside comments that say "legacy", in `inline/inline-extensions.ts` and `inline/handlers/mark-handlers.ts`. Styling is `inline/markdown-highlight-style.ts::inlineHighlightExtension`, visibility is handlers inside the one `inlineFormattingPlugin` |
| § Widget Caching: "the pattern" is `Map<contentHash, HTMLElement>` re-attaching a live node, with an `isConnected` guard, and it lists queryjs, mermaid and collection as users. Closes with "The cache holds the live element, not a clone" | only queryjs does this. `grep -rn isConnected src/lib` hits exactly one live-preview file, `widgets/queryjs-block-widget.ts`. `widgets/mermaid-widget.ts::mermaidCache` is `Map<string, string>` holding sanitized SVG markup. `widgets/collection-block-widget.ts::collectionCache` is `Map<string, CollectionCacheEntry>` holding `{ version, view, result }` DATA, rebuilt per `toDOM()` because rows carry click listeners |
| § Widget Caching lists three cached widgets | there are four. `widgets/math-widget.ts::mathCache` is `Map<string, string>` keyed `<mode>:<formula>`, absent from the doc entirely, and its `displayMode` key component is the fix for a real past bug (root CLAUDE.md perf rule 2) |
| § File Structure lists `core/ parsers/ plugins/ widgets/ styles.ts live-preview.ts` | the tree also has `inline/` (the whole inline pipeline plus `inline/handlers/`), `handlers/` (the two paste handlers), `index.ts`, `click-handler.ts`, `widgets.ts`, `wikilink-navigation.ts` and three `*.logic.ts` files |
| § Adding a New Plugin step 2: "Create `plugins/<feature>-plugin.ts` using the template above" | true only for a block construct. An inline construct is a handler in `inline/handlers/` pushed into the two production arrays in `inline-extensions.ts`, per ADR-0008 § Consequences |

### Repro path

Not observable to an end user. The observable consequences are downstream and two of them are
concrete:

1. A contributor or agent adds a block construct by copying § Block ViewPlugin Template and
   § Adding a New Plugin. The result compiles and renders, so nothing flags it, and it ships with
   (a) a full-document scan on every intra-line cursor move, (b) no `LP-PROFILE` entry, (c) no
   Troubleshooting kill-switch, (d) a body duplicating what eleven siblings get from one factory.
2. A contributor adds a cached widget by copying § Widget Caching, which says in plain text that the
   cache holds the live element and that `isConnected` is the guard. Root `CLAUDE.md` perf rule 2
   forbids exactly that: a live node handed to more than one widget gets moved to the last one, so
   the earlier occurrence blanks. Two identical mermaid diagrams in one note is the concrete case.
   The current `mermaid-widget.ts` string cache is the fix for that bug, and the doc is a printed
   invitation to undo it.

### Part of the framing this triage refutes

The prompt framed the defect as "a doc that would lead a new plugin author to hand-write the guard
the factory already supplies". That specific harm does not hold. The doc's template has no guard at
all, and the guard is the least load-bearing thing the factory supplies: `checkUpdateAction` already
returns `'none'` on `update.viewportChanged` before any other branch, so the template's
`checkUpdateAction(update)` call would not rebuild on a pure scroll either. This is the same reason
root `CLAUDE.md` perf rule 4 tells you NOT to add the guard line to the four inline ViewPlugins. The
load-bearing losses are the missing `lastCursorLine` argument, the missing kill-switch registration
and the missing profile label. Write the rewrite around those, not around the guard.

Nothing here is already fixed: `git log -- docs/LIVE-PREVIEW.md` shows no commit after 2026-05-25,
and `git log -S'blockDecorator' -- src docs` shows the factory landing on 2026-08-18 with no doc
companion.

## How

Scope: rewrite `docs/LIVE-PREVIEW.md` so every statement matches the code. Nothing under `src/`
changes.

### Exact edits

- **§ File Structure**: add `inline/` (with `inline/handlers/`) and `handlers/` to the tree. One line
  of comment each is enough; this is a map, not an inventory, so top-level single files may stay out.
- **§ Two Plugin Types**: replace the table. Row 1 is the unified inline pipeline
  (`inline/inline-formatting-plugin.ts`, `NodeHandler` / `LineHandler` registry, range
  `expandedVisibleRanges(view)`). Row 2 is the four residual inline ViewPlugins, named. Row 3 is the
  block decorators (`blockDecorator` product, full document), with `frontmatterField` called out as
  the `StateField` exception.
- **§ Core Utilities**: fix the `checkUpdateAction` signature to `(update, lastCursorLine?)` and say
  what the second argument buys. Add `BlockMath` and `Frontmatter` to the `isInsideBlockContext` set.
  Drop "All plugins use this in `update()`" in favour of "the factory calls it for every block
  decorator".
- **§ Block ViewPlugin Template**: replace the whole `ViewPlugin.fromClass` body with the real shape.
  Copy `plugins/mermaid-field.ts` as the model, it is the smallest honest one: a
  `computeX(state): DecorationSet` scan plus `export const xField = blockDecorator({ settingsKey,
  profileLabel, compute })`. Mention `rebuildOn` (point at `callout-field.ts`) and `gate` (point at
  `queryjs-block-field.ts`) in one sentence each, no second template. Say explicitly that the
  viewport guard, the `lastCursorLine` gate and the profiling wrapper come from the factory and must
  not be hand-written.
- **§ Inline ViewPlugin Template**: retitle and reframe. The template body is still roughly right for
  the four residual plugins, but it must switch `view.visibleRanges` to `expandedVisibleRanges(view)`
  and carry `lastCursorLine`. Add a sentence saying a NEW inline construct is a handler, not a
  plugin, and point at `inline/inline-extensions.ts`.
- **§ Styling vs. Visibility Separation**: delete `inlineMarksPlugin` and `markdownStylePlugin`.
  Replace with the two real halves: `inline/markdown-highlight-style.ts` (tag-based styling via
  `HighlightStyle`, `cm-lp-*` class names preserved) and the handlers inside `inlineFormattingPlugin`
  (cursor-reveal visibility).
- **§ Widget Caching**: this section needs the most surgery. State up front that there are two
  distinct schemes and that live-DOM caching is queryjs-only. Then one row per widget: queryjs (live
  element + `isConnected`, and say it is a partial mitigation), mermaid (sanitized SVG string, post
  id-strip), math (sanitized KaTeX HTML string, key MUST carry `displayMode`), collection (query
  DATA, DOM rebuilt per `toDOM()` because rows carry listeners). Name the teardown clears
  (`clearMermaidCache`, `clearMathCache`, `clearCollectionCache`, all called from
  `app-lifecycle.service.ts`).
- **§ Adding a New Plugin**: split into "block construct" and "inline construct". The block path is
  the three-place registration contract: `BLOCK_DECORATOR_NAMES` in `core/decorator-names.ts`, the
  entry in `BLOCK_EXTENSIONS` in `live-preview.ts`, `settingsKey` on the spec. Say why: both
  registries are total `Record`s so a half-finished registration fails `pnpm check`, and the pair is
  what gives the decorator its Troubleshooting kill-switch. The inline path is a handler in
  `inline/handlers/` pushed into `PRODUCTION_NODE_HANDLERS` or `PRODUCTION_LINE_HANDLERS`, plus an
  entry in `TOGGLEABLE_HANDLERS` if it should have its own switch.
- Add one line near the top pointing at `docs/adr/0008-codemirror-live-preview-architecture.md` as
  the decision record, so the two documents stop drifting independently.

### What must NOT change

- **No file under `src/` is touched.** In particular do not "clean up" the two legacy prose mentions
  of `inlineMarksPlugin` / `markdownStylePlugin` in `inline/inline-extensions.ts` and
  `inline/handlers/mark-handlers.ts`. Both are deliberate historical references explaining a scope
  the toggles inherited, and both already say "legacy".
- **No new doc-lint test suite.** There is none today and one file does not justify inventing one.
- **Do not touch `docs/adr/0008-*.md`.** It is already correct; the doc is being brought to it, not
  the reverse.
- **Do not touch root `CLAUDE.md`.** Its Documentation Index row for this file
  ("plugin types, templates, core utilities") stays true after the rewrite.
- **Keep § Critical Rule: `Decoration.mark()` NOT `Decoration.replace()` as it stands.** Verified
  accurate: `styles.ts` still defines `.cm-formatting-inline` (`maxWidth: '0'`, `opacity: '0'`) and
  `.cm-formatting-block` (`fontSize: '0.01em'`, `opacity: '0'`) with their `-visible` modifiers.
- Anchor everything by symbol. No line numbers in the rewritten doc.

### Test strategy, and why there is no red test

No red test is writable, and none should be invented. The changed surface is prose in a single
markdown file with no executable binding; the behaviours it describes are already covered by
`src/tests/.../live-preview/core/block-decorator.test.ts` (viewport skip, `lastCursorLine`,
`rebuildOn`, `gate`), `.../core/check-update-action.test.ts`, `.../decorator-toggles.test.ts` and the
four widget cache suites, none of which changes.

Verification is a symbol-by-symbol re-read of the rewritten file against the code. Two side channels
would fake a green and must be avoided:

- **Verifying against root `CLAUDE.md` or ADR-0008 instead of against the code.** Both paraphrase the
  same rules, so a doc that agrees with them reads correct while still being checkable only by
  opening `block-decorator.ts`, `decorator-names.ts`, `live-preview.ts` and the four widget files.
  Every claim in the rewrite must be traceable to a symbol the implementer actually opened.
- **Grep-passing on the dead names alone.** `grep -n "inlineMarksPlugin\|markdownStylePlugin\|view.visibleRanges"
  docs/LIVE-PREVIEW.md` returning zero hits is necessary, not sufficient: it says nothing about the
  block template, the registration contract or the widget cache rows, which are the load-bearing
  parts. Treat that grep as a smoke check, not as the acceptance criterion.

## Gate

Docs-only. No file under `src/` moves, so root `CLAUDE.md` rule 6 triggers no automated gate: the
gate is the staging discipline plus the commit format.

- `git add docs/LIVE-PREVIEW.md` and this issue file only, then verify with `git diff --cached --stat`.
- One commit in the full format (Context, Problem, Solution, Behavior, Files with line ranges),
  followed by the separate `chore(issues)` commit that `git rm`s this file, per the playbook.
- Conditional: if the implementation ends up moving ANY file under `src/`, the change has left its
  scope contract. Either revert that part or run the full frontend gate,
  `pnpm check` + `pnpm vitest run` + `pnpm build`, before committing.

## Comments
