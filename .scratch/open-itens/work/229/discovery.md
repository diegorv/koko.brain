# 229 discovery: say plainly that the Todoist token lives in the vault

Docs and copy only; no storage change (PRD L1 answered (a)).

## Files that change

- `src/lib/features/todoist-sync/TodoistSection.svelte:75`: the token `SettingItem` description. The Issue cites `core/settings/...:20-21`; the component moved to `features/todoist-sync/`.
- `src/lib/core/settings/settings.types.ts:250`: the `apiToken` JSDoc (the Issue cites `:244`, lines moved).
- `docs/adr/0019-kokobrain-in-vault-data-dir.md`: new `## Amendment (2026-11-06): ...` section right after the frontmatter, as ADR-0003 places its 2026-11-01 amendments. Consequences (`:61`) stays untouched.
- `help/documentation/10-tasks-and-todoist.md:122-124`: one sentence under setup step 2.
- `src/tests/lib/features/todoist-sync/TodoistSection.test.ts`: new test, real settings store.

## Plan

1. Test first: the token row's text contains "Stored in this vault's .kokobrain folder. Exclude .kokobrain from sync tools." and still the Todoist path. Run it, see it fail.
2. Description becomes `Personal API token from Todoist Settings → Integrations → Developer. Stored in this vault's .kokobrain folder. Exclude .kokobrain from sync tools.`; test passes. Commit.
3. JSDoc + ADR amendment + help sentence. Commit.

## Prior art

- The `explains what each vault context does with the webhook` test in the same file: `row(...).textContent` with `toContain`. The token row has no `data-setting`, so the new test wraps it in `data-setting="api-token"`, matching the other rows.
- ADR-0003 `## Amendment (2026-11-01): ...` headings placed above Context.

## Risks

- `settings-copy.test.ts` bans em dashes in Settings sources: the new copy uses none.
- `help/documentation/19-settings.md:251` also describes the token row; out of the Issue's scope, left as is.

## Defaults taken

- The Issue's test path `src/tests/lib/core/settings/TodoistSection.test.ts` does not exist; the component's test lives at `src/tests/lib/features/todoist-sync/TodoistSection.test.ts`, so the test goes there.
- The description joins the existing path sentence and the new text with ". ".
