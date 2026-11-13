# Issue 01: Re-audit when Tauri moves off gtk-rs 0.18

Status: needs-info
Source: dependency sweep 2026-08-19 (`cargo audit` + `cargo outdated` after commits 849b8a6a / ffa7a617)

Blocked by: upstream. Tauri 2.11.5 is the newest release that exists (verified below);
there is no version to bump to today.

## What

A single upstream change — Tauri migrating off the gtk-rs 0.18 line — clears **11 of the 17**
`unmaintained` warnings `cargo audit` reports, plus the standing `RUSTSEC-2024-0429` ignore, plus
the last `syn 1.x` in the tree. Tracking it as one item instead of twelve.

Nothing in this repo can force it. `[patch.crates-io]` cannot cross a major version (cargo requires
the replacement to satisfy the original requirement), so the gtk-rs 0.18 pin is unreachable from
here. This issue exists only to make the re-audit mechanical when upstream ships.

## What is currently held back

The chain, as traced on 2026-08-19:

```
tauri 2.11.5
  -> muda 0.19.3 / tauri-runtime-wry -> tao
    -> gtk 0.18.2 -> atk 0.18.2 -> glib 0.18.5
      -> glib-macros 0.18.5  \
      -> gtk3-macros 0.18.2  /  -> proc-macro-error 1.0.4 -> syn 1.0.109
```

Cleared by the bump (11 warnings):

- 10 gtk-rs `unmaintained`: `atk`, `atk-sys`, `gdk`, `gdk-sys`, `gdkwayland-sys`, `gdkx11`,
  `gdkx11-sys`, `gtk`, `gtk-sys`, `gtk3-macros`
- `proc-macro-error` (RUSTSEC-2024-0370). Its only parents are `glib-macros 0.18.5` and
  `gtk3-macros 0.18.2`, so it and `syn 1.0.109` leave the tree with them.
- The `RUSTSEC-2024-0429` entry in `src-tauri/.cargo/audit.toml` (glib 0.18.5 unsoundness). The
  rationale comment there already says "Drop this when that upstream bump ships" — this is that
  bump. Remember the mirrored `ignore:` list in `.github/workflows/security.yml`.

NOT cleared by it — the 6 remaining warnings, which are the only unmaintained crates that actually
compile on the shipped macOS target:

| Crate | Pulled by | On macOS host |
|---|---|---|
| `paste` | `tokenizers 0.23.1` | yes |
| `unic-char-property`, `unic-char-range`, `unic-common`, `unic-ucd-ident`, `unic-ucd-version` | `urlpattern 0.3.0` <- `tauri-plugin-http` + `tauri-utils` (build-dep) | yes |

Both parents are already at their latest release. Worth revisiting only if one of these turns from
`unmaintained` into a real CVE.

## Not part of this issue

- **`syn` 2 -> 3.** Unrelated to gtk-rs. 37 third-party proc-macro crates hold `syn = "2"`, all at
  their newest published version; syn 3 is already in the tree for the crates that migrated
  (`async-trait`, `displaydoc`, `futures-macro`, ...). Ecosystem-wide, nothing to do.
- **`windows-sys` 0.45 / 0.52 / 0.59 / 0.60 duplicates.** Every one is `cfg(windows)`, and CI runs
  only `macos-latest` + `ubuntu-latest`. `cargo tree -i windows-sys@0.52.0` on the host target
  prints "nothing to print" — never compiled. Lockfile noise, zero cost, no action.

## How to re-audit

1. `cd src-tauri && cargo outdated --root-deps-only` — currently reports "All dependencies are up to
   date". A new `tauri` line is the trigger.
2. On a new Tauri release, check whether gtk-rs moved:
   `cargo tree -i gtk --target all` and `cargo tree -i proc-macro-error --target all --depth 1`.
   Both going empty is the success condition.
3. If it moved: bump, run `cargo test --manifest-path src-tauri/Cargo.toml`, then drop
   `RUSTSEC-2024-0429` from BOTH `src-tauri/.cargo/audit.toml` and the `ignore:` input of the
   cargo-audit step in `.github/workflows/security.yml`.
4. Re-run `cargo audit` **from `src-tauri/`**, not the repo root. `cargo audit --file
   src-tauri/Cargo.lock` from the root silently skips `.cargo/audit.toml`, so the ignored advisory
   gets counted and the warning total reads 18 instead of 17. That false delta cost time during the
   2026-08-19 sweep.

## Baseline (2026-08-19)

- `cargo audit`: 0 vulnerabilities across 698 crate dependencies, 17 allowed warnings.
- `cargo outdated --root-deps-only`: clean.
- Rust: `tauri 2.11.5`, all 11 `tauri*` crates in `src-tauri/Cargo.toml` at latest. No Tauri 3
  exists (`cargo outdated` filtered on `tauri|wry|tao|muda|gtk|glib` returns nothing, and its
  `Latest` column ignores declared ranges).
- JS: `@tauri-apps/api` 2.11.1 and `@tauri-apps/cli` 2.11.4, both equal to registry `latest`.
