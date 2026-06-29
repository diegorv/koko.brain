# Security audit dependency updates

Fix the 11 advisories from `pnpm audit` (undici, dompurify, esbuild, form-data).
All patched versions are past the 7-day `minimumReleaseAge` quarantine. One dep
per commit: update, run the full frontend suite (`pnpm check` + `pnpm vitest run`),
commit only if green, then move on. Work happens directly on `main`.

## Tasks

- [x] Task 1: Update `undici` to >=7.28.0 (jsdom `^7.25.0` + todoist-sdk `^7.16.0` already allow it) via `pnpm update undici -r`
- [ ] Task 2: Update `dompurify` to >=3.4.11 (direct `^3.4.8` + mermaid `^3.3.1` allow it) via `pnpm update dompurify -r`
- [ ] Task 3: Update `esbuild` to >=0.28.1 (vite peer `^0.27.0 || ^0.28.0` allows it) via `pnpm update esbuild -r`
- [ ] Task 4: Force `form-data` >=4.0.6 via `overrides` in `pnpm-workspace.yaml` (todoist-sdk pins exact `4.0.5`)
- [ ] Task 5: Re-run `pnpm audit`, confirm clean, move this file to tasks/done/

## Notes

- Test gate per change: frontend only -> `pnpm check` + `pnpm vitest run`.
- `form-data` is the only one needing an override; the rest resolve via range bumps.
