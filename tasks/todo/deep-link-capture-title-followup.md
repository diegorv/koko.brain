# Deep-link `capture` — title in templates + docs follow-up

The previous plan (`deep-link-capture-title.md`, now in `tasks/done/`) added the `title` query param to `kokobrain://capture` and injects it into the resulting note's YAML frontmatter via `injectTitleIntoContent`. That handles the YAML side, but the value never reaches the template engine, so user templates cannot reference the deep-link title via `<% title %>`. This follow-up exposes the title to the template, updates the bundled example template, and brings the docs in sync.

## Tasks

- [ ] Task 1: In `executeCaptureAction` (deep-link.service.ts), set `vars.title = action.title ?? getQuickNoteTitle(filenameFormat, date)` before calling `processTemplate`. Service tests assert that `<% title %>` substitutes to the deep-link title when present and falls back to the filename-derived title otherwise. Existing post-template `injectTitleIntoContent` call remains the source of truth for the YAML `title:` field.
- [ ] Task 2: Update `help/examples/templates/Quick Note.md` to include a `title: <% title %>` line in the YAML block so the example shipping with the app demonstrates how the new `title` param flows. No other lines in the template change.
- [ ] Task 3: Update `help/documentation/23-deep-links.md` `capture` section to document the `title` parameter (table row + at least one example). Also add a row under "Next Steps" or "Examples" that demonstrates `title=` in a real URI.

## Notes

- The post-template `injectTitleIntoContent` is intentionally kept so that a user's custom template without `<% title %>` still ends up with the YAML `title:` populated.
- Order of YAML fields is determined by the underlying `yaml` Document API; templates that already have a `title:` line will have it overwritten by `injectTitleIntoContent` (this is fine — that is the precedence rule already documented in the helper).
- Run gate: `pnpm check` + `pnpm vitest run`. No Rust changes.
