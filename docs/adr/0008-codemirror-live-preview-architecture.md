---
type: ADR
id: "0008"
title: "Modular CodeMirror live-preview architecture (~22 ViewPlugins)"
status: active
date: 2026-04-22
---

## Context

The editor must render markdown as rich text while still being editable — what Obsidian calls "Live Preview." Every feature (headings, bold/italic, wikilinks, embedded images, callouts, tables, code blocks, frontmatter, math, mermaid, queryjs, meta-bind buttons, audio, video, footnotes, block references, inline comments, …) needs to:

- Render its own visual representation.
- Reveal source markdown when the cursor touches the element.
- Animate smoothly between rendered and source states.
- Not lag on a 1800-note vault with long files, mouse drags, or rapid scrolling.

A single monolithic plugin would own every markdown construct; adding or disabling a feature would touch the same file; performance tuning would be a global concern. CodeMirror 6 is already plugin-based, so we mirrored that.

Early experiments used `Decoration.replace({})` for inline formatting marks. The result was instant DOM pop-in/pop-out with no animation — because `replace()` removes the element from the DOM, CSS transitions have nothing to animate. Some widgets (Chart.js, Mermaid, QueryJS) also cost hundreds of ms to render; CodeMirror destroys widgets when they leave the viewport and re-calls `toDOM()` on re-entry, which re-executed the expensive path on every scroll.

## Context (cont.)

The architecture had to absorb all of this: pluggability, per-feature togglability, animation friendliness, viewport-driven rebuilds, and caching for expensive widgets.

## Decision

**Structure live-preview as a composition of modular CodeMirror `ViewPlugin`s and `StateField`s, each handling one markdown construct, with strict performance rules about decoration type, caching, and update gating.** `src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:43-75` shows the composition — each plugin is pushed into an `Extension[]` with individual disable flags from `settingsStore.disabledDecorators`.

Two plugin shapes, from `docs/LIVE-PREVIEW.md:19-24`:

| Type | Used for | Iteration | Range |
|------|----------|-----------|-------|
| **Inline ViewPlugin** | Headings, bold/italic, links | `syntaxTree().iterate()` over Lezer AST | `view.visibleRanges` only |
| **Block ViewPlugin / StateField** | Code blocks, tables, frontmatter, callouts, queryjs blocks | `getAllLines(state)` + parser | Full document |

### Performance rules (from `CLAUDE.md` §Performance Guidelines / Live Preview)

1. **`Decoration.mark()` + CSS over `Decoration.replace()` + widget** for simple visuals. Marks are GPU-accelerated paint; widgets cause reflow. Only use widgets for complex interactive elements (tables, code blocks, meta-bind selects).
2. **Cache expensive widget output at module level.** Widgets are destroyed/recreated on viewport exit/entry; `eq()` returning true keeps DOM alive while visible but does not prevent re-`toDOM()` after re-entry. `queryjs-block-widget.ts` caches rendered DOM in `scriptResultCache` and clones the cached node on re-render.
3. **Block plugins must skip viewport-only scroll:** `if (update.viewportChanged && !update.docChanged && !update.selectionSet) return;` as the first line of `update()`.
4. **`checkUpdateAction` with `lastCursorLine`** — pass cursor line so plugins skip rebuilds when the cursor stays on the same line.
5. **`scrollDebouncePlugin`** defers `forceDecorationRebuild` by 150 ms after scroll stops; `expandedVisibleRanges()` pre-computes decorations 2000 chars beyond the viewport so scrolling-in content is ready.
6. **QueryJS auto-await** — `queryjs-block-widget.ts` wraps `jsContent` in `return (async () => { … })()` and regex-prepends `await` to top-level `kb.view(` / `dv.view(` calls so async results settle before `scriptResultCache.set()`.
7. **Skip caching for containers with `<canvas>`, `<video>`, or `<iframe>`** — `cloneNode(true)` doesn't copy pixel buffers/playback state; Chart.js widgets would cache as blank squares. These re-execute on every `toDOM()`.

Animation discipline (from `docs/LIVE-PREVIEW.md:30-51`): use `Decoration.mark({ class })` with CSS animation classes (`cm-formatting-inline`, `cm-formatting-block`). Two strategies — inline marks hide via `max-width: 0` + `opacity: 0`; block marks via `font-size: 0.01em` + `opacity: 0`.

## Alternatives considered

- **Single monolithic plugin**: simpler composition, but adding any feature requires touching the same file, and feature-level disable flags become conditional branches inside a 3000-line plugin. Rejected.
- **Re-render markdown-to-HTML on every keystroke**: dead simple; fights CodeMirror's strengths and loses cursor/selection fidelity. Rejected — the product promise is *editable* preview.
- **Use `Decoration.replace` everywhere**: consistent but breaks the smooth-animation UX that distinguishes live preview from "switch between source and preview." Rejected.
- **Pre-render everything offscreen**: explored for queryjs/mermaid. Worked in isolation but increased startup time and memory; on-demand render + module-level cache gave better overall feel.

## Consequences

- Each plugin is ~100–400 lines and owns one markdown construct. Adding a construct = adding a file + a registration line in `live-preview.ts`. No cascading changes.
- Each plugin has an individual disable flag in settings (`disabledDecorators`). Users and developers can turn things off to bisect performance problems.
- The list of performance rules is non-obvious and easy to violate on a new plugin; CLAUDE.md §Performance Guidelines is the reference contributors are expected to consult. Violations tend to manifest as scroll jank rather than outright bugs, which makes them hard to spot without profiling.
- Profiling is built in: `LP-PROFILE` timing logs inside each plugin (via `appendLog`, see ADR-0015) measure JS computation. If JS is fast and the UI is still janky, the bottleneck is DOM — disable plugins one by one via the `DISABLE` flags to isolate.
- Widget cache invalidation is currently coarse (global cache per script content). Per-page cache invalidation would be an optimization but is not implemented today.
- Re-evaluation triggers: CodeMirror 7 changes the extension API; a single plugin grows past ~600 lines or acquires interdependencies with ≥3 other plugins (time to split); a future `<canvas>`-cloning API makes the chart-widget exclusion unnecessary.
