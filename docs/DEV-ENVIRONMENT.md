# Developer environment notes

What a fresh machine needs before the test gates in `CLAUDE.md` run. macOS with Homebrew is the primary dev box and needs only `sccache` (see `.cargo/config.toml`). This file records what a Linux box or a remote container (Claude Code on the web, a CI-like sandbox) additionally needs, with the workarounds that were verified on Ubuntu 24.04 on 2026-09-09.

## Rust gate on Linux / remote containers

`cargo test --manifest-path src-tauri/Cargo.toml` fails on a bare container for four independent reasons. Each has a fix that does not touch the repo.

### 1. `sccache` is not installed

`.cargo/config.toml` sets `rustc-wrapper = "sccache"`, so cargo aborts with `could not execute process sccache`. Either install it (`cargo install sccache`) or disable the wrapper for the shell:

```sh
export RUSTC_WRAPPER=
```

An empty value overrides the config file. `CARGO_BUILD_RUSTC_WRAPPER=` works the same way.

### 2. `rustc` is older than a dependency requires

`sysinfo` 0.39.6 needs rustc 1.95. The error names the crate and the version. Update the toolchain rather than pinning the dependency back:

```sh
rustup update stable
```

### 3. Tauri's Linux system libraries are missing

`gtk-sys`, `webkit2gtk-sys` and friends need the `-dev` packages even for the library tests. The package list is the one CI uses (`.github/workflows/ci.yml`, "Install Tauri Linux dependencies"):

```sh
sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
  librsvg2-dev libxdo-dev libssl-dev libsoup-3.0-dev build-essential pkg-config
```

### 4. `ort-sys` cannot download ONNX Runtime

The `ort` crate (`download-binaries` feature) fetches a prebuilt ONNX Runtime from `cdn.pyke.io` at build time. Behind a proxy that blocks that host the build script fails with a 403 that names the version it wanted (`ms@1.28.0` for `ort 2.0.0-rc.13`). Fetch the same version from Microsoft's GitHub release and point `ort-sys` at it:

```sh
curl -sSL -o ort.tgz https://github.com/microsoft/onnxruntime/releases/download/v1.28.0/onnxruntime-linux-x64-1.28.0.tgz
tar xzf ort.tgz
export ORT_LIB_LOCATION="$PWD/onnxruntime-linux-x64-1.28.0/lib"
export ORT_PREFER_DYNAMIC_LINK=1
export LD_LIBRARY_PATH="$ORT_LIB_LOCATION"   # the test binaries link the .so dynamically
```

Keep the archive outside the repo (a scratch directory is fine). The version must match the one the 403 error names; a mismatch fails at link time, not at runtime.

### All four in one line

Once the packages and toolchain are in place, the gate is:

```sh
RUSTC_WRAPPER= ORT_LIB_LOCATION=/path/to/onnxruntime-linux-x64-1.28.0/lib ORT_PREFER_DYNAMIC_LINK=1 \
LD_LIBRARY_PATH=/path/to/onnxruntime-linux-x64-1.28.0/lib \
cargo test --manifest-path src-tauri/Cargo.toml
```

For a container that is recreated per session, the right place for steps 1-4 is a SessionStart hook (see the `session-start-hook` skill in Claude Code) so every session starts with a working gate instead of rediscovering this file.

## Frontend gate

`pnpm check`, `pnpm vitest run` and `pnpm build` need only Node 22 and pnpm; no platform-specific steps were required.

## Retrieval eval

The offline retrieval eval (`docs/SEARCH.md` § "Evaluating retrieval changes") needs a real vault with its `.kokobrain/` database and the two ONNX models on disk, so it runs on the machine that owns the vault, not in a container.
