# 149: Usage stats count table and meta-bind interactions inside notes

**Origin:** `usage-telemetry` Issue 12, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/usage-telemetry/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The owner relies on tables and meta-bind, but both live inside `.md` notes. Counting file opens (Issue 10) never reveals them. This Issue counts **user actions** on them in Live Preview, through the core hook `reportUsage` from Issue 10 (`src/lib/core/usage-hook.ts`). The live-preview code is in `core/` and must not import `features/`.

Count actions, never renders. Decoration builders run on every viewport and document update, which is a hot path. Read `docs/agents/live-preview-rules.md` before touching these files. No `reportUsage` call may sit in a decoration builder, a `StateField` update or `WidgetType.toDOM` itself. It goes only in a DOM event handler that a user action triggers.

1. **Meta-bind button.** Add `reportUsage('metabind:button')` in the click handler of `MetaBindButtonWidget` (`src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts` about line 33), once per click, before the actions run.
2. **Meta-bind input.** The input widgets come from `pickWidget` in `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts`, used by `plugins/meta-bind-input-plugin.ts` (about line 16).
   - Find the handler that writes the bound frontmatter value when the user changes an input.
   - Report `metabind:input:<type>`, using the input type the parser already knows (toggle, select, slider and so on; see `parsers/meta-bind-input.ts`).
   - Report once per committed change, not on every keystroke of a text input. Use change, blur or commit.
3. **Tables.**
   - Find out whether the Live Preview table (`plugins/table-field.ts`, the table widget in `widgets.ts`) supports editing or any other user action: cell edit, add row or column, sort, or click to reveal source.
   - Count each such action as `table:<action>`.
   - If it supports none, count `table:reveal` when the user clicks into a rendered table to edit its source, and write down which handler that is.
   - Record what was found in Notes.

**Blocked by:** 148

**Blocked by (origin):** original line: "10 (the core hook)".

**Status:** ready-for-agent

**Gate:** Frontend: `pnpm check` + `pnpm vitest run`, plus the Live Preview E2E specs that cover meta-bind and tables, via `bash scripts/e2e.sh <spec>`.

**Meta-bind button**
- [ ] Failing first: clicking a meta-bind button records `metabind:button` exactly once (widget test with a reporter spy set through `setUsageReporter`; the hook is not mocked).

**Meta-bind input**
- [ ] Failing first: changing a toggle records `metabind:input:toggle` once.
- [ ] Typing several characters into a text input and committing records one event.

**Tables**
- [ ] Each table action found records `table:<action>` once.
- [ ] Rendering a note with a table and scrolling it records nothing.

**Hot path and regressions**
- [ ] No `reportUsage` call sits in a decoration builder, state-field update or `toDOM`. State this check in the commit message.
- [ ] Existing Live Preview tests stay green.

## Notes

- Owner decision 2026-11-06 (survey): track tables and meta-bind in a separate Issue.
- Add the new ids to Issue 08's "never used" denominator as fixed ids: `metabind:button`, plus one `metabind:input:<type>` per supported type, plus the table actions found.
- Size: M.

## Comments
