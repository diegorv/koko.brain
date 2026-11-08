# 03: Enter in the quick switcher creates the note when nothing matches

**What to build:** With a query that matches no note, Enter creates and opens the note, as a click does today. The Create action is a plain `<button>` inside `<Command.Empty>` (`src/lib/features/quick-switcher/QuickSwitcher.svelte`, about lines 94-103). bits-ui's Enter handler acts only on the `[data-selected]` `Command.Item`, and there is none, so Enter does nothing. Replace that branch with a `Command.Group` holding one `Command.Item` whose `onSelect` calls `createAndOpenNote`, with the same `FilePlus` icon and `Create "<query>"` label. Give it a value that cannot equal a file item's value (file items use absolute paths, for example `create:<query>`). The item must be the selected one when it appears; if bits-ui does not select it on its own with `shouldFilter={false}`, set the Command's selected value when this branch renders. The empty-query "No files found." branch stays.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: a new test in `src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts` opens the switcher, types "Ideas" with no files in the tree, dispatches `keydown` Enter on the input, and asserts `create_note` was invoked, `openFileInEditor` was called with `/vault/Ideas.md`, and `quickSwitcherStore.isOpen` is false. It fails on the current code
- [ ] The three existing create tests keep their assertions; only the `createFromQuery` helper (about line 56) changes, to click the create item (`[data-slot="command-item"]` with the label) instead of a `button`
- [ ] A new test: when a note matches the query, no create item is rendered and Enter opens the first match
- [ ] Clicking the create item still creates and opens the note (covered by the rewritten helper)

## Notes

- **Source:** `work/overlays.md` P11; review section 2 "Palettes: create-on-no-match as a real `Command.Item`" and section 3 row "Quick switcher Create not reachable by Enter".
- **Out of scope:** a create action while some notes match (owner decision, recommendation: separate ticket only if wanted), the "Failed to create file." toast copy (overlays P23), palette density and footer hints (overlay anatomy pass).
- **Size:** S.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/042-enter-quick-switcher-creates-note-when-nothing.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
