# 12: Preserve exact type names and report partial rename results

**What to build:** Accepted type names remain exact YAML strings through creation and rename, across open and closed members; unsuccessful member updates are reported without rolling back the definition rename.

**Blocked by:** none
**Files:** src/lib/features/type-definitions/type-definitions.service.ts, src/lib/features/type-definitions/type-definitions.logic.ts, src/lib/core/frontmatter/properties.logic.ts, src/lib/core/note-creator/, src/lib/contracts/commands.ts, src/lib/contracts/index.ts, src/lib/contracts/generated/, src-tauri/src/commands/vault.rs, src-tauri/src/vault/parsing.rs, src-tauri/src/vault/entry.rs, src/tests/lib/features/type-definitions/, src/tests/lib/core/frontmatter/properties.logic.test.ts, src/tests/lib/core/note-creator/, src-tauri/tests/vault_type_rename_test.rs, src-tauri/tests/vault_frontmatter_parity_test.rs
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Both; include regenerated IPC bindings if the result contract changes.

## Acceptance criteria

- [ ] Rename to names containing apostrophes, comments, flow-style punctuation, numeric and boolean-looking text; parsed membership equals the exact accepted name.
- [ ] Cover plain, single-quoted, double-quoted, escaped, commented, quoted-key, and supported block-scalar old values with both production readers and writers.
- [ ] Open and closed notes produce equivalent membership after saving/reopening; preserve unrelated frontmatter and body content.
- [ ] Cover canonical `_type`, supported legacy `type`, casing normalization, and LF/CRLF. Array-valued membership remains unsupported and unchanged.
- [ ] Fallback typed-note creation preserves the same exact scalar for opening and non-opening callers; configured-template behavior remains.
- [ ] Continue through other open and closed members after one member fails.
- [ ] Keep the completed definition rename, return unsuccessful member paths, and report them in one toast and the established error log. No rollback.
- [ ] A failed open member retains its content; successful members remain updated.
- [ ] Preserve trailing-comment matching and the richer partial-result test contract already approved in the predecessor.
- [ ] Use failing production-parser and real-store tests first; do not reject previously accepted names instead of encoding them.

## Provenance

Supersedes all accepted scope of [open-itens 093](../../open-itens/issues/093-type-rename-reports-partial-failure-also-updates.md), including creation and partial failure. Typing behind the busy rename dialog is not a demonstrated reproduction and is excluded. [Evidence](../evidence.md#properties-and-types).

## Comments
