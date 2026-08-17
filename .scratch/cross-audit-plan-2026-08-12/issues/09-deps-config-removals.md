# Issue 09: Dead dependency and config removals

Status: ready-for-agent
Phase: P2
Source: PONY #4 #5 #6 #68 #69 #53 #11 #22 #30 #66 #70 — plan-2026-08-12.md §P2 — Safe deletion batch (Deps/config)
Blocked by: none

## What

Remove the three dead npm packages, the two dead cargo dependencies, and six orphaned config/source
one-liners. Each dependency (or tight group) is its own commit with a regenerated lockfile, so the
install size and supply-chain surface shrink without ever leaving a lockfile out of sync with its
manifest.

## How

- **#4** delete the `codemirror` meta-package from `package.json`; **#5** delete
  `@fortawesome/fontawesome-svg-core`; **#6** delete `@types/katex`. Run `pnpm install` after each so
  the regenerated `pnpm-lock.yaml` lands in the same commit. Frontend gate each.
- **#68** drop `percent-encoding` from `src-tauri/Cargo.toml`. **Keep the `# File History` comment** —
  `similar` under it is live. Regenerate and commit `Cargo.lock`.
- **#69** drop `objc2-core-foundation` — **its own commit**. Validation is a **real
  `cargo build --release`**, not just `cargo test`: 27 transitively-enabled CoreFoundation features
  flip off with it. The four macOS-gated `fonts.rs` tests must pass. Regenerate and commit `Cargo.lock`.
- **#53** the vite timestamp one-liner; **#11** `git rm scripts/settings-watcher.py`; **#22** delete
  `src/lib/components/ui/label/`; **#30** delete `sanitizeMathHtml` (adopting it instead would be a
  regression — do not wire it anywhere); **#66** delete `ColorPresetName`; **#70** delete `iconCount`
  (2-line delete including its JSDoc).
- Every deletion carries its test collateral in the same commit.

## Gate

- npm items (#4 #5 #6) and TS/config items (#53 #11 #22 #30 #66 #70): `pnpm check` + `pnpm vitest run`
  + `pnpm build`.
- Cargo items (#68 #69): `cargo test --manifest-path src-tauri/Cargo.toml`, plus for #69 a real
  `cargo build --release`.
- One commit per dependency (#69 strictly alone); the six misc one-liners may group by surface. Stage
  only the related files, verify with `git diff --cached --stat`, and use the repo's full commit
  format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

**2026-08-17 — resolved in 7 commits, all adversarially reviewed (could not refute, 7/7).**

- #4 `codemirror` — 6a6f957. All 8 imported `@codemirror/*` subpackages are direct deps; `@codemirror/lint` (the only meta-only transitive) is imported nowhere. Lock diff surgical.
- #5 `@fortawesome/fontawesome-svg-core` — aa6a0fa. Icon packs read raw definition tuples via a local FaDef type; no pack declares svg-core as peer. common-types survives transitively.
- #6 `@types/katex` — 41673e0. Reviewer discovery: under moduleResolution "bundler" the DT package was NEVER resolved (katex's exports-declared types always won; tsc --traceResolution shows "@types/katex never visited"), so this was strictly dead weight, not a typings switch.
- #68 `percent-encoding` — 455531d. `# File History` comment + `similar` kept (live at commands/history.rs:4). [[package]] entry survives for url/form_urlencoded.
- #69 `objc2-core-foundation` — 7d54cf2, own commit. Real `cargo build --release` green (4m51s) against the feature-flipped set (crate loses block2/libc it only had via kokobrain's default-features); all four macOS fonts tests pass. Reviewer confirmed via `cargo tree --locked` that the staged lock is exactly what cargo resolves, and that no CI path unifies features differently.
- #53 + #11 — 580f044. buildTime one-liner verified byte-identical to the old formatter across 8 timezones (half-hour offsets, UTC+14, year boundary, DST instants); settings-watcher.py had zero references repo-wide.
- #22 #30 #66 #70 — 4d1aa01. Pure deletions; sanitizeMathHtml NOT wired anywhere (per issue: adoption would be a regression). #70 required stripping `iconCount: 0` from the 12 pack literals in icon-data.ts in addition to the 2-line types.ts delete (excess-property checks).

No test collateral existed for any item (verified before each commit). Gates: frontend gate ran per npm/TS commit (check 0 errors, 6716 vitest passed, build green each time); cargo gate per Rust commit. Pre-existing stale-doc note from #69 review: docs/adr/0013 cites Cargo.toml:67-68 crates (security-framework, objc2-local-authentication) that exist neither at HEAD nor before this change — pre-existing, out of scope, not filed by this issue.
