# 042: Enter in the quick switcher creates the note when nothing matches

**Origin:** `audit-2026-11-05` Issue 20, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/ux-polish/issues/03-quick-switcher-enter-creates-on-no-match.md` (audit 2026-11-05). Priority: daily use and UI correctness (bucket 2-ux). Still present, ux/medium. In the daily Cmd+O, type, Enter flow, Enter does nothing when nothing matches.

**Audit check at `5f8003d67`:** still_present (ux, medium). src/lib/features/quick-switcher/QuickSwitcher.svelte:94-103: with no match the Create action is a plain <button onclick={createAndOpenNote}> inside <Command.Empty>. The component has no keydown handler and no Command.Item for it, so Enter has no selected item to act on (bits-ui behavior taken from the Issue, node_modules not read). Only commit touching the branch is the initial one. Typing a new note name and pressing Enter is a normal keyboard flow for an Obsidian-style switcher.

**Stale in the text below:** re-checked at `635b4af36` (deep dive 2026-11-12): the Create branch is now `QuickSwitcher.svelte:97-105`, and the test helper `createFromQuery` is `src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts:59-71`. It still clicks a button, and five tests use it.

**What to build:** With a query that matches no note, Enter creates and opens the note, as a click does today. The Create action is a plain `<button>` inside `<Command.Empty>` (`src/lib/features/quick-switcher/QuickSwitcher.svelte`, about lines 97-105). bits-ui's Enter handler acts only on the `[data-selected]` `Command.Item`, and there is none, so Enter does nothing. Replace that branch with a `Command.Group` holding one `Command.Item` whose `onSelect` calls `createAndOpenNote`, with the same `FilePlus` icon and `Create "<query>"` label. Give it a value that cannot equal a file item's value (file items use absolute paths, for example `create:<query>`). The item must be the selected one when it appears; if bits-ui does not select it on its own with `shouldFilter={false}`, set the Command's selected value when this branch renders. The empty-query "No files found." branch stays.

**Blocked by:** none

**Status:** ready-for-agent

**Answered:** approved by the owner on 2026-11-12 as a deep-dive addition to the queue. Nothing open.

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: a new test in `src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts` opens the switcher, types "Ideas" with no files in the tree, dispatches `keydown` Enter on the input, and asserts `create_note` was invoked, `openFileInEditor` was called with `/vault/Ideas.md`, and `quickSwitcherStore.isOpen` is false. It fails on the current code
- [ ] The five existing create tests keep their assertions; only the `createFromQuery` helper (about line 59) changes, to click the create item (`[data-slot="command-item"]` with the label) instead of a `button`
- [ ] A new test: when a note matches the query, no create item is rendered and Enter opens the first match. It may pass today; it guards that the create item never takes the selection from a match
- [ ] Clicking the create item still creates and opens the note (covered by the rewritten helper)

## Notes

- **Source:** `work/overlays.md` P11; review section 2 "Palettes: create-on-no-match as a real `Command.Item`" and section 3 row "Quick switcher Create not reachable by Enter".
- **Out of scope:** a create action while some notes match (owner decision, recommendation: separate ticket only if wanted), the "Failed to create file." toast copy (overlays P23), palette density and footer hints (overlay anatomy pass).
- **Size:** S.
- **E2E:** `e2e/specs/quick-switcher.spec.ts` has no create or Enter case, so no e2e spec pins this change.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, medium). Confirmed at HEAD and in bits-ui. When nothing matches, QuickSwitcher.svelte:94-103 renders a plain <button onclick> inside Command.Empty. bits-ui's Enter handler (node_modules/bits-ui/dist/bits/command/command.svelte.js:956-968) only clicks #getSelectedItem(), and there is no Command.Item to select, so Enter does nothing. The component has no keydown handler of its own. The test helper createFromQuery (QuickSwitcher.test.ts:57-70) clicks a button, as the Issue says.

## Comments

- 2026-11-06: migrated from `.scratch/archived/ux-polish/issues/03-quick-switcher-enter-creates-on-no-match.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-12: deep dive (validate-s1+s2) confirmed it at `635b4af36`: Enter only clicks bits-ui's selected item (`command.svelte.js:957-970`), and there is none. Approved as an addition. Line pointers updated, the helper now serves five tests, and the match-case test is marked as a guard. The `pnpm build` in the Gate stays until the owner settles ADR 0030 against CLAUDE.md rule 6 (critique M7).
