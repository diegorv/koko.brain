#!/usr/bin/env bash
# pre-commit hook: block commits that introduce npm package versions
# published less than 7 days ago (supply chain quarantine).
#
# Install: bash scripts/setup-hooks.sh
# Bypass:  git commit --no-verify
# Exceptions: add "package@version" lines to .dep-age-allowlist

set -euo pipefail

QUARANTINE_DAYS=7
QUARANTINE_SECONDS=$((QUARANTINE_DAYS * 86400))
REPO_ROOT="$(git rev-parse --show-toplevel)"
ALLOWLIST_FILE="$REPO_ROOT/.dep-age-allowlist"

# --- Fast path: skip if pnpm-lock.yaml is not staged ---
if ! git diff --cached --name-only | grep -q '^pnpm-lock.yaml$'; then
	exit 0
fi

# --- Date parsing (macOS BSD vs Linux GNU) ---
if date -j -f "%Y-%m-%dT%H:%M:%S" "2024-01-01T00:00:00" +%s >/dev/null 2>&1; then
	parse_date() { date -j -f "%Y-%m-%dT%H:%M:%S" "${1%%.*}" +%s 2>/dev/null; }
else
	parse_date() { date -d "$1" +%s 2>/dev/null; }
fi

# --- Load allowlist (bash 3.2 compatible — no associative arrays) ---
allowlist_entries=""
if [[ -f "$ALLOWLIST_FILE" ]]; then
	while IFS= read -r line; do
		# Strip comments and whitespace
		line="${line%%#*}"
		line="$(echo "$line" | xargs)"
		[[ -n "$line" ]] && allowlist_entries="$allowlist_entries|$line"
	done < "$ALLOWLIST_FILE"
fi

is_allowlisted() {
	echo "$allowlist_entries" | grep -qF "|$1"
}

# --- Extract new/changed packages from lockfile diff ---
# Lines in the packages: section look like:
#   +  '@codemirror/language@6.12.3':
#   +  'dayjs@1.11.20':
new_packages=()
while IFS= read -r entry; do
	[[ -n "$entry" ]] && new_packages+=("$entry")
done < <(
	git diff --cached -- pnpm-lock.yaml \
		| grep "^+  '" \
		| sed "s/^+  '//;s/':$//" \
		| sort -u
)

if [[ ${#new_packages[@]} -eq 0 ]]; then
	exit 0
fi

# --- Split "name@version" on the last @ ---
split_pkg_version() {
	local full="$1"
	# Handle scoped packages: @scope/name@version
	if [[ "$full" == @* ]]; then
		# Remove leading @, split on last @, reconstruct
		local rest="${full:1}"
		pkg_name="@${rest%@*}"
		pkg_version="${rest##*@}"
	else
		pkg_name="${full%@*}"
		pkg_version="${full##*@}"
	fi
}

# --- Check each package version age ---
now=$(date +%s)
violations=()
checked=0
skipped=0

echo "🔍 Checking age of ${#new_packages[@]} new/updated package version(s)..."

for entry in "${new_packages[@]}"; do
	split_pkg_version "$entry"

	# Skip if allowlisted
	if is_allowlisted "$entry"; then
		skipped=$((skipped + 1))
		continue
	fi

	# Query npm registry for publish time
	time_json=$(npm view "$pkg_name" time --json 2>/dev/null || true)
	if [[ -z "$time_json" ]] || echo "$time_json" | grep -q '"error"'; then
		echo "  ⚠ Could not query registry for $pkg_name (private package?), skipping"
		continue
	fi

	# Extract the timestamp for this specific version
	# Format: "1.2.3": "2024-01-15T10:30:00.000Z"
	publish_time=$(echo "$time_json" | grep "\"$pkg_version\"" | head -1 | sed 's/.*: "//;s/".*//' || true)
	if [[ -z "$publish_time" ]]; then
		echo "  ⚠ Version $pkg_version not found in registry for $pkg_name, skipping"
		continue
	fi

	publish_epoch=$(parse_date "$publish_time")
	if [[ -z "$publish_epoch" ]]; then
		echo "  ⚠ Could not parse date for $entry ($publish_time), skipping"
		continue
	fi

	age_seconds=$((now - publish_epoch))
	age_days=$((age_seconds / 86400))
	checked=$((checked + 1))

	if [[ $age_seconds -lt $QUARANTINE_SECONDS ]]; then
		violations+=("$entry (published $age_days day(s) ago, on ${publish_time%%T*})")
	fi
done

# --- Report results ---
if [[ ${#violations[@]} -gt 0 ]]; then
	echo ""
	echo "❌ BLOCKED: ${#violations[@]} package version(s) fail the ${QUARANTINE_DAYS}-day quarantine:"
	echo ""
	for v in "${violations[@]}"; do
		echo "  • $v"
	done
	echo ""
	echo "These versions were published too recently and may pose a supply chain risk."
	echo ""
	echo "Options:"
	echo "  1. Wait until the version is at least ${QUARANTINE_DAYS} days old"
	echo "  2. Add to $ALLOWLIST_FILE (with justification)"
	echo "  3. git commit --no-verify (emergency bypass)"
	echo ""
	exit 1
fi

if [[ $checked -gt 0 ]]; then
	echo "  ✅ $checked package(s) checked, all passed ${QUARANTINE_DAYS}-day quarantine"
fi
if [[ $skipped -gt 0 ]]; then
	echo "  ⏭ $skipped package(s) skipped (allowlisted)"
fi

exit 0
