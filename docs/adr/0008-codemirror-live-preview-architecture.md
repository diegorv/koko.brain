---
type: ADR
id: "0008"
title: "Live-preview architecture — block widgets + unified inline pipeline"
status: active
date: 2026-04-28
---

## Context

The editor must render markdown as rich text while still being editable — what Obsidian calls "Live Preview." Every feature (headings, bold/italic, wikilinks, embedded images, callouts, tables, code blocks, frontmatter, math, mermaid, queryjs, meta-bind buttons, audio, video, footnotes, block references, inline comments, …) needs to:

- Render its own visual representation.
- Reveal source markdown when the cursor touches the element.
- Animate smoothly between rendered and source states.
- Not lag on a 1800-note vault with long files, mouse drags, or rapid scrolling.

A monolithic plugin owning every construct would couple feature work and global perf tuning. CodeMirror 6 is plugin-based; the architecture mirrors that — but with a deliberate split between **block** and **inline** decoration:

- **Block** decorations (frontmatter, code, table, callout, queryjs, mermaid, math, …) are owned by per-feature `StateField`s. Each one walks the document and emits `Decoration.replace({ widget })` for the lines it owns.
- **Inline** decorations (bold, italic, headings, blockquotes, links, lists, marks, comments, block-refs, wikilinks, …) used to be ~8 separate `ViewPlugin`s. The Híbrido D refactor (Phases 0–17) consolidated them into one unified pipeline: a `HighlightStyle` for tag-based marks/styles + a single `inlineFormattingPlugin` with a handler registry for everything that needs cursor reveal, regex parsing, or block-context suppression.

`Decoration.replace({})` for inline formatting was tried early — instant DOM pop-in/pop-out with no animation, because `replace()` removes the element so CSS transitions have nothing to animate. The current design uses `Decoration.mark({ class })` with `max-width: 0` / `font-size: 0.01em` CSS animations.

Some block widgets (Chart.js via QueryJS, Mermaid) cost 200–500 ms to render; CodeMirror destroys widgets when they leave the viewport and re-calls `toDOM()` on re-entry. The session cache (Phase 12, ADR 0010) keeps the rendered DOM alive across viewport exit/re-entry so re-mount is instant.

## Decision

**Two-track decoration architecture: per-feature `StateField`s for block widgets, one unified `ViewPlugin` for inline. Strict performance rules about decoration type, caching, and update gating.**

`src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts` composes both tracks:

- Block fields are pushed individually with per-feature disable flags from `settingsStore.disabledDecorators`.
- Inline goes through `inlineExtensions()` from `inline/inline-extensions.ts`, which returns `[syntaxHighlighting(markdownInlineHighlight), makeInlineFormattingPlugin({ nodeHandlers, lineHandlers })]`.

### Inline pipeline (`inline/`)

`inline-formatting-plugin.ts` exposes a factory plus two handler interfaces:

- `NodeHandler { nodeType: string; decorate(args) }` — matches by Lezer node name. Used by bold/italic/strikethrough/code (via HighlightStyle, not a handler), headings (line decoration + cursor-reveal mark), blockquote, list marks, task markers, hard breaks, inline math, links, autolinks, emphasis/code/strikethrough/highlight delimiter marks, escapes.
- `LineHandler { name: string; decorate(args) }` — regex-based, used for markdown features without a usable Lezer node: inline `%%comments%%`, block references `^id`, extended autolinks (bare `https://…`), wikilinks `[[…]]`.

The pure builder `buildInlineDecorations(state, ranges, handlers)` walks the syntax tree once for node handlers (deduped by `name:from`), then iterates lines for line handlers (deduped by line number). Each handler receives a `scratch: Map<string, unknown>` for cross-dispatch state — the blockquote handler uses it for per-line dedup since `QuoteMark` fires once per `>` on each line.

Tag-based styling (bold, italic, strikethrough, monospace) lives in `markdown-highlight-style.ts` as a `HighlightStyle.define([])` with `class:` keys preserving the legacy CSS class names (`cm-lp-bold`, `cm-lp-italic`, …). Themes targeting those classes keep working unchanged.

### Block fields

Each block field is a `ViewPlugin` whose `update()` short-circuits viewport-only scroll, runs `checkUpdateAction(update, lastCursorLine)` to decide whether to rebuild, and dispatches `Decoration.replace({ widget })` for its line range. Widgets render rich DOM and stop event propagation on `mousedown` so CodeMirror doesn't move the cursor when the user interacts with their controls (table +col/+row buttons, code-block language switcher, callout type popover, meta-bind inputs).

