# 58: Dialogs share one anatomy: visible title, built-in close, bounded height

**What to build:** File History hides the built-in close (`showCloseButton={false}`) and renders its title twice (custom header plus an sr-only title); IconPicker sets both `max-w-[550px]` and `sm:max-w-lg`; dialogs have no max height. Make `Dialog.Title` the visible title in File History and restore the close X, set IconPicker to `sm:max-w-[550px]`, and give dialog content `max-h-[calc(100dvh-4rem)] overflow-y-auto`. Popover content defaults to `p-3` (every call site overrides `p-4` today).

**Blocked by:** 36

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] File History dialog test asserts one visible title and a close button
- [x] Dialog content carries the height cap (test on the primitive)
- [x] No popover call site needs to override padding to get `p-3`

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Overlay anatomy" and section 3 Overlays rows 5 and 11.
- Issue 36 removes the stray focus outline on dialog content.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-05, branch `issue/58-dialog-anatomy`: dialog content capped at `max-h-[calc(100dvh-4rem)] overflow-y-auto`; File History uses `Dialog.Title` as its one visible title and keeps the built-in close; IconPicker is `sm:max-w-[550px]`; popover content defaults to `p-3` and call-site overrides are gone. Round 1 review findings: 1, 2, 3, 5 deferred (see review.md Resolution), 4 done (focus-ring E2E, 10 passed). Full suite: run 1 exit=1 (one unrelated timeout in properties.logic.test.ts, passes alone), run 2 exit=0 (502/502 files, 11876 passed), build green. Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
