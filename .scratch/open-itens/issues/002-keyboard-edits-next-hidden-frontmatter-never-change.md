# 002: Keyboard edits next to the hidden frontmatter never change its fences

**Origin:** `audit-2026-11-05` Issue 02, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The frontmatter lines are hidden with per-line `Decoration.replace({})` plus a display:none line class (src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:14-20, called from plugins/frontmatter-field.ts:23). Only the mouse path is guarded: `frontmatterClick` (plugins/frontmatter-field.ts:88) remaps a press in the top padding to the first body line, and its own doc comment says keyboard moves are not changed (:79, :86). Nothing under src/lib defines atomicRanges, a transactionFilter or a changeFilter, so keyboard commands act on the hidden fence. Cmd+Up puts the selection at 0, and Enter or Delete there edits the opening `---`. Backspace at the start of the first body line deletes the line break after the closing fence (`---First line`), and further Backspaces delete fence characters. After that, `findFrontmatterBlock` (parsers/frontmatter.ts:17-30) no longer finds the block, or it closes the block at a later `---` horizontal rule.

Fix direction: install the guard with `frontmatterField`, so it applies only while the frontmatter is hidden, and limit it to user transactions. (1) A selection that a user `select.*` transaction puts inside the hidden range is clamped to the start of the first body line. This covers Cmd+Up, ArrowUp and PageUp, plus shift-extends, which clamp their head. (2) A user `input.*` or `delete.*` change that touches the hidden range, including the line break after the closing fence, is dropped or narrowed to the body. Backspace at the start of the first body line then does nothing to the fence. Do not make the whole range atomic: CodeMirror's deleteCharBackward deletes an atomic range whole, so Backspace at the first body line would remove the entire frontmatter. Programmatic writes must pass unchanged: the Properties panel, meta-bind writers, tab loads and setState carry no input or delete userEvent. The e2e at e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:53-65 pins today's ArrowUp behavior (the cursor lands on the first hidden line). That test only recorded the current behavior (Issue 03 Notes); change it to expect the first body line, and say so in the commit.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field-keyboard.test.ts (jsdom, next to frontmatter-field-click.test.ts, real livePreviewExtensions, no store or logic mocks): mount '---\nstatus: todo\n---\nFirst body line.\n\nEnd line.' with the cursor at the start of the first body line, run cursorDocStart(view) and then insertNewlineAndIndent(view), and assert that view.state.doc starts with '---\nstatus: todo\n---\n'. It fails today.
- [ ] Same file: with the cursor at the start of 'First body line.', deleteCharBackward(view) leaves the three frontmatter lines byte-identical.
- [ ] Same file: in '---\nstatus: todo\n---\nab' with the cursor at the end, five deleteCharBackward calls leave '---\nstatus: todo\n---\n' intact.
- [ ] Same file: Delete (deleteCharForward) after cursorDocStart leaves the frontmatter bytes unchanged.
- [ ] ArrowUp and Cmd+Up from the body put the cursor at the start of the first body line. Update frontmatter.spec.ts:53-65 to that, and record the change in the commit message.
- [ ] A meta-bind write and a Properties-panel style dispatch (no userEvent) still change the frontmatter. Typing on body lines and Enter in the middle of the body work as before.
- [ ] With the frontmatter decorator disabled, or with live preview off, the frontmatter can be edited by keyboard as today.
- [ ] Gate: pnpm check, pnpm vitest run and bash scripts/e2e.sh e2e/specs/live-preview pass.

## Notes

- **Priority:** content safety (bucket 1-content). Upheld content/medium. Cmd+Up+Enter or a held Backspace breaks the hidden fence on any note with properties, and autosave writes broken frontmatter. The e2e at frontmatter.spec.ts:53-65 pins only where the cursor lands, not edits, so it stays valid.
- **Trigger:** A note with frontmatter (properties, _type, meta-bind) is open in live preview. The user presses Cmd+Up (or ArrowUp from the first body line) and then Enter to make room at the top. Or the user deletes the first body line with Backspace held down, and the key repeat runs past the start of the line. Nothing visible happens on the hidden lines. The fence breaks, the raw YAML appears as body text (the closing `---` turns `status: todo` into a setext heading), and autosave writes it.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:14-20 hides each line with a plain replace and covers no line break; plugins/frontmatter-field.ts:23 hides lines openIdx..closeIdx; plugins/frontmatter-field.ts:76-88 handles the mouse only, and :86 says keyboard moves are not changed; `rg atomicRanges|transactionFilter|changeFilter src/lib` returns nothing; e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:53-65 pins ArrowUp onto the first hidden line; the Issue 03 note (commit 1d58399ad) records it as today's behavior, not a requirement; parsers/frontmatter.ts:10,24-30 needs line 0 and the closing line to match /^---\s*$/ exactly.
- **Second opinion:** upheld (content, medium). The frontmatter is always hidden with per-line replace decorations (hide-lines.ts:14-20), and it is not revealed when the cursor enters it. rg finds no atomicRanges, transactionFilter or changeFilter under src/lib. frontmatterClick only handles the mouse, and its comment says keyboard moves are not changed. The e2e at frontmatter.spec.ts:53-65 shows ArrowUp lands on a hidden line. Backlinks at the start of a non-empty first body line merge it with the closing `---`. Enter after Cmd+Up splits the opening fence. Either way findFrontmatterBlock stops matching and autosave writes broken frontmatter. Nothing guards this path.
- **Source:** audit 2026-11-05, domain `live-preview`, finding `N-live-preview-01` (from live-preview-content-1). Size M.

## Comments
