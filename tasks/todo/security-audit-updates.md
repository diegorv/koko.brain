# Security audit dependency updates

Fix the 11 advisories from `pnpm audit` (undici, dompurify, esbuild, form-data).
All patched versions are past the 7-day `minimumReleaseAge` quarantine. One dep
per commit: update, run the full frontend suite (`pnpm check` + `pnpm vitest run`),
commit only if green, then move on. Work happens directly on `main`.

## Tasks

- [x] Task 1: Update `undici` to >=7.28.0 (jsdom `^7.25.0` + todoist-sdk `^7.16.0` already allow it) via `pnpm update undici -r`
- [x] Task 2: Update `dompurify` to >=3.4.11 (direct `^3.4.8` + mermaid `^3.3.1` allow it) via `pnpm update dompurify -r`
- [x] Task 3: Force `esbuild` >=0.28.1 via override. vite 8's esbuild peer is OPTIONAL (rolldown-based), so the override drops esbuild from the tree entirely. Confirmed `pnpm build` works via rolldown.
- [ ] Task 4: Force `form-data` >=4.0.6 via `overrides` in `pnpm-workspace.yaml` (todoist-sdk pins exact `4.0.5`)
- [ ] Task 5: Re-run `pnpm audit`, confirm clean, move this file to tasks/done/

## Notes

- Test gate per change: frontend only -> `pnpm check` + `pnpm vitest run`.
- `form-data` is the only one needing an override; the rest resolve via range bumps.
