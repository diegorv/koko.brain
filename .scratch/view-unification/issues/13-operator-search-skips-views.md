# 13: Operator-only search and the in-memory fallback skip `.view`

**What to build:** Operator-only queries read `get_all_vault_entries_v2` and filter nothing by kind (`search.service.ts:191-193`, `search.logic.ts:162-184`), so `path:Projects` lists a `.view`. The FTS-failure fallback reads every entry's content (`search.service.ts:24-29,233`).

- `performOperatorOnlySearch`: add `if (isViewFile(entry.path)) continue;` first in the loop, before the `maxResults` break.
- `loadVaultContentMap`: drop view paths before `read_files_batch`.

`loadVaultTagMap` only filters FTS results and needs no change.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing tests first:
  - `search.logic.test.ts` (around `:371`), real logic, no mocks: a `/vault/Projects.view` entry with a matching tag and path is returned by neither `tag:` nor `path:`.
  - `search.service.test.ts` (pattern at `:378`), only Tauri `invoke` mocked: with `search_fts` rejecting, `read_files_batch` paths exclude the `.view`, and `searchStore` results do not contain it.

## Notes

- This ships alone: without Issue 12, full-text hits still list views.
- **Size:** S.
