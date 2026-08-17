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
