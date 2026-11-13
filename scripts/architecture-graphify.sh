#!/usr/bin/env bash
# Writes graphify's symbol-level graph of the app code to <out>/graphify/:
# graph.json, graph.html and GRAPH_REPORT.md. Code-only mode: tree-sitter
# parsing, no LLM, no network.
#
# Usage: scripts/architecture-graphify.sh <out-dir>
# Needs `graphify` on PATH, installed with Python 3.12+ from scripts/architecture-graphify.requirements.txt:
#   python3 -m venv ~/.venvs/graphify
#   ~/.venvs/graphify/bin/pip install --require-hashes --no-deps --only-binary :all: \
#     -r scripts/architecture-graphify.requirements.txt
#
# It reads the committed tree (HEAD), not uncommitted edits. tsconfig.json and
# package.json go in with the code because graphify resolves `#lib/` imports
# from them; without them every cross-module import collapses into one node.
set -euo pipefail

out="${1:?usage: $0 <out-dir>}"
root="$(git rev-parse --show-toplevel)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
corpus="$work/kokobrain"
mkdir -p "$corpus" "$out/graphify"

git -C "$root" archive HEAD src/lib src/routes src-tauri/src tsconfig.json package.json | tar -x -C "$corpus"
(cd "$corpus" && GRAPHIFY_BACKEND=none graphify update . >"$work/graphify.log" 2>&1) || {
	cat "$work/graphify.log" >&2
	exit 1
}

cp "$corpus/graphify-out/graph.json" "$corpus/graphify-out/graph.html" "$out/graphify/"
# The report title carries the run date; drop it so an unchanged tree gives an unchanged file.
sed -E '1s/ +\([0-9]{4}-[0-9]{2}-[0-9]{2}\)$//' "$corpus/graphify-out/GRAPH_REPORT.md" >"$out/graphify/GRAPH_REPORT.md"
tail -n 3 "$work/graphify.log" >&2
