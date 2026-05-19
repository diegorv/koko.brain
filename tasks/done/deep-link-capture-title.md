# Deep-link `capture` action — accept `title` param

Extend the `kokobrain://capture` deep-link action with an optional `title` parameter. When present, the title is injected into the new note's YAML frontmatter as a `title:` property. Filename remains computed from `settingsStore.quickNote.filenameFormat` (no path change).

Motivation: quick-capture sends `Link` captures with a markdown body `[title](url)` but loses the structured title. Adding `title` as a separate param lets the brain side record it as a queryable YAML property without changing the file path layout.

## Tasks

- [x] Task 1: Add optional `title?: string` field to `CaptureAction` interface in `deep-link.types.ts`.
- [x] Task 2: Parse `title` query param inside `parseDeepLinkUri` for `case 'capture'` in `deep-link.logic.ts`. Trim, treat empty string as absent.
- [x] Task 3: Add `injectTitleIntoContent(content, title)` helper in `deep-link.logic.ts` mirroring `injectTagsIntoContent` shape (merge into existing frontmatter, replace existing `title` prop, create frontmatter if missing). Unit tests in `deep-link.logic.test.ts`.
- [x] Task 4: Wire `injectTitleIntoContent` into `executeCaptureAction` in `deep-link.service.ts` — applied after template processing, before tag injection. Service test in `deep-link.service.test.ts` asserting the resulting file body contains `title: <value>` in frontmatter.

## Notes

- Order of frontmatter injection: title first, then tags. Both helpers use the same `parseFrontmatterProperties` / `rebuildContent` pipeline, so ordering only affects array position in the YAML block, not behavior.
- No filename-collision dedup added (out of scope; existing behavior preserved).
- Tag-list overwrite footgun for non-list existing `tags` YAML prop is unchanged.
- Tests live in `src/tests/lib/features/deep-link/`.
- Run gate per CLAUDE.md rule 6: frontend changes -> `pnpm check` + `pnpm vitest run`. No Rust changes.
