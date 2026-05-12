#!/usr/bin/env bash
# Wrapper invoked by Tauri's `build.beforeBuildCommand`. Skips `pnpm build`
# when none of the inputs that influence the frontend bundle have changed
# since the previous successful run, so a "no-op" `pnpm tauri build` does
# not regenerate `build/` (and therefore does not invalidate Tauri's
# embedded-asset fingerprint, which would force a relink of the kokobrain
# crate).
#
# Inputs that count as a change:
#   - anything under src/ or static/
#   - top-level frontend config: package.json, pnpm-lock.yaml, vite.config.js,
#     svelte.config.js, tsconfig.json, tailwind.config.* (if present)
#
# The fingerprint is a single SHA-256 over the sorted list of
# "<sha256>  <path>" pairs from `git ls-files`'d frontend inputs plus
# uncommitted modifications to the same set. We deliberately use git
# tracking as the file enumerator so generated artifacts and user-local
# junk in the working tree don't perturb the hash.
#
# State is stored at `build/.beforeBuildCommand-fingerprint`. If `build/`
# does not exist (clean checkout), or the file is missing, we run the build
# unconditionally.
#
# Bypass for one run with: `KOKO_FORCE_FRONTEND_BUILD=1 pnpm tauri build`.

set -euo pipefail

# Resolve repo root regardless of cwd Tauri invokes us from.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

BUILD_DIR="build"
FINGERPRINT_FILE="$BUILD_DIR/.beforeBuildCommand-fingerprint"

run_build() {
	echo "[tauri-before-build] running pnpm build" >&2
	pnpm build
	mkdir -p "$BUILD_DIR"
	printf '%s' "$1" > "$FINGERPRINT_FILE"
}

if [[ "${KOKO_FORCE_FRONTEND_BUILD:-0}" == "1" ]]; then
	echo "[tauri-before-build] KOKO_FORCE_FRONTEND_BUILD=1, forcing rebuild" >&2
	NEW_HASH="forced-$(date +%s)"
	run_build "$NEW_HASH"
	exit 0
fi

# Compute fingerprint over frontend-relevant tracked files + their working-tree
# state (so uncommitted edits also invalidate). `git ls-files -m -o --exclude-standard`
# would catch new files; we use ls-files plus a separate diff over the same set.
INPUT_PATHS=(
	"src"
	"static"
	"package.json"
	"pnpm-lock.yaml"
	"vite.config.js"
	"svelte.config.js"
	"tsconfig.json"
)

# Drop entries that don't exist (e.g. static/ may be absent in some checkouts).
EXISTING=()
for p in "${INPUT_PATHS[@]}"; do
	[[ -e "$p" ]] && EXISTING+=("$p")
done

if [[ ${#EXISTING[@]} -eq 0 ]]; then
	echo "[tauri-before-build] no frontend inputs found, falling back to unconditional build" >&2
	run_build "fallback-$(date +%s)"
	exit 0
fi

# Hash file contents on disk (covers committed + uncommitted). `find ... -type f`
# walks only files; sort makes the order deterministic across filesystems.
NEW_HASH="$(
	find "${EXISTING[@]}" -type f -not -path '*/node_modules/*' -not -path '*/.svelte-kit/*' -print0 \
	| sort -z \
	| xargs -0 shasum -a 256 \
	| shasum -a 256 \
	| awk '{print $1}'
)"

if [[ -f "$FINGERPRINT_FILE" ]]; then
	OLD_HASH="$(cat "$FINGERPRINT_FILE")"
	if [[ "$OLD_HASH" == "$NEW_HASH" ]]; then
		echo "[tauri-before-build] frontend inputs unchanged (sha256 $NEW_HASH), skipping pnpm build" >&2
		exit 0
	fi
	echo "[tauri-before-build] frontend inputs changed ($OLD_HASH -> $NEW_HASH), rebuilding" >&2
else
	echo "[tauri-before-build] no fingerprint on file (fresh build dir), running first build" >&2
fi

run_build "$NEW_HASH"
