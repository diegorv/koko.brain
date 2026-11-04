# 58: Dialogs share one anatomy: visible title, built-in close, bounded height

**What to build:** File History hides the built-in close (`showCloseButton={false}`) and renders its title twice (custom header plus an sr-only title); IconPicker sets both `max-w-[550px]` and `sm:max-w-lg`; dialogs have no max height. Make `Dialog.Title` the visible title in File History and restore the close X, set IconPicker to `sm:max-w-[550px]`, and give dialog content `max-h-[calc(100dvh-4rem)] overflow-y-auto`. Popover content defaults to `p-3` (every call site overrides `p-4` today).

**Blocked by:** 36

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] File History dialog test asserts one visible title and a close button
- [ ] Dialog content carries the height cap (test on the primitive)
- [ ] No popover call site needs to override padding to get `p-3`

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Overlay anatomy" and section 3 Overlays rows 5 and 11.
- Issue 36 removes the stray focus outline on dialog content.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.
