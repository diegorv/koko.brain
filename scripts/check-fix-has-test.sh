#!/usr/bin/env bash
# Apply the commit-msg fix-needs-a-test rule (scripts/commit-msg-fix-test.sh)
# to every non-merge commit in a revision range. Used by
# .github/workflows/commit-policy.yml, and by hand to replay history.
#
# Usage: check-fix-has-test.sh <rev-range>   e.g. origin/main..HEAD, <sha>^!
# Exit:  1 when any commit breaks the rule; each one is listed by sha.
#
# bash 3.2 compatible (macOS /bin/bash).

set -euo pipefail

RANGE="${1:?usage: check-fix-has-test.sh <rev-range>}"
HOOK="$(cd "$(dirname "$0")" && pwd)/commit-msg-fix-test.sh"

msg_file="$(mktemp)"
trap 'rm -f "$msg_file"' EXIT

checked=0
violations=""
# Assigned first: set -e ignores a failure inside a for loop's word list, so
# an unresolvable range would otherwise pass as "0 commits checked".
shas="$(git rev-list --no-merges --reverse "$RANGE")"
for sha in $shas; do
	checked=$((checked + 1))
	git log -1 --format=%B "$sha" > "$msg_file"
	if ! bash "$HOOK" "$msg_file" "$sha" >/dev/null 2>&1; then
		violations="$violations$sha $(git log -1 --format=%s "$sha")"$'\n'
	fi
done

if [[ -n "$violations" ]]; then
	echo "fix: commits that change app code without a test (or a Test-Exempt: trailer):"
	printf '%s' "$violations" | sed 's/^/  /'
	if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
		printf '%s' "$violations" | while IFS= read -r line; do
			echo "::error::fix commit without a test: $line"
		done
	fi
	exit 1
fi

echo "$checked commit(s) checked, no fix: commit without a test."
