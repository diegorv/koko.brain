# 03: Quick Capture writes page titles, app ids and URLs into template frontmatter as valid YAML

**What to build:** Template values go into the frontmatter raw. executeCaptureAction sets `vars.title`, `vars.sourceTitle`, `vars.sourceApp`, `vars.sourceUrl` and `vars.url` from the capture (src/lib/app/deep-link-actions.ts:176-187), and processTemplate/evaluatePart paste custom variables verbatim (src/lib/utils/template.ts:28-30, :195-197). `source_title: How to X: a guide` is not valid YAML, and `Release notes #12` loses everything after ` #` to a comment. The note is then written with that block (deep-link-actions.ts:228-229). Every frontmatter writer refuses the block afterwards (Properties panel, meta-bind, updateNoteFrontmatter), so the owner's status/tags/kind properties cannot be edited without fixing YAML by hand. On link captures the title and tags injection is skipped with a toast that says only that the title was not added (:200-217), and clip and note captures get no message at all. The comment at :196-199 already names this case. Fix direction: capture variables that land inside the frontmatter block come out as YAML-safe scalars (quoted and escaped when a plain scalar would not round-trip), so the shipped example and the doc snippet work unchanged for any title. The body (after the closing `---`) keeps the raw text. Update help/examples/templates/Quick Note.md and doc 09 only if the chosen fix needs it, and say in doc 09 what a title with special characters produces. Do not change the lossy-block refusal itself: a template block that is broken on its own is still written as-is with the toast.

**Blocked by:** none

**Status:** resolved

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [x] Failing test first, in src/tests/lib/app/deep-link-capture-frontmatter.test.ts: a clip capture with sourceTitle `How to X: a guide` and a template `---\nsource_title: <% sourceTitle %>\nstatus: inbox\n---\n`; the written note's frontmatter parses (detectLossyFrontmatter returns null) and `source_title` reads back as `How to X: a guide`, with no toast. It fails today.
- [x] A link capture titled `Clean Code: A Handbook` with `title: <% title %>` writes a parseable block, the title and tags injection runs, and no toast shows. The existing test at deep-link-capture-frontmatter.test.ts:89 asserts the old skip-and-toast result for this input: move it to a template block that is broken on its own (like the `project: [inbox` case at :127) and record that contract change in the commit message.
- [x] A sourceTitle containing ` #`, a leading `[`, or a double quote reads back unchanged from the parsed frontmatter.
- [x] The same variables used in the note body (after the closing `---`) are inserted unquoted.
- [x] A template whose own block does not parse is still written as the template made it, with the toast (tests at :106, :127, :164 stay green).
- [x] Only Tauri APIs and side-effect services are mocked; template.ts and properties.logic.ts are real.
- [x] Frontend gate: `pnpm check` + `pnpm vitest run` pass.

## Notes

- **Priority:** content safety (bucket 1-content). Upheld content/medium. Quick Capture is daily, and browser titles with ': ' are common. Each such capture writes corrupt or truncated frontmatter, and every writer then refuses the note. It comes after the editor items only because the editor is the owner's first priority.
- **Trigger:** A Quick Capture template (the shipped help/examples/templates/Quick Note.md, or one written from the doc 09:37-41 snippet) has `source_title: <% sourceTitle %>` or `title: <% title %>`, and the owner captures from Chrome or Safari while the page title contains `: ` ("How to X: a guide", "GitHub - org/repo: description"), starts with `[`, `*`, `&`, `!`, `>`, `@` or a quote, or contains ` #`. Common page titles look like this.
- **Evidence (verified by reading code at `5f8003d67`):** help/examples/templates/Quick Note.md:2,7,8 (`title: <% title %>`, `source_title: <% sourceTitle %>`, `source_app: <% sourceApp %>` unquoted); help/documentation/09-quick-notes-and-templates.md:37-41 shows the same unquoted shape. src-tauri/src/quick_capture/commands.rs:337 inserts the raw page title as `sourceTitle`. src/lib/app/deep-link-actions.ts:176-187 copies title/sourceTitle/sourceApp/sourceUrl/url into vars; :188 processTemplate. src/lib/utils/template.ts:28-30 replaces each placeholder with evaluateExpression; :195-197 returns customVariables[part] verbatim. deep-link-actions.ts:196-199 comment names the unquoted-colon case; :200 detectLossyFrontmatter runs only when a title or tags must be injected; :228-229 writes the block as-is; :212-217 toast 'the title was not added'. Prior decision for the symptom only (keep the block, toast): commit 40ef27522 (Issue 17), test src/tests/lib/app/deep-link-capture-frontmatter.test.ts:89.
- **Related Issues before the audit:** `.scratch/file-io-audit/issues/53-deep-link-content-fidelity.md`
- **Second opinion:** upheld (content, medium). Confirmed. deep-link-actions.ts:176-188 puts raw title, sourceTitle, sourceApp and url into vars, and the shipped help/examples/templates/Quick Note.md has them unquoted (`title: <% title %>`, `source_title: <% sourceTitle %>`). A page title with ': ' gives invalid YAML, and ' #' truncates the value as a comment. The note is still written (:226-229), and the lossy check only gates the title/tags injection. Browser titles with ': ' are common, and the written note's frontmatter ends up corrupted or truncated on disk.
- **Source:** audit 2026-11-05, domain `calendar`, finding `N-calendar-01` (from calendar-content-1, calendar-ux-4, calendar-spec-5). Size M.

## Comments

- 2026-11-06, branch issue/03-quick-capture-writes-page-titles-app-ids: added yamlScalar (frontmatter) and made processCaptureTemplate write capture variables in the template's frontmatter as YAML-safe scalars (body stays unquoted); a placeholder followed by a YAML comment is quoted too. The deep-link skip-and-toast test moved to a template block broken on its own. Tests: pnpm check 0 errors; full suite at b3661bb2e 546 files, 12977 passed, 1 skipped, 1 todo; pnpm build passed. Reviews: round 1 APPROVED, round 2 APPROVED (one nit about placeholders inside trailing comments, no fix needed).
