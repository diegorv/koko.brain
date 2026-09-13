#!/usr/bin/env bash
# Type-check the Rust crate the way an iOS / Android build compiles it, on a
# desktop host.
#
# The Tauri CLI only exposes `tauri ios` on macOS and a real
# `--target aarch64-apple-ios` needs the Apple SDK, so the mobile profile is
# reproduced instead: `build.rs` emits the `semantic` / `desktop_integration`
# cfgs only when the matching Cargo feature is on AND the target is not
# mobile, so `--no-default-features` on the host yields the same cfg set as
# an iOS build. `KOKO_CAPABILITIES_GLOB` keeps tauri-build's ACL step to the
# capability file the mobile build actually resolves (`desktop.json` is
# platform-scoped and skipped on iOS, but a Linux / macOS host would still
# validate it against plugins this profile does not link).
#
# Usage: bash scripts/check-mobile-profile.sh [extra cargo args]

set -euo pipefail

cd "$(dirname "$0")/.."

KOKO_CAPABILITIES_GLOB='./capabilities/default.json' \
	cargo check --manifest-path src-tauri/Cargo.toml \
		--no-default-features --lib --tests --examples "$@"