### Performance rules (from `CLAUDE.md` §Performance Guidelines / Live Preview)

1. **`Decoration.mark()` + CSS over `Decoration.replace()` + widget** for simple visuals.
2. **Cache expensive widget output at module level.** QueryJS uses a per-session live-DOM cache (ADR 0010) — element references survive viewport re-entry without re-execution.
3. **Block plugins must skip viewport-only scroll:** `if (update.viewportChanged && !update.docChanged && !update.selectionSet) return;` as the first line of `update()`. The eleven factory-built block decorators inherit it from `core/block-decorator.ts`; `frontmatterField` is a `StateField`, which never sees a pure scroll (no transaction is dispatched) and so needs no guard. `inlineFormattingPlugin` is the only plugin that still writes the guard by hand — the four inline ViewPlugins get the same skip from `checkUpdateAction`, which returns `'none'` on `viewportChanged`.
4. **`checkUpdateAction` with `lastCursorLine`** — plugins skip rebuilds when the cursor stays on the same line.
5. **`scrollDebouncePlugin`** defers `forceDecorationRebuild` by 150 ms after scroll stops; `expandedVisibleRanges()` pre-computes decorations 2000 chars beyond the viewport.
6. **QueryJS uses `_pendingViews` for unawaited `kb.view()`** instead of an auto-await regex (ADR 0010).
7. **QueryJS resultCache holds the LIVE element**, not a clone — `<canvas>` / `<video>` / `<iframe>` state survives widget re-mount via DOM identity.
8. **`autoRunQueries` policy matrix** governs when QueryJS blocks execute (`first-open` / `always` / `manual`). Manual mode never marks a file as auto-run.

Animation discipline: use `Decoration.mark({ class })` with CSS animation classes (`cm-formatting-inline`, `cm-formatting-block`). Two strategies — inline marks hide via `max-width: 0` + `opacity: 0`; block marks via `font-size: 0.01em` + `opacity: 0`. The `*-visible` modifier classes (composed with the base class on cursor reveal) drive the transition.

## Alternatives considered

- **Single monolithic plugin**: simpler composition, but adding any feature requires touching the same file, and feature-level disable flags become conditional branches inside a 3000-line plugin. Rejected.
- **Re-render markdown-to-HTML on every keystroke**: dead simple; fights CodeMirror's strengths and loses cursor/selection fidelity. Rejected — the product promise is *editable* preview.
- **Use `Decoration.replace` everywhere**: consistent but breaks the smooth-animation UX that distinguishes live preview from source mode. Rejected.
- **Keep 8 separate inline `ViewPlugin`s** (the pre-Híbrido-D state): consistent with the per-feature shape of block fields, but each plugin re-iterated the syntax tree, duplicated cursor-reveal logic, and required 9 separate performance rules in CLAUDE.md. Replaced by one unified pipeline that walks the tree once and dispatches via O(1) name lookup.
- **Pre-render everything offscreen**: explored for queryjs/mermaid. Worked in isolation but increased startup time and memory; on-demand render + session cache gave better overall feel.

## Consequences

- Each block field is ~100–400 lines and owns one markdown construct. Adding a block construct = adding a file whose export is a `blockDecorator({ settingsKey, profileLabel, compute })` spec, a name in `BLOCK_DECORATOR_NAMES` (`core/decorator-names.ts`) and the matching entry in `BLOCK_EXTENSIONS` (`live-preview.ts`). The registries are total `Record`s over those name lists, so a half-finished registration fails `pnpm check` and every name renders a working kill-switch in Troubleshooting.
- Each inline construct is a single handler in `inline/handlers/`. Adding one = writing a `NodeHandler` or `LineHandler` and pushing it into `PRODUCTION_NODE_HANDLERS` / `PRODUCTION_LINE_HANDLERS` in `inline-extensions.ts`.
- All `cm-lp-*` CSS classes are preserved verbatim across the refactor — themes targeting those classes keep working.
- The list of performance rules is non-obvious and easy to violate on a new handler; CLAUDE.md §Performance Guidelines is the reference contributors are expected to consult. Violations manifest as scroll jank rather than outright bugs.
- Profiling is built in: `LP-PROFILE` timing logs around each plugin's build path (via `appendLog`, see ADR-0015) measure JS computation. If JS is fast and the UI is still janky, the bottleneck is DOM — disable per-feature decorators via `disabledDecorators` settings to isolate.
- Re-evaluation triggers: CodeMirror 7 changes the extension API; the inline registry grows past ~25 handlers and the `O(N)` line-handler iteration becomes a bottleneck; a single block field grows past ~600 lines or acquires interdependencies with ≥3 other fields (time to split).
