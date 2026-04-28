# Híbrido D — Live Preview Refactor

Consolidates the 8 inline plugins (~1 287 LOC across `markdown-style`, `heading`, `blockquote`, `link`, `simple-widget`, `inline-marks`, `inline-comment`, `block-reference`) into 2–3 via CodeMirror's native `HighlightStyle` + a single `inlineFormattingPlugin` with a handler registry. Adds raw mode (`Cmd+K`), simplifies the QueryJS execution model (first-open per session + content-hash cache + Run button), then enriches block-widget UX (table, code, queryjs, meta-bind, callout). Net delta: −~1 200 LOC, −67% performance rules, +raw mode, public KBAPI surface unchanged. Branch: `claude/hybrid-d-live-preview-refactor`. Full plan at `~/.claude/plans/vou-te-passar-um-delightful-hanrahan.md`.

## Tasks

### Phase 0 — Inventory + feature flag

- [x] Task 0.1: Inventory CSS classes emitted by the 8 inline plugins → `tasks/notes/css-classes-inventory.md`
- [x] Task 0.2 + 0.3 (combined): `ExperimentalSettings` interface + `AppSettings` field + store default/getter/updater + service merge + tests (combined because the type addition must arrive with its default to keep the project type-checking)
- [x] Task 0.4: `ExperimentalSection.svelte` (new) wired into `SettingsDialog.svelte` + sidebar nav
- [x] Task 0.5: Branch `livePreviewExtensions()` on the flag — flag-off path preserves the exact pre-refactor ordering of inline plugins; flag-on path calls `newInlineExtensions()` (currently `[]`, populated in Phase 2); tests

### Phase 1 — Raw mode (Cmd+K)

- [x] Task 1.1: Add `rawMode: boolean` to `EditorSettings` (default `false`); store + tests
- [x] Task 1.2: Short-circuit in `should-show-source.ts`; update co-located tests
- [x] Task 1.3: `toggleRawMode()` in `editor.service.ts` + `Cmd+K` binding in `global-keybindings.ts`; tests
- [x] Task 1.4: Toggle in `EditorSection.svelte`
- [x] Task 1.5: E2E `e2e/specs/live-preview/raw-mode.spec.ts` (compiles; user runs `bash scripts/e2e.sh` to execute — sandbox has no display)

### Phase 2 — New pipeline scaffold

- [x] Task 2.1+2.2+2.3 (combined): `new/markdown-highlight-style.ts` (empty entries — populated per phase) + `new/inline-formatting-plugin.ts` (factory pattern with `NodeHandler`/`LineHandler` interfaces, pure `buildInlineDecorations` builder, viewport-skip + `checkUpdateAction` rebuild gate + `LP-PROFILE`) + `new/new-inline-extensions.ts` (production handler arrays + extension factory) + wire into `live-preview.ts` flag-on branch (combined: pipeline files form a closed type-graph, splitting would land broken intermediate states)
- [x] Task 2.4: Unit tests — registry, dispatch, block-context skip, dedup, `isTouched`, HighlightStyle sanity, extension array (20 cases)

### Phase 3 — Retire markdownStylePlugin (113 LOC)

- [x] Task 3.1: Add `class:` keys for `tags.strong/emphasis/strikethrough/monospace` in `markdown-highlight-style.ts`
- [x] Task 3.2: `new/handlers/highlight-handler.ts` — node handler for `Highlight` (Lezer node from custom HighlightExtension; cleaner than the line-handler approach the plan suggested because the node already covers the full `==text==` range)
- [x] Task 3.3 + 3.5 (combined): jsdom DOM-snapshot test mounts EditorView with `livePreviewExtensions()` for both flag-on and flag-off paths, asserts the same 5 classes (`cm-lp-bold/italic/strikethrough/code/highlight`) appear in both
- [~] Task 3.4: **deferred to Phase 12.5** — keeping `plugins/markdown-style-plugin.ts` active in the flag-off path until Phase 11 dogfood signs off. Test-branch's approach: dual-pipeline coexistence preserves runtime fallback through the soak window

### Phase 4 — Retire headingPlugin (121 LOC)

- [x] Task 4.1: `new/handlers/heading-handler.ts` — 8 handlers (ATX1-6 + Setext1-2) via factories, `Decoration.line` + cursor-reveal of HeaderMark
- [x] Task 4.2: Register in `new-inline-extensions.ts`
- [~] Task 4.3: **deferred to Phase 12.5** — keeping `plugins/heading-plugin.ts` active in flag-off path through dogfood window
- [x] Task 4.4: Unit tests (15 cases) + E2E `headings-new-pipeline.spec.ts` (6 ATX + 2 Setext + cursor-reveal + bold-in-h1) + DOM-snapshot test extended to assert `cm-lp-h1..h6` in both flag paths

### Phase 5 — Retire blockquotePlugin (133 LOC)

