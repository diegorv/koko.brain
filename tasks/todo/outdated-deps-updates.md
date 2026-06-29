# Outdated dependency updates

Bring `pnpm outdated` and `cargo outdated` deps up to latest. One dependency per
commit: update, run the relevant test suite, commit only if green, then next.
Work happens directly on `main`.

Test gate per change:
- Frontend (pnpm) -> `pnpm check` + `pnpm vitest run`
- @playwright/test -> additionally `bash scripts/e2e.sh` (it only affects E2E)
- Rust (cargo) -> `cargo test --manifest-path src-tauri/Cargo.toml`

Quarantine note: `minimumReleaseAge` (7 days, cutoff 2026-06-22) may block the
very latest version. If so, resolve to the newest allowed version and note it.

## Frontend (pnpm) tasks

- [x] T1: @codemirror/search 6.7.0 -> 6.7.1
- [x] T2: @codemirror/view 6.43.0 -> 6.43.1 (6.43.4 held back by quarantine)
- [x] T3: @tailwindcss/vite 4.3.0 -> 4.3.1 (dev) (4.3.2 held back by quarantine)
- [x] T4: @tauri-apps/api 2.11.0 -> 2.11.1
- [x] T5: @tauri-apps/cli 2.11.2 -> 2.11.4 (dev)
- [x] T6: @xyflow/svelte 1.6.0 -> 1.6.1
- [x] T7: semver 7.8.2 -> 7.8.5 (dev)
- [~] T8: svelte 5.56.1 -> HELD at 5.56.1. svelte 5.56.2+ tightened the parser and rejects `@xyflow/svelte@1.6.1`'s KeyHandler.svelte (`function isKeyObject(key?)` TS optional-param syntax in a non-`lang="ts"` script) -> RolldownError parse failure in 4 test files (canvas.logic, canvas.service, CollectionView, TypeNoteList.perf). 5.56.2 and 5.56.3 both break; 5.56.4 (potential fix) is still in the 7-day quarantine (published 2026-06-23). Re-evaluate 5.56.4 after 2026-06-30.
- [x] T9: tailwindcss 4.3.0 -> 4.3.1 (dev) (4.3.2 held back by quarantine)
- [x] T10: vitest 4.1.8 -> 4.1.9 (dev)
- [ ] T11: @doist/todoist-sdk 10.3.0 -> 10.5.0
- [ ] T12: @lucide/svelte 1.17.0 -> 1.21.0 (dev)
- [ ] T13: @playwright/test 1.60.0 -> 1.61.0 (dev) [+ e2e]
- [ ] T14: @sveltejs/kit 2.63.0 -> 2.66.0 (dev)
- [ ] T15: lucide-static 1.17.0 -> 1.21.0
- [ ] T16: simple-icons 16.22.0 -> 16.24.0
- [ ] T17: @types/node 25.9.1 -> 26.0.0 (dev, MAJOR)

## Rust (cargo) tasks

- [ ] T18: sysinfo 0.39.3 -> 0.39.5
- [ ] T19: tauri 2.11.2 -> 2.11.3
- [ ] T20: tauri-build 2.6.2 -> 2.6.3
- [ ] T21: uuid 1.23.3 -> 1.23.4

## Wrap-up

- [ ] T22: Re-run both `pnpm outdated` and `cargo outdated`, document any deps held back by quarantine, move this file to tasks/done/

## Notes

- @tauri-apps/* are exempt from the quarantine (minimumReleaseAgeExclude).
- All cargo deps show "Compat" (within range) patch bumps.
