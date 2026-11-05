# 18: Graph, people rows and Favorites drop views

**What to build:** Three readers still treat a view as a note, and do not follow from Issue 14:

- **Graph:** every `.view` is a node (`graph-view.logic.ts:25,53`). In `buildGraphData`, filter `entries` first, so the cache and the node loop see notes only.
- **People:** a view in the people folder becomes a person row (`one-on-one.logic.ts:155`, `buildMyPeople`).
- **Favorites:** `lens.logic.ts:308` does not apply `isListableNote`, so a view with a hand-written `_favorite: true` is listed. The owner decided views leave. Favorited type definitions stay, so filter `isViewFile` only, not `isListableNote`.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing tests first, with real logic:
  - `graph-view.logic`: no node and no edge for a view, including when a link names it.
  - `buildMyPeople`: no row for a view in the people folder.
  - Lens: a favorited view is absent, and a favorited type definition stays.
- [ ] `help/documentation/25-types-and-relationships.md` line 144 no longer says a favorited `.view` stays in Favorites.

## Notes

- Commit `8e2cb8608` introduced "except Favorites" and states no reason. The owner reviewed this and chose removal.
- **Size:** S.
