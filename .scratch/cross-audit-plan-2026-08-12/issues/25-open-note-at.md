# Issue 25: Typed openNoteAt(path, target) in core/editor

Status: ready-for-agent
Phase: P3 Track B step 2
Source: ARCH 2.2 (Strong) — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track B — Editor/save)
Blocked by: 02-semantic-search-jump-offset, 24-autosave-scheduling

## What

Opening a note at a position is re-derived per call site, each redoing the await ordering, the
active-vs-switch branch, the animation-frame layering, the clamp and the focus. Give it one typed
owner, so unit mismatches like the search-jump bug (issue 02) become type errors instead of runtime
misplacement.

## How

- Add `openNoteAt(path, target: {kind:'offset'} | {kind:'line'})` in **core/editor**. It owns the
  await ordering, the active-vs-switch branch, the rAF layering, the clamp, and the focus.
- **Absorb `toc.service.ts::scrollToHeading`** into it — the table-of-contents jump is the same
  operation with a line target.
- **Subsume issue 02's conversion into the type system**: the 1-indexed-line vs char-offset
  distinction becomes the `target` discriminant. Issue 02's regression test must survive this
  relocation, still asserting the cursor lands on the match.
- **`pendingScrollPosition` and `editorStore.editorView` stay public.** Do not hide them behind the
  new function.
- **file-history's `restoreSnapshot` is NOT a caller** — it takes no position argument. Do not convert
  it (see issue 24's audit note).
- Calendar is permanently not a caller either (C13): `#38`'s call sites take `openFileInEditor`
  directly.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Test collateral lands in the same commit as the source change; assert real store state and the
  resulting cursor position, never a mock-call assertion alone.
- Stage only the files related to this step (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- One commit, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with
  line ranges).

## Comments

### 2026-08-19 — implemented

**Red-green evidence.** Two probes, both red before the change.

Probe 1 (the real defect), new case in `src/tests/lib/features/search/SearchResult.test.ts`
"legacy result: writes no scroll target until the note is actually open": a decoy tab is active,
`openFileInEditor` is stubbed with a one-macrotask delay (the real `readTextFile` IPC gap), and the
assertion runs synchronously right after the click.

```
FAIL  SearchResult.test.ts > legacy result: writes no scroll target until the note is actually open
AssertionError: expected 12 to be null
- Expected: null
+ Received: 12
  ❯ src/tests/lib/features/search/SearchResult.test.ts:203:45
Test Files  1 failed (1) | Tests  1 failed | 7 passed (8)
```

After the fix: `Test Files  1 passed (1) | Tests  8 passed (8)`.

Side-channel check on that probe: the same test body pointed at the CURRENT semantic branch (which
already awaits and guards) passes under the identical rAF stub and delayed mock (8 passed). So the
stub is not manufacturing the failure — the legacy branch's missing `await` plus missing active-tab
check is.

Probe 2 (the new owner), new `src/tests/lib/core/editor/open-note-at.test.ts`:

```
FAIL  src/tests/lib/core/editor/open-note-at.test.ts
Error: Cannot find module '$lib/core/editor/open-note-at.service'
Test Files  1 failed (1) | Tests  no tests
```

After the fix: `Test Files  1 passed (1) | Tests  7 passed (7)`.

Gate: `pnpm check` 191 files / 0 errors / 0 warnings; `pnpm vitest run` 288 files, 6393 passed,
1 todo; `pnpm build` OK (exit 0). No e2e — `e2e/specs/table-of-contents.spec.ts` asserts heading
buttons are visible and never clicks one, so no e2e collateral changed.

**What discovery found.**

- The justifying defect is in the legacy search branch, not the semantic one: `openFileInEditor` was
  called without `await` and the offset was written from a bare `requestAnimationFrame` with no
  active-tab check, so for any not-yet-open note the offset landed while the PREVIOUS note was still
  active and `MarkdownEditor.svelte` moved the caret in the wrong document.
- `scrollToHeading` had exactly one production caller (`TableOfContentsPanel.svelte`) and
  `lineStartToOffset` exactly one (`SearchResult.svelte`); both are now dead and deleted.
- Non-callers re-verified: `file-history.service.ts::restoreSnapshot` reads `editorStore.editorView`
  but takes no position argument; `CalendarPanel.svelte` and `wikilink-navigation.ts` call bare
  `openFileInEditor`. All ~30 remaining `openFileInEditor` call sites were grepped for
  `PendingScroll|scrollIntoView|EditorSelection|editorView|requestAnimationFrame`; none sets a
  position afterwards. Untouched.
- `editorStore.pendingScrollPosition` and `editorStore.editorView` are still public and still read by
  `MarkdownEditor.svelte`, `command-palette.service.ts` and `file-history.service.ts`.

**Plan discrepancies.**

1. `## How` says `openNoteAt` owns "the rAF layering and the focus", but also that
   `pendingScrollPosition` and `editorStore.editorView` "stay public. Do not hide them behind the new
   function." Those pull apart: in the switch case CodeMirror still holds the OLD document when
   `await openFileInEditor(path)` resolves (the doc replace happens later, in `MarkdownEditor.svelte`'s
   tab-switch `$effect`), so a direct dispatch from `openNoteAt` would land on the stale doc — which is
   exactly why `pendingScrollPosition` exists and why its consumer double-rAFs. Resolution: `openNoteAt`
   owns the await ordering, the active-vs-switch branch, the failed-open guard, the unit conversion and
   the clamp, and is the only writer of `pendingScrollPosition` for position-bearing opens; the rAF
   layering and `view.focus()` stay in the single existing consumer. This also keeps `@codemirror/*` out
   of `core/editor`'s service layer.
2. `## How` calls the table-of-contents jump "the same operation with a LINE target". It is not:
   `scrollToHeading(pos)` took a character offset and `TocHeading.pos` is the offset of the heading
   line's start (`TocHeading.line` exists but is ZERO-based, while the `line` discriminant is
   1-indexed to match `lineStartToOffset` and search results). The TOC therefore passes
   `{kind:'offset', offset: heading.pos}`. Using `{kind:'line'}` there would reintroduce the exact
   off-by-one the discriminant exists to prevent.