- [x] Task 5.1: `new/handlers/blockquote-handler.ts` — `QuoteMark` node handler with per-line dedup via shared `scratch` Map, depth 1/2/3 via `findBlockquoteMarkRange` (reuses `blockquoteLineDeco`, `CALLOUT_RE` exclusion). Added `scratch: Map<string, unknown>` to `NodeDecorateArgs`/`LineDecorateArgs` for cross-dispatch handler state
- [x] Task 5.2: Registered in `new-inline-extensions.ts`. **Plugin deletion deferred to Phase 12.5.** Unit tests (15 cases) + E2E `blockquotes-new-pipeline.spec.ts` (7 cases) + DOM-snapshot test extended for both flag paths

### Phase 6 — Retire inlineCommentPlugin (95 LOC)

- [x] Task 6.1: `new/handlers/inline-comment-handler.ts` (line handler reusing `findInlineCommentRanges` from `parsers/comment.ts`)
- [x] Task 6.2: Registered as first entry in `PRODUCTION_LINE_HANDLERS`. **Plugin deletion deferred to Phase 12.5.** 6 unit tests cover hide/reveal/raw mode/no match/multiple per line/FencedCode skip

### Phase 7 — Retire blockReferencePlugin (89 LOC)

- [x] Task 7.1: `new/handlers/block-reference-handler.ts` (line handler reusing `findBlockReference` from `parsers/block-reference.ts`)
- [x] Task 7.2: Registered alongside `inlineCommentHandler` in `PRODUCTION_LINE_HANDLERS`. **Plugin deletion deferred to Phase 12.5.** 6 unit tests cover hide/reveal/raw mode/no match/middle-of-line not matched/FencedCode skip

### Phase 8 — Retire simpleWidgetPlugin (290 LOC)

- [x] Task 8.1: `new/handlers/simple-widget-handlers.ts` — 5 NodeHandlers (TaskMarker, HorizontalRule, ListMark, HardBreak, InlineMath); ListMark dispatches by parent (Task / Ordered / Bullet); reuses `TaskCheckboxWidget`, `OrderedListMarkerWidget`, `InlineMathWidget`
- [x] Task 8.2: Confirmed via 14 unit tests that the existing `seenNodes` Set in `buildInlineDecorations` handles per-node dedup; no changes needed
- [x] Task 8.3: Registered after `blockquoteHandler` in `PRODUCTION_NODE_HANDLERS`. **Plugin deletion deferred to Phase 12.5.** 14 unit tests cover all 5 widget kinds + cursor-on-line fall-through + raw mode + FencedCode skip

### Phase 9 — Retire linkPlugin (283 LOC) — subdivided

- [x] Task 9a.1: `new/handlers/markdown-link-handlers.ts` (`Link` + `LinkReference`) + cursor reveal
- [x] Task 9a.2: 8 unit tests
- [x] Task 9b.1: `new/handlers/autolink-handlers.ts` — `Autolink` NodeHandler + `extendedAutolinkHandler` LineHandler with per-line dedup against Link/Autolink/Image
- [x] Task 9b.2: 8 unit tests
- [x] Task 9c.1: `new/handlers/wikilink-handler.ts` covering all 4 wikilink shapes. **`click-handler.ts` confirmed independent** — imports from `parsers/link.ts` not `link-plugin.ts`, no refactor needed
- [x] Task 9c.2: 8 unit tests
- [~] Task 9.final: **deferred to Phase 12.5** — `plugins/link-plugin.ts` stays active in flag-off path through dogfood window

### Phase 10 — Retire inlineMarksPlugin (163 LOC) — last inline migration

- [x] Task 10.1: `new/handlers/mark-handlers.ts` — `makeMarkHandler(nodeType)` factory generates 4 handlers (`EmphasisMark`, `CodeMark`, `StrikethroughMark`, `HighlightMark`) + standalone `escapeHandler`
- [x] Task 10.2: `HighlightMark` flipped to Lezer node match (custom `HighlightExtension` already defines it as a Lezer node — same pattern as the GFM marks)
- [x] Task 10.3: Registered after `autolinkHandler` in `PRODUCTION_NODE_HANDLERS`. **Plugin deletion deferred to Phase 12.5.** 13 unit tests cover bold/italic/code/strikethrough/highlight + escape + raw mode + FencedCode skip
- [x] Task 10.4: Full vitest sweep green — 5680 tests pass, both flag paths verified via `new-pipeline-dom.test.ts` and per-handler tests

### Phase 11 — User dogfood (handoff)

- [ ] Task 11.user: User runs `pnpm tauri dev` with flag on for ~1 week against real vault, reports regressions

### Phase 11.5 — Flip flag default (after sign-off)

- [ ] Task 11.5.1: Default `experimental.newLivePreview` → `true`
- [ ] Task 11.5.2: Release notes entry; bump version

### Phase 12 — QueryJS execution model

