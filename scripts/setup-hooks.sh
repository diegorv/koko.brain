#!/usr/bin/env bash
# Install git hooks for this repository.
# Usage: bash scripts/setup-hooks.sh
#
# The hooks dir comes from --git-common-dir, so running this from a linked
# worktree (where .git is a file) installs into the main checkout's
# .git/hooks, which every worktree shares. The links are relative to that
# dir, so worktrees run the main checkout's scripts/ copy.

set -euo pipefail

HOOKS_DIR="$(cd "$(git rev-parse --git-common-dir)" && pwd)/hooks"
mkdir -p "$HOOKS_DIR"

install_hook() {
	local name="$1"
	local source="$2"
	local target="$HOOKS_DIR/$name"

	if [[ -f "$target" ]] && [[ ! -L "$target" ]]; then
		echo "Backing up existing $name hook to $name.bak"
		mv "$target" "$target.bak"
	elif [[ -L "$target" ]]; then
		echo "Removing existing $name symlink"
		rm "$target"
	fi

	ln -s "$source" "$target"
	echo "Installed $name hook: $target -> $source"
}

install_hook pre-commit "../../scripts/pre-commit-dep-age.sh"
install_hook commit-msg "../../scripts/commit-msg-fix-test.sh"
echo "Done. Dependency age quarantine and the fix-needs-a-test rule are now active."
