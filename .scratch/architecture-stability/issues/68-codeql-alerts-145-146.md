# 68: CodeQL alerts 145 and 146: a script-block regex in import-graph and the comment strip in tag extraction

**What to build:** two open `high` CodeQL alerts on main (4dc2a2ad). Neither is exploitable, but both stay open until the code changes or the owner dismisses them.

- **Alert 145, `js/bad-tag-filter`, `scripts/import-graph.mjs:53`** (from Issue 04). `SCRIPT_RE = /<script\b[^>]*>([\s\S]*?)<\/script>/g` pulls the `<script>` blocks out of `.svelte` files for the import-graph tests (`layer-rules`, `feature-cycle`, `import-graph`, `markdown-editor-imports`). It reads only the repo's own files and filters no HTML, so this is not a security issue. It is still a small correctness gap: a `</script >` closing tag (with whitespace) or an uppercase `<SCRIPT>` would hide that block's imports from the layer ratchet. Fix in code: match case-insensitively and allow whitespace before the closing `>` (`/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi`), and keep `codeRegions`' line offset correct for the longer closing tag (it subtracts `'</script>'.length` today).
- **Alert 146, `js/incomplete-multi-character-sanitization`, `src/lib/utils/tag-extraction.ts:98`.** `extractInlineTags` drops HTML comments with `/<!--[\s\S]*?-->/g` so that tags inside a comment are not extracted. The result is a list of tag names; it is never rendered as HTML (its one consumer, `collection.logic.ts:69`, stores it as the `tags` property). The same alert on the same code was dismissed as "won't fix" when the file lived at `src/lib/features/tags/tags.logic.ts` (alert 9); Issue 20 moved the file, so CodeQL opened it again under the new path. Do not change the regex: `src-tauri/src/vault/parsing.rs:224` mirrors it on purpose ("Mirrors `/<!--[\s\S]*?-->/g`", the parity `TagAggregate.ts:11` documents), and a TS-only change would break that parity. The owner dismisses 146 on GitHub with the same reason as alert 9 ("won't fix: tag extraction, output is never rendered as HTML; parity with parsing.rs").

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Files:** scripts/import-graph.mjs,src/tests/lib/architecture/import-graph.test.ts

**Source:** code-scanning alerts 145 and 146 (https://github.com/diegorv/koko.brain/security/code-scanning/145, /146), read 2026-11-01.

- [x] A failing test first in `import-graph.test.ts`: a `.svelte` fixture whose `<script>` block closes with `</script >`, and one with `<SCRIPT>`, both have their imports listed with correct line numbers
- [x] `SCRIPT_RE` matches those forms, and the existing import-graph, layer-rules and feature-cycle tests pass with the baselines unchanged
- [x] `tag-extraction.ts` and `parsing.rs` are unchanged

## Notes

- **Size:** S.
- **Owner action, not for the agent:** dismiss alert 146 on GitHub (won't fix, reason above). Alert 145 closes on its own once the fix reaches main and CodeQL re-runs.

## Comments

- 2026-11-01, branch issue/68-codeql-alerts-145-146: `SCRIPT_RE` in import-graph now matches `</script >`, uppercase `<SCRIPT>` and closing tags with attributes; tag-extraction.ts and parsing.rs unchanged (alert 146 to be dismissed by the owner). Full suite: 417 files, 9829 passed, 1 skipped, 1 todo; build ok. Reviews: round 1 CHANGES_REQUESTED (closing tag with attributes, fixed), round 2 APPROVED.
