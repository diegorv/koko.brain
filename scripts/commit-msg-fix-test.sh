#!/usr/bin/env bash
# commit-msg hook: a `fix:` commit that changes app code must carry a test
# (CLAUDE.md rule 11), or say why it cannot with a `Test-Exempt: <reason>`
# trailer.
#
# Usage:   commit-msg-fix-test.sh <msg-file> [<sha>]
#          Without <sha> it checks the staged diff (the hook case). With
#          <sha> it checks that commit's diff instead, which is how
#          scripts/check-fix-has-test.sh replays history with the same rule.
# Install: bash scripts/setup-hooks.sh
# Bypass:  git commit --no-verify
#
# bash 3.2 compatible (macOS /bin/bash).

set -euo pipefail

MSG_FILE="${1:?usage: commit-msg-fix-test.sh <msg-file> [<sha>]}"
SHA="${2:-}"

CODE_RE='^(src/(lib|routes)/.*\.(ts|js|svelte)|src-tauri/src/.*\.rs|src-tauri/build\.rs)$'
TEST_PATH_RE='^(src/tests|src-tauri/tests|e2e/specs)/'
TEST_ATTR_RE='^\+[[:space:]]*#\[(test\]|tokio::test|cfg\(test\)\])'

# Subject: first line that is neither a git comment nor blank.
subject="$(grep -v -e '^#' -e '^[[:space:]]*$' "$MSG_FILE" | head -n 1 || true)"
if ! grep -Eq '^fix(\(.+\))?!?:' <<< "$subject"; then
	exit 0
fi

if [[ -n "$SHA" ]]; then
	changed="$(git -c core.quotePath=false show --format= --name-only "$SHA")"
else
	changed="$(git -c core.quotePath=false diff --cached --name-only)"
fi
[[ -z "$changed" ]] && exit 0

code_files="$(grep -E "$CODE_RE" <<< "$changed" || true)"
[[ -z "$code_files" ]] && exit 0

if grep -Eq "$TEST_PATH_RE" <<< "$changed"; then
	exit 0
fi

if [[ -n "$SHA" ]]; then
	rs_diff="$(git show --format= -U0 "$SHA" -- '*.rs')"
else
	rs_diff="$(git diff --cached -U0 -- '*.rs')"
fi
if grep -Eq "$TEST_ATTR_RE" <<< "$rs_diff"; then
	exit 0
fi

trailers="$(git interpret-trailers --parse "$MSG_FILE")"
if grep -iEq '^Test-Exempt:[[:space:]]*[^[:space:]]' <<< "$trailers"; then
	exit 0
fi

{
	echo "BLOCKED: a fix: commit that changes app code needs a test."
	echo "  subject: $subject"
	echo "  app code changed:"
	sed 's/^/    /' <<< "$code_files"
	echo "Add one of:"
	echo "  - a staged file under src/tests/, src-tauri/tests/ or e2e/specs/"
	echo "  - an added #[test], #[tokio::test] or #[cfg(test)] line in a .rs file"
	echo "  - a 'Test-Exempt: <reason>' trailer when no test can cover it (CSS only, for example)"
} >&2
exit 1
