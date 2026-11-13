VERDICT: APPROVED

Re-review round 2 of the fixes in df7b718b4 (diff `532e209e9..HEAD`: five help files plus the Resolution section of review.md).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | 25-types-and-relationships.md:301 now says the Inbox lists `_organized: false` notes "unless you hide it in **Settings → Rail**"; type-definitions-features/README.md:87 drops "(always there)". Matches `arrangeRailGroups` (src/lib/features/rail-shell/rail-items.logic.ts:76), which keeps only Search and Today when hidden. No other "always in the rail" / "always there" left in help/ or src/tests/. |
| 2 | minor | resolved | 25:49 lists `_order`, `_sort`, `_open_in_editor`, `_group`, `_visible`, `_rail` and notes `_sort` is checked against the `.view` sort values. Matches `RESERVED_KEY_RULES` (src/lib/features/type-definitions/type-sidebar.logic.ts:405-420) run by `ignoredKeyNotes` on the definition (lens.logic.ts:471). Leaving out `_rail_view` is correct: its check passes whenever `fm.views` is not an array (type-sidebar.logic.ts:416), which is always the case for a type definition. |
| 3 | nit | resolved | 25:53 `_icon` effect reads "(note list, editor tabs)". |
| 4 | nit | resolved | 18-trash.md:15 "choose **Trash** in the Settings navigation list"; 26-theming.md:149 no longer lists "lifecycle button hover"; 01-getting-started.md:79 heading "Showing and hiding panels". No link in help/, docs/, src/ or e2e/ targets `#toggling-the-sidebars`. |

## Acceptance criteria re-checked

- [met] One reference table of every type-definition key in help 25 (including `_rail`), with the dead ones removed from the help or marked as not applied (wiring them is a behaviour change, out of scope here): `_view` and type `_sort` say what they do today, and the built-in type icons and colours are documented only if they are applied (review F61) — the intro at 25:49 now names every key that gets a mark (finding 2) and the `_icon` row no longer claims the Files navigator (finding 3); the `_sort` / `_view` "Not applied" rows are unchanged.
- [met] Help 07, 01 and 02 describe the rail as shipped: rail items and their order, pinned items, Settings > Rail, Cmd+1 / Cmd+2 and the palette Go to commands, the Views section (groups, hidden views, Move to Trash, New / Edit view dialog), the error and loading states of a view — only the 01 heading changed; the section body (Cmd+1/Cmd+2/Cmd+Shift+B, palette names) is intact.
- [met] Help 25 lifecycle: the `_organized` default (Issue 08), Explicit organization and the creation paths it covers (Issue 16), which lenses list type definitions and `.view` files (Issue 12); help 22 says type `_archive_to` needs Auto Move on (review F58) — 25:301 no longer contradicts Settings > Rail hiding the Inbox; the rest of the section is unchanged.
- [met] Copy that names one concept two ways is unified across help and Settings text: Favorites vs Pinned, "Left Sidebar", "Sidebar" for the right sidebar only, Base folder of Periodic Notes also deciding Cmd+N and "+ New here" notes, system folder hidden from which lists (review F08, F14, F35) — the three "sidebar" leftovers from finding 4 are gone.
- [met] `help/examples/type-definitions-features/` has working samples of the new `.view` keys (a grouped view, a hidden view, a pinned view, a multi-view `.view` with `_rail_view`, a filter with a date operator) and a pinned type; its README lists them and no longer puts lifecycle buttons in the Properties panel; `src/tests/help/type-definitions-views.test.ts` and `examples-scoping.test.ts` cover the new samples (extend, do not weaken) — README step 6 lost only "(always there)"; src/tests/help passes.
- [met] `help/documentation/README.md` and the help page list are in order, with no page describing removed UI — the fixes touch no index entry; the 26-theming row no longer names the removed lifecycle buttons.

## Findings

None open, none new.

## Checks run (by this review)

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/help`: exit 0, 7 files, 235 tests passed.
- The fixes change help Markdown only; no test was added, changed or removed. Full suite and build are deliver's to run.
- Scope: the diff touches only the four files named in the findings, the example README and review.md. No source code, no layer-baseline change.
