#!/usr/bin/env bash
# Install git hooks for this repository.
# Usage: bash scripts/setup-hooks.sh

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"
HOOK_TARGET="$HOOKS_DIR/pre-commit"
HOOK_SOURCE="../../scripts/pre-commit-dep-age.sh"

if [[ -f "$HOOK_TARGET" ]] && [[ ! -L "$HOOK_TARGET" ]]; then
	echo "Backing up existing pre-commit hook to pre-commit.bak"
	mv "$HOOK_TARGET" "$HOOK_TARGET.bak"
elif [[ -L "$HOOK_TARGET" ]]; then
	echo "Removing existing pre-commit symlink"
	rm "$HOOK_TARGET"
fi

ln -s "$HOOK_SOURCE" "$HOOK_TARGET"
echo "Installed pre-commit hook: $HOOK_TARGET -> $HOOK_SOURCE"
echo "Done. Dependency age quarantine is now active."
