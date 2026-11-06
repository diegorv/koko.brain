# 20: Enter in the quick switcher creates the note when nothing matches

**Migrated from:** `.scratch/ux-polish/issues/03-quick-switcher-enter-creates-on-no-match.md` (audit 2026-11-05). Priority: daily use and UI correctness (bucket 2-ux). Still present, ux/medium. In the daily Cmd+O, type, Enter flow, Enter does nothing when nothing matches.

**Audit check at `5f8003d67`:** still_present (ux, medium). src/lib/features/quick-switcher/QuickSwitcher.svelte:94-103: with no match the Create action is a plain <button onclick={createAndOpenNote}> inside <Command.Empty>. The component has no keydown handler and no Command.Item for it, so Enter has no selected item to act on (bits-ui behavior taken from the Issue, node_modules not read). Only commit touching the branch is the initial one. Typing a new note name and pressing Enter is a normal keyboard flow for an Obsidian-style switcher.

**Stale in the text below:** Line range 94-103 is accurate. Test helper createFromQuery at src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts:57-70 still clicks a button, as the Issue says.

**What to build:** With a query that matches no note, Enter creates and opens the note, as a click does today. The Create action is a plain `<button>` inside `<Command.Empty>` (`src/lib/features/quick-switcher/QuickSwitcher.svelte`, about lines 94-103). bits-ui's Enter handler acts only on the `[data-selected]` `Command.Item`, and there is none, so Enter does nothing. Replace that branch with a `Command.Group` holding one `Command.Item` whose `onSelect` calls `createAndOpenNote`, with the same `FilePlus` icon and `Create "<query>"` label. Give it a value that cannot equal a file item's value (file items use absolute paths, for example `create:<query>`). The item must be the selected one when it appears; if bits-ui does not select it on its own with `shouldFilter={false}`, set the Command's selected value when this branch renders. The empty-query "No files found." branch stays.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: a new test in `src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts` opens the switcher, types "Ideas" with no files in the tree, dispatches `keydown` Enter on the input, and asserts `create_note` was invoked, `openFileInEditor` was called with `/vault/Ideas.md`, and `quickSwitcherStore.isOpen` is false. It fails on the current code
- [ ] The three existing create tests keep their assertions; only the `createFromQuery` helper (about line 56) changes, to click the create item (`[data-slot="command-item"]` with the label) instead of a `button`
- [ ] A new test: when a note matches the query, no create item is rendered and Enter opens the first match
- [ ] Clicking the create item still creates and opens the note (covered by the rewritten helper)

## Notes

- **Source:** `work/overlays.md` P11; review section 2 "Palettes: create-on-no-match as a real `Command.Item`" and section 3 row "Quick switcher Create not reachable by Enter".
- **Out of scope:** a create action while some notes match (owner decision, recommendation: separate ticket only if wanted), the "Failed to create file." toast copy (overlays P23), palette density and footer hints (overlay anatomy pass).
- **Size:** S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, medium). Confirmed at HEAD and in bits-ui. When nothing matches, QuickSwitcher.svelte:94-103 renders a plain <button onclick> inside Command.Empty. bits-ui's Enter handler (node_modules/bits-ui/dist/bits/command/command.svelte.js:956-968) only clicks #getSelectedItem(), and there is no Command.Item to select, so Enter does nothing. The component has no keydown handler of its own. The test helper createFromQuery (QuickSwitcher.test.ts:57-70) clicks a button, as the Issue says.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/03-quick-switcher-enter-creates-on-no-match.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