3. Neither the issue nor plan §P3 Track B step 2 mentions that `lineStartToOffset` had to relocate.
   It lived in `features/search/search.logic.ts` and `core/editor` may not import from `features/`
   (ADR-0003), so it moved to `core/editor/editor.logic.ts` and its five-case describe moved from
   `search.logic.test.ts` to `editor.logic.test.ts` verbatim.
4. Neither says WHERE in `core/editor` the function goes. It must be its own module, not
   `editor.service.ts`: `SearchResult.test.ts` whole-module-mocks `$lib/core/editor/editor.service`,
   so an intra-module call from `openNoteAt` to `openFileInEditor` would bind to the real function and
   hit Tauri IPC, breaking issue 02's regression assertions. A separate module keeps `openFileInEditor`
   mocked while `openNoteAt` runs for real against the real store. Issue 02's seven
   `pendingScrollPosition` assertions survive untouched.

**Behavior deltas worth knowing.**

- TOC jump is now two animation frames late instead of a synchronous dispatch. Same end state (caret at
  the offset, `scrollIntoView` centered, `view.focus()`), routed through the one existing consumer.
- Clicking a search result for the note that is ALREADY active no longer calls `openFileInEditor`, so
  `fsStore.setSelectedFilePath` is not re-set for that case. This is the active-vs-switch branch the
  issue asks for; it is what keeps a TOC click from moving the file-explorer selection.
- `scrollToHeading` clamped negatives to 0 while the consumer only does `Math.min(pos, doc.length)`.
  `openNoteAt` clamps to `[0, tab.content.length]` so that behavior is preserved; pinned by the
  relocated "clamps a negative offset to zero" case.

**Follow-ups worth filing (NOT done here — out of the `## How` scope contract).**

- `MarkdownEditor.svelte`'s cross-note wikilink anchor path awaits `openFileInEditor(resolved)` and
  then reads `editorStore.activeTab` without checking `tab.path === resolved`. When the open fails
  (the toast path in `editor.service.ts`) it computes the anchor against the PREVIOUS note's content
  and scrolls the wrong note — the same defect family as the legacy search branch just fixed. It cannot
  be converted to `openNoteAt` as-is because the anchor offset is only computable after the open; it
  needs either a "compute the target from the opened content" variant or an inline path check.
- Routing the TOC through `pendingScrollPosition` inherits a latent hole: the consumer returns early
  when no view is mounted WITHOUT clearing the pending value, so a stale offset would be consumed by the
  next editor mount. Practically unreachable today (the TOC only renders heading buttons for an active
  markdown tab). Do not "fix" it by guarding `openNoteAt` on `editorView !== null` — that would break
  opening the first note from search, where the view is created after the tab is added.
