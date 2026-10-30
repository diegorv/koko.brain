# 16: One malformed construct must not disable inline live preview for the whole note

**What to build:** A link with empty text, `[](https://example.com)`, makes `linkHandler` push `linkTextDeco.range(marks[0].to, marks[1].from)` with `from === to`. CodeMirror throws `RangeError: Mark decorations may not be empty` inside `buildInlineDecorations`, logs "CodeMirror plugin crashed" and disables `inlineFormattingPlugin` for the editor. From then on no inline construct in that note is hidden or styled (headings show `#`, links show `[...](...)`, emphasis markers show), while block widgets keep working, so the note looks half-rendered. Reproduced on `help/examples/markdown-editor-vault/06-links.md` (line 119) in a jsdom mount of the production extension stack, at `main` 7f45c175. Not a regression of this feature: the same empty mark existed before (`b68ace05`). Fix both levels:
1. `linkHandler` skips the text mark when the label is empty (still hides `[` and `](url)` or shows source, whichever keeps a non-empty, single-line set of ranges).
2. The inline pipeline is robust: `buildInlineDecorations` drops empty `Decoration.mark` ranges (zero-length marks are never meaningful) and isolates handler failures, so a throwing handler skips only that node or line (log it once with `appendLog`) instead of crashing the plugin.

**Context:** Reported 2026-10-29 by the owner testing `06-links.md` in the nightly `3.0.13-nightly.628.4f358626`: live preview showed `#` and full link syntax on lines without the cursor.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts` (modify; :49-51)
- `src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts` (modify; `buildInlineDecorations`)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] Test (jsdom mount of the full stack, like `pipeline-dom.test.ts`), written and seen failing first: a note containing `[](https://example.com)` and a `# Heading` hides the `#` off the cursor line and does not log "plugin crashed"
- [ ] Test: `linkHandler` emits no zero-length range for `[](url)` and for `[][ref]`
- [ ] Test: a handler that throws on one node leaves the decorations of the other nodes in place
- [ ] `06-links.md` from `help/examples/markdown-editor-vault/` mounts without a plugin crash (can be the same test)

## Comments

- 2026-10-29 21:05 — discovery — plan: empty-label link shows source; buildInlineDecorations isolates handler throws with rollback + one appendLog per handler — 882a9076
- 2026-10-29 21:07 — implement — empty-label link shows source; buildInlineDecorations isolates handler throws (rollback, one appendLog per handler); live-preview vitest 91 files/1298 tests pass, pnpm check 0 errors — bbc9fc8e
- 2026-10-29 21:10 — review — APPROVED: all 4 criteria met, new tests red on main and green on branch; 2 non-blocking findings (06-links test coverage depends on jsdom viewport, history comment in a test) — e131a529
