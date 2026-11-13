# Issue 03 discovery

## Files that change

- `src/lib/core/frontmatter/properties.logic.ts` (near `serializeProperties`, :602): new `yamlScalar(value)`, the one-line YAML spelling of a string, from `yaml`'s `stringify` with `lineWidth: 0, blockQuote: false`. Plain when it round-trips, double-quoted and escaped otherwise (same quoting rules `serializeProperties` writes, e.g. `title: "Clean Code: A Handbook"`).
- `src/lib/plugins/quick-capture/note-composer.logic.ts`: new `processCaptureTemplate(template, fileTitle, vars)`. Inside the template's own frontmatter block (same `^---\n...\n---` match as `FRONTMATTER_REGEX`), a placeholder that is the whole value of a `key: ` line or a `- ` list item and names one of the capture text variables (`title`, `sourceTitle`, `sourceApp`, `sourceUrl`, `url`) is replaced with `yamlScalar(value)`. Every other placeholder, and everything after the block, goes through `evaluateExpression` raw, exactly as `processTemplate` does. One pass over the template, so a title containing `<% x %>` is never re-evaluated.
- `src/lib/app/deep-link-actions.ts:188`: call `processCaptureTemplate` instead of `processTemplate`. Comment at :196-199 updated (the colon case no longer comes from capture variables).
- `help/documentation/09-quick-notes-and-templates.md` (Source provenance, :37-41): one paragraph on what a title with special characters produces. Shipped `help/examples/templates/Quick Note.md` needs no change.

## Plan (test-first)

1. Unit tests for `yamlScalar` (properties.logic test) and `processCaptureTemplate` (note-composer.logic test): `: `, ` #`, leading `[`, double quote, plain value stays plain, body placeholders raw, user-quoted `"<% sourceTitle %>"` left alone, non-capture vars (`created`) left raw.
2. Integration in `src/tests/lib/app/deep-link-capture-frontmatter.test.ts`: clip capture `How to X: a guide` (criterion 1), link `Clean Code: A Handbook` with injection and no toast (criterion 2), ` #` / `[` / `"` round-trip (3), body unquoted (4).
3. Wire into deep-link-actions, docs.

## Prior-art tests

- `deep-link-capture-frontmatter.test.ts` (real template.ts + properties.logic.ts, in-memory disk), `note-composer.logic.test.ts`.

## Defaults taken

- Only the five external text variables are quoted. Dates, `kind`, `capturedAt`, `dailyNotePath` stay raw so `created: <% created %>` keeps its date type and nothing else in existing templates changes.
- A placeholder the template author wrapped in quotes or mixed with other text is left raw: the author owns that syntax. Doc 09 says to write the placeholder as the whole, unquoted value.
- An empty capture variable in a whole-value slot becomes `""` (ADR-0029 canonical empty) instead of a bare `key:`.

## Conflict note (criteria 2 vs 5)

Criterion 5 lists the test at :106 to stay green, but its input (`title: <% title %>` + `Clean Code: A Handbook` + tags) is exactly what criterion 2 makes parseable, so its "both were left out" toast can no longer fire for that input. Resolved the way criterion 2 directs for :89: the :106 test keeps its name and assertions and moves to a template block broken on its own (`project: [inbox`). The lossy-block refusal contract it guards is unchanged. Recorded in the commit message.

## Risks

- A user template that already quotes the placeholder keeps working (left raw). A template with `key: <% title %>` whose title is a number-like string now writes `"1984"` (string) instead of `1984` (number).