- [x] Task 12.1: `queryjs.autoRunQueries` setting added (default `'first-open'`); 2 tests cover default + cycling through all 3 policies
- [x] Task 12.2: `queryjs-session.store.svelte.ts` (101 LOC) with live-DOM `resultCache`, `autoRunOnFirstOpen`, `invalidate`/`invalidatePath`/`reset`; 12 unit tests including the "live ref not clone" identity invariant
- [x] Task 12.3: Widget rewritten — auto-await regex replaced by `KBAPI._pendingViews` + `awaitAllPending()`; canvas/video/iframe exclusions dropped; clone semantics dropped (live element ref); policy-matrix toDOM flow with ▶ Run button; manual-doesn't-mark-autoRun invariant captured in JSDoc + Phase 12.5 tests will lock it in
- [x] Task 12.4: `queryjsSessionStore.invalidatePath` wired into `closeTab` + `closeTabsForDeletedPath`; `reset()` wired into `teardownVault`; regression test for closeTab in `editor.service.test.ts`
- [x] Task 12.5: ADR 0010 rewritten (decision/alternatives/consequences match the new model); CLAUDE.md Live Preview rules 8 + 9 replaced with new rule 8 (`_pendingViews`), new rule 9 (live element ref), new rule 10 (autoRunQueries policy matrix + manual invariant)
- [ ] Task 12.user: **User runs E2E `execution-model.spec.ts` (5 scenarios)** — needs the real vault + display

### Phase 12.5 — Cleanup legacy

- [ ] Task 12.5.1: Delete 8 retired plugin files + their old test files
- [ ] Task 12.5.2: Drop `legacyInlineExtensions()` from `live-preview.ts`; collapse to single pipeline
- [ ] Task 12.5.3: Remove `experimental.newLivePreview` flag everywhere (types, store, UI section, sidebar entry)
- [ ] Task 12.5.4: Rename `new/` → `inline/`; drop `new-` prefix from filenames; purge "Phase N" JSDoc
- [ ] Task 12.5.5: Delete duplicate `*-new-pipeline.spec.ts` E2E files
- [ ] Task 12.5.6: Update ADR 0008 + CLAUDE.md § Live Preview to describe current state w/o transitional language

### Phase 13 — Table widget UX

- [ ] Task 13.1: `paste-tsv.logic.ts` (pure parser TSV/Excel → markdown table); 14 tests
- [ ] Task 13.2: `paste-tsv-handler.ts` wired via `EditorView.domEventHandlers`
- [ ] Task 13.3: `TableWidget` edit mode (contenteditable cells, Tab/Shift+Tab/Enter navigation, blur commits); tests
- [ ] Task 13.4: `+col` / `+row` floating buttons on hover; tests
- [ ] Task 13.5: Drag handle for row reorder via HTML5 DnD; tests

### Phase 14 — Code block UX

- [ ] Task 14.1: Language switcher dropdown in code-block widget header (preserves exotic languages); parser exposes `languageFrom`/`languageTo`; tests
- [ ] Task 14.2: Tab/Shift+Tab keymap when cursor inside `FencedCode`; tests

### Phase 15 — QueryJS rendering states

- [ ] Task 15.1: Loading indicator during `execute()`
- [ ] Task 15.2: Structured error display (title + collapsible stack `<details>` + Run button)
- [ ] Task 15.3: Pagination via `kb.ui.table(headers, rows, { pageSize })`; KBUI types updated; tests

### Phase 16 — Meta-bind validation

- [ ] Task 16.1: `MetaBindNumberWidget` with inline validation, blur-commits, Escape-reverts; tests
- [ ] Task 16.2: `MetaBindDateWidget` (dayjs parsing); tests
- [ ] Task 16.3: `MetaBindToggleWidget` (`toggle()`/`boolean()`); tests
- [ ] Task 16.4: Parser: extend `TYPES_WITHOUT_OPTIONS` to `{ number, date, toggle, boolean }`; tests

### Phase 17 — Callout UX

- [ ] Task 17.1: Fold chevron renders on every callout (no longer gated on `+`/`-`); persists via `calloutFoldState`; tests
- [ ] Task 17.2: Type dropdown popover; transaction replaces type token only; preserves border color; tests

## Notes

- **Branch:** `claude/hybrid-d-live-preview-refactor`. New branch from `main`. Old test branch `claude/hybrid-d-editor-refactor-97Ecc` is **out of scope**.
- **Flag:** `experimental.newLivePreview` (default `false` until 11.5). Branch lives in `live-preview.ts → livePreviewExtensions()`.
- **Rollback per phase:** flag toggle (Phases 2–11) OR `git revert` of the phase commit series.
- **Testing gate** (CLAUDE.md Quick Ref #6): Frontend → `pnpm check` + `pnpm vitest run`. **E2E baseline skipped** (project E2E is unstable); each phase ≥2 ships its own `*-new-pipeline.spec.ts` for the user to run when convenient. Commit per task with full Context/Problem/Solution/Behavior/Files format.
- **CSS class names:** preserve verbatim; Phase 0 inventory is authoritative.
- **`shouldShowSource` is called by 25 files** — short-circuit `rawMode` affects inline AND blocks (intentional).
- **QueryJS resultCache:** holds **live element references**, not clones. CodeMirror destroys the widget but the underlying DOM survives because we hold a ref; re-mount re-inserts the same node, preserving `<canvas>`/`<video>`/`<iframe>` state natively.
- **Phase 9 subdivided** into 9a/9b/9c due to coupling with `wikilink-navigation.ts`.
- **Phase 11 (dogfood):** user-driven; cannot run inside the sandbox (no display + week-long soak).
