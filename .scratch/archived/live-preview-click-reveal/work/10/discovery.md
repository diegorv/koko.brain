# Issue 10 discovery: frontmatter write keeps the visible text in place

No `spec.md` exists for this feature; the Issue is the source.

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:820` `dispatchMetaBindUpdate`: build the `ChangeSet` with `view.state.changes(...)` and dispatch it with `effects: view.scrollSnapshot().map(changes)`. One function serves the select, toggle, number/date inputs and the button's `updateMetadata`, so one fix covers all meta-bind writers.
- `src/lib/core/markdown-editor/MarkdownEditor.svelte:159-189` `replaceDoc`: only if the properties-panel E2E jumps. Every `syncExternalContentToEditor` writer (properties panel at `features/properties/properties.service.ts:106`, `updateNoteFrontmatter` at `core/frontmatter/frontmatter-write.service.ts:132`, link updater, deep link, watcher reload) ends in this one `replaceDoc` via the content-sync `$effect` (`MarkdownEditor.svelte:513-537`). `docDiff` already narrows the change to the edited span, but that span is still inside the hidden frontmatter, so its lines are re-estimated. Fix the same way: map a `scrollSnapshot()` taken before the dispatch through the change set.
- New E2E: `e2e/specs/live-preview/frontmatter-write-keeps-scroll.spec.ts`.

## Plan

1. E2E (written first, run, see it fail): note with 13 frontmatter lines, a `# Tue 03 Nov 2026` heading with the cursor on it, ~300 filler lines, then select / toggle / number input lines bound to frontmatter properties. Scroll the control to mid-screen, measure its `getBoundingClientRect().top - .cm-scroller.getBoundingClientRect().top`, change it, wait for the write to reach the doc and two frames, measure again: |dy| <= 2 px.
2. Same steps through the properties panel (settings override `rightSidebarVisible` + `propertiesVisible`), measuring a body line's screen y.
3. Scrolled to top: short note, `scrollTop` 0, change the select, the select's screen y and `scrollTop` 0 hold.
4. Fix `dispatchMetaBindUpdate`; fix `replaceDoc` if step 2 fails.

## Prior-art tests

- `e2e/specs/live-preview/click-reveal/meta-bind-inline-select.spec.ts`, `meta-bind-toggle.spec.ts`, `meta-bind-text-input.spec.ts` (how each control is driven); `e2e/specs/properties-cross-note.spec.ts` (panel row input, `editorDoc` through `cmTile`).
- No vitest seam: jsdom has no layout, so a height re-estimate cannot be observed; the existing widget / MarkdownEditor vitest suites cover the dispatch shape staying valid.

## Risks and defaults

- `scrollSnapshot` anchors on the block at `scrollTop`. At the top that is line 1 (pos 0), which maps to 0, so `scrollTop` stays 0.
- `replaceDoc` also serves watcher reloads and link rewrites; keeping the visible text in place is the right behaviour there too. The fallback `setState` path after a throwing dispatch is left as is.
- Root fix (telling CodeMirror the hidden frontmatter is 0 px via a block replace from the frontmatter StateField): out of scope. It changes how every hidden-line decorator measures and how the cursor enters the frontmatter (ADR 0008 hidden-syntax rules, click-reveal Issues 01-09), which is not small; the snapshot fix is two lines per writer.

## Findings while building

- CodeMirror's own scroll anchor (`EditorView.measure`) already compensates for the re-estimate when the write is the only update before the next measure. It is lost when a `DOMObserver` flush (the control's focus change) lands in between; the toggle click and the number Enter hit that, and a native select picker does too (focus and change arrive together after the modal menu closes). Playwright's `selectOption` sends the change alone, so the spec fires focus + change in one task (`pickOption`).
- Properties panel: no jump with the same steps (focus is in the panel, no editor update interleaves), so `replaceDoc` is unchanged; its test stays as a guard.
- End in an `<input type=number>` scrolls the editor to its end; the number test uses `fill`.
