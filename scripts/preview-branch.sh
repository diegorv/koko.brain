#!/usr/bin/env bash
# Git steps of .github/workflows/preview.yml, run in a checkout of `preview`
# with full history and fresh origin/* refs.
#
#   sync    merge origin/main into preview and push it (never force, rebase or reset:
#           preview only grows, so its commit count keeps preview versions in order)
#   merged  subjects of the merges that brought into preview a branch not in main
set -euo pipefail

BOT_NAME='github-actions[bot]'
BOT_EMAIL='41898282+github-actions[bot]@users.noreply.github.com'

usage() {
	echo "Usage: $0 sync|merged" >&2
	exit 2
}

# Hands the preview head to the build job.
write_sha_output() {
	if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
		echo "sha=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"
	fi
}

sync() {
	local main_sha short conflicts
	main_sha=$(git rev-parse origin/main)
	short=${main_sha:0:7}

	if git merge-base --is-ancestor origin/main HEAD; then
		echo "main ($short) is already in preview; nothing to merge or push."
		write_sha_output
		return 0
	fi

	if ! git -c user.name="$BOT_NAME" -c user.email="$BOT_EMAIL" \
		merge --no-ff --no-edit -m "Merge main $short into preview" origin/main; then
		conflicts=$(git diff --name-only --diff-filter=U | paste -sd ' ' -)
		git merge --abort || true
		# The `preview` tag shares the branch's name: a bare `git checkout preview` in a clone
		# without the local branch detaches at the tag (the last built head), and a bare push
		# is ambiguous. Hence -B from origin/preview and the explicit refspec.
		echo "::error::Merging main ($short) into preview conflicts in: ${conflicts:-unknown files}. Resolve it by hand: git fetch origin && git checkout -B preview origin/preview && git merge origin/main, fix the files, commit, then git push origin HEAD:refs/heads/preview (never force-push)."
		exit 1
	fi

	git push origin HEAD:refs/heads/preview
	write_sha_output
}

# A merge whose second parent is already in main brought main in, not a feature.
merged() {
	local parents subject second
	git log --merges --first-parent --format='%P%x09%s' origin/main..HEAD |
		while IFS=$'\t' read -r parents subject; do
			read -r _ second _ <<< "$parents"
			if ! git merge-base --is-ancestor "$second" origin/main; then
				printf '%s\n' "$subject"
			fi
		done
}

case "${1:-}" in
	sync) sync ;;
	merged) merged ;;
	*) usage ;;
esac
