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

## Generated TS bindings

`cargo test` runs the ts-rs `#[ts(export)]` tests, which write the IPC bindings to `src/lib/contracts/generated/`. The env that drives them (`TS_RS_EXPORT_DIR` with `relative = true`, `TS_RS_LARGE_INT`, `TS_RS_IMPORT_EXTENSION`) lives in the root `.cargo/config.toml`, and cargo finds that file from the current directory, not from `--manifest-path`.

- Run cargo from the root of the checkout you are changing. From a worktree root (`.claude/worktrees/<slug>` or a relay-lite sibling `<repo>.worktrees/issue-NN-slug`), that worktree's own `.cargo/config.toml` wins and the bindings land in the worktree, which is correct.
- From the main root with `--manifest-path <worktree>/src-tauri/Cargo.toml`, main's config wins and the bindings are written into main's `src/`, not the worktree's.
- The variables are read when the tests run (`ts_rs::Config::from_env`), so an sccache hit cannot serve stale bindings; a shared `CARGO_TARGET_DIR` is fine too.

## Frontend gate

`pnpm check`, `pnpm vitest run` and `pnpm build` need only Node 22.17 or newer and pnpm; no platform-specific steps were required.

### In a git worktree

Install the dependencies in the worktree itself:

```sh
pnpm install --frozen-lockfile --offline
```

The pnpm store is shared, so this takes seconds and reuses the stored files (cloned or hard-linked) instead of downloading them; drop `--offline` when the lockfile names a package the store does not have yet. relay-lite runs `pnpm install --frozen-lockfile` in each worktree through `checks.setup` in `.agent-relay-lite/config.json`.

Do not symlink `node_modules` from the main checkout. SvelteKit 3's `svelte-kit sync` writes the generated tsconfig and the route ID and env types into `node_modules/$app/`, and the root `tsconfig.json` extends `$app/tsconfig`. Its `rootDirs` (`../..`, `../../.svelte-kit/types`) are relative to that folder, so through a symlink they resolve to the main checkout:

- `pnpm check` in the worktree reports errors that are not in the code (`Module '"*.svelte"' has no exported member ...`, `Binding element 'props' implicitly has an 'any' type`), while `vitest` and `build` still pass.
- The worktree's sync writes its route and env types into the main checkout's `node_modules/$app/types/` whenever they differ. Run `./node_modules/.bin/svelte-kit sync` in the main checkout to restore it.

## Retrieval eval

The offline retrieval eval (`docs/SEARCH.md` § "Evaluating retrieval changes") needs a real vault with its `.kokobrain/` database and the two ONNX models on disk, so it runs on the machine that owns the vault, not in a container.
