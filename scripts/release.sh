#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────
SUFFIX="-alpha"

# ─── Helpers ──────────────────────────────────────────────────────────
usage() {
  echo "Usage: $0 [patch|minor|major]"
  echo ""
  echo "Bump types:"
  echo "  patch  (default)  Correções e ajustes pequenos"
  echo "                    0.3.0 → 0.3.1 → 0.3.2 → 0.3.3 ..."
  echo ""
  echo "  minor             Features novas (reseta patch pra 0)"
  echo "                    0.3.2 → 0.4.0 → 0.5.0 → 0.6.0 ..."
  echo ""
  echo "  major             Breaking changes (reseta minor e patch pra 0)"
  echo "                    0.6.0 → 1.0.0 → 2.0.0 → 3.0.0 ..."
  echo ""
  echo "O sufixo '${SUFFIX}' é adicionado automaticamente."
  echo "Todas as tags são annotated com changelog dos commits desde a última tag."
  echo ""
  echo "Exemplos:"
  echo "  $0              # 0.3.0-alpha → 0.3.1-alpha"
  echo "  $0 minor        # 0.3.1-alpha → 0.4.0-alpha"
  echo "  $0 major        # 0.4.0-alpha → 1.0.0-alpha"
  exit 1
}

# ─── Parse bump type ─────────────────────────────────────────────────
BUMP="${1:-patch}"
case "$BUMP" in
  patch|minor|major) ;;
  -h|--help) usage ;;
  *) echo "Error: unknown bump type '$BUMP'"; usage ;;
esac

# ─── Get latest tag ──────────────────────────────────────────────────
LATEST_TAG=$(git tag --sort=-v:refname | head -1)

if [ -z "$LATEST_TAG" ]; then
  echo "No tags found. Starting from 0.1.0${SUFFIX}"
  LATEST_TAG="0.0.0${SUFFIX}"
fi

echo "Latest tag: $LATEST_TAG"

# ─── Strip suffix and split version ──────────────────────────────────
VERSION=$(echo "$LATEST_TAG" | grep -oE '^[0-9]+\.[0-9]+\.[0-9]+')
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

# ─── Bump version ────────────────────────────────────────────────────
case "$BUMP" in
  patch) PATCH=$((PATCH + 1)) ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}${SUFFIX}"

# ─── Build changelog from commits since last tag ─────────────────────
echo ""
echo "──────────────────────────────────────"
echo "  $LATEST_TAG → $NEW_VERSION ($BUMP)"
echo "──────────────────────────────────────"
echo ""

if [ "$LATEST_TAG" = "0.0.0${SUFFIX}" ]; then
  COMMITS=$(git log --oneline --no-decorate)
else
  COMMITS=$(git log "${LATEST_TAG}..HEAD" --oneline --no-decorate)
fi

if [ -z "$COMMITS" ]; then
  echo "No new commits since $LATEST_TAG. Aborting."
  exit 1
fi

# ─── Format changelog ────────────────────────────────────────────────
CHANGELOG=$(echo "$COMMITS" | while IFS= read -r line; do
  # Strip the short hash, keep only the message
  MSG="${line#* }"
  echo "- $MSG"
done)

TAG_BODY="Release ${NEW_VERSION}

Changes since ${LATEST_TAG}:

${CHANGELOG}
"

echo "$TAG_BODY"
echo "──────────────────────────────────────"
echo ""

# ─── Confirm ─────────────────────────────────────────────────────────
read -rp "Create tag $NEW_VERSION? [y/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# ─── Bump version in project files ───────────────────────────────────
echo "Updating version in project files..."

sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" package.json
sed -i '' "s/^version = \"[^\"]*\"/version = \"${NEW_VERSION}\"/" src-tauri/Cargo.toml
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" src-tauri/tauri.conf.json

sed -i '' '/^name = "kokobrain"$/{n; s/^version = "[^"]*"/version = "'"${NEW_VERSION}"'"/;}' src-tauri/Cargo.lock

git add package.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json
git commit -m "chore: bump version to ${NEW_VERSION}"

echo "Version bumped and committed."
echo ""

# ─── Create annotated tag ────────────────────────────────────────────
git tag -a "$NEW_VERSION" -m "$TAG_BODY"

echo ""
echo "Tag $NEW_VERSION created. Pushing to origin..."
echo ""

git push origin main
git push origin "$NEW_VERSION"

echo ""
echo "Tag $NEW_VERSION pushed to GitHub."
