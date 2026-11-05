# 73: Folder rows in the Files navigator show the focus-visible ring on their buttons

**What to build:** Issue 37 gave chrome rows the app's focus-visible ring through `rowClass()` in `src/lib/features/rail-shell/FilesNavigator.svelte` (about line 283). For folder rows that class sits on the row `<div>` (about line 420), which never takes focus: the elements a keyboard user reaches are the disclosure toggle button (`data-files-navigator-toggle`, about line 436) and the folder-name button inside the row. Tabbing to either shows no ring today. Make the ring visible when either button has keyboard focus, with one of the two approaches the Issue 37 review named: put the ring classes on the buttons themselves, or keep them on the row and add a `has-[:focus-visible]:` ring to the row `<div>` so the whole row lights up. Pick the one that matches how the vault-root row (about line 318) and the Types navigator rows look when focused, and say which in the commit. Mouse clicks must not show the ring.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/focus-ring.spec.ts`.

- [x] Failing first: a case in `e2e/specs/focus-ring.spec.ts` tabs to a folder row's toggle and to its folder-name button in the Files navigator and asserts the ring (box-shadow or outline in the ring color) on the focused button or its row; it fails on the current code
- [x] A mouse click on the same folder-name button shows no ring (`:focus-visible` does not match after a pointer click), covered in the same spec; this also covers the optional Browse-trigger mouse case from the Issue 37 review
- [x] The vault-root row, file rows and Types navigator rows keep their Issue 37 focus behavior (existing `focus-ring.spec.ts` cases stay green)
- [x] Drag-and-drop styling on the row (`dropTarget` dashed outline) is unchanged

## Notes

- **Source:** Issue 37 review (`.scratch/ux-polish/work/37/review.md`, finding 1 minor, finding 2 nit), filed as the follow-up the review asked for.
- **Owner:** filed on 2026-11-04 at the owner's request, not to run that day.
- **Out of scope:** other navigators' row recipes, the ring color itself (Issue 36).
- **Size:** S.

## Comments

- 2026-11-05 (issue/73-files-navigator-folder-focus-ring): folder rows light up through a `has-[button:focus-visible]` ring on the row when the toggle or folder-name button has keyboard focus; mouse clicks and renames show none. Review round 1 APPROVED with 2 E2E nits fixed after review (ring colour assertion, no ring while renaming). Delivery finished by the main session after the deliver run timed out under load: full suite 499 files, 11818 passed, build OK, focus-ring E2E 10 passed.
