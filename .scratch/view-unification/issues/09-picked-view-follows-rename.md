# 09: A picked or pinned view follows a rename or move

**What to build:** `followTypesPickPathChange` and `followRailPinPathChange` return null unless the path went to the Trash (`lens.logic.ts:969-978`, `:984-990`). The correction runs only once per vault open (`staleTypesPickFix`, `AppShell.svelte:161-180`). So after a rename the note list says "This view no longer exists" for a file that exists. Folders already follow a rename (`followFolderPathChange`).

Make both functions follow a rename or move, for the path itself and for a folder holding it, the same way `followFolderPathChange` does. The `types-navigator.service.ts` consumer needs no other change.

**Reproduce the pin case first.** Review validators disagreed on it. The pin's code has the same shape as the pick's, but it was never observed. If the failing test does not fail for the pin, report what happens instead.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing tests first, on the pure functions and through the real path-change consumer:
  - Pick `Week.view` in Types, rename it to `Month.view`: the pick is the new path and the list shows the view.
  - Same for a view inside a renamed folder.
  - A rail showing a pinned view follows too, and stays on that pin.
- [ ] `lens.logic.test.ts:1620` ("leaves the pick alone for a rename or move") changes to the new behavior. **The owner approved this change on 2026-11-05.** A sibling prefix and an unrelated path still change nothing.
- [ ] The doc comments on both functions are corrected.
- [ ] The Trash branch behaves as today.

## Notes

- **Size:** S.
