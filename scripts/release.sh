#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────
SUFFIX=""

# ─── Helpers ──────────────────────────────────────────────────────────
usage() {
  echo "Usage: $0 [patch|minor|major] [--pre alpha|beta|rc] [--no-push|--local]"
  echo ""
  echo "Flags:"
  echo "  --no-push, --local   Bump version, commit and create the tag locally,"
  echo "                       but do NOT push to origin (and skip remote pruning)."
  echo "  --pre <id>           Pre-release (alpha, beta ou rc). Sai como Pre-release no"
  echo "                       GitHub e o canal Stable continua no último stable."
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
  echo "Pre-releases (a partir de uma tag stable, o bump é obrigatório):"
  echo "  $0 major --pre beta   # 3.0.12 → 4.0.0-beta.1"
  echo "  $0 --pre beta         # 4.0.0-beta.1 → 4.0.0-beta.2"
  echo "  $0 --pre rc           # 4.0.0-beta.2 → 4.0.0-rc.1"
  echo "  $0                    # 4.0.0-rc.1 → 4.0.0 (finaliza)"
  echo ""
  echo "Todas as tags são annotated com changelog dos commits desde a última tag"
  echo "(um stable lista tudo desde o stable anterior)."
  echo ""
  echo "Exemplos:"
  echo "  $0              # 2.8.0 → 2.8.1"
  echo "  $0 minor        # 2.8.1 → 2.9.0"
  echo "  $0 major        # 2.9.0 → 3.0.0"
  exit 1
}

# ─── Parse args ──────────────────────────────────────────────────────
BUMP="patch"
BUMP_GIVEN=0
PRE_ID=""
NO_PUSH=0
while [ $# -gt 0 ]; do
  case "$1" in
    patch|minor|major) BUMP="$1"; BUMP_GIVEN=1 ;;
    --pre)
      PRE_ID="${2:-}"
      case "$PRE_ID" in
        alpha|beta|rc) ;;
        *) echo "Error: --pre needs alpha, beta or rc"; usage ;;
      esac
      shift
      ;;
    --no-push|--local) NO_PUSH=1 ;;
    -h|--help) usage ;;
    *) echo "Error: unknown argument '$1'"; usage ;;
  esac
  shift
done

# Tags release.yml accepts. versionsort.suffix=- ranks 4.0.0-beta.1 below 4.0.0, as semver does;
# without it git sorts every pre-release above its final release.
RELEASE_TAG_RE='^[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)\.[0-9]+)?$'
STABLE_TAG_RE='^[0-9]+\.[0-9]+\.[0-9]+$'
sorted_tags() {
  git -c versionsort.suffix=- tag --sort=-v:refname | grep -E "$1" || true
}

# alpha < beta < rc, so a pre-release can only move forward.
pre_rank() {
  case "$1" in
    alpha) echo 1 ;;
    beta) echo 2 ;;
    rc) echo 3 ;;
  esac
}

# ─── Get latest tag ──────────────────────────────────────────────────
LATEST_TAG=$(sorted_tags "$RELEASE_TAG_RE" | head -1)

if [ -z "$LATEST_TAG" ]; then
  echo "No tags found. Starting from 0.1.0${SUFFIX}"
  LATEST_TAG="0.0.0${SUFFIX}"
fi

echo "Latest tag: $LATEST_TAG"

# ─── Strip suffix and split version ──────────────────────────────────
VERSION=$(echo "$LATEST_TAG" | grep -oE '^[0-9]+\.[0-9]+\.[0-9]+')
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
LATEST_PRE=""
LATEST_PRE_NUM=0
if [[ "$LATEST_TAG" == *-* ]]; then
  LATEST_PRE_SUFFIX="${LATEST_TAG#*-}"
  LATEST_PRE="${LATEST_PRE_SUFFIX%%.*}"
  LATEST_PRE_NUM="${LATEST_PRE_SUFFIX#*.}"
fi

# ─── Bump version ────────────────────────────────────────────────────
bump_base() {
  case "$BUMP" in
    patch) PATCH=$((PATCH + 1)) ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  esac
}

if [ -n "$LATEST_PRE" ] && [ "$BUMP_GIVEN" = "1" ]; then
  # Bumping the base of a pre-release would skip its final release (4.0.0-beta.2 → 5.0.0).
  echo "Error: latest tag $LATEST_TAG is a pre-release. Run without patch|minor|major:"
  echo "  $0 --pre <id>   next pre-release of ${VERSION}"
  echo "  $0              final release ${VERSION}"
  exit 1
fi

if [ -n "$PRE_ID" ]; then
  if [ -z "$LATEST_PRE" ] && [ "$BUMP_GIVEN" = "0" ]; then
    # Once a series starts its base cannot be bumped, so the base must be chosen here.
    echo "Error: starting a pre-release from $LATEST_TAG needs patch|minor|major, e.g.:"
    echo "  $0 major --pre $PRE_ID"
    exit 1
  fi
  if [ -z "$LATEST_PRE" ]; then
    bump_base
    PRE_NUM=1
  elif [ "$(pre_rank "$PRE_ID")" -lt "$(pre_rank "$LATEST_PRE")" ]; then
    echo "Error: $PRE_ID would sort below the latest tag $LATEST_TAG."
    exit 1
  elif [ "$PRE_ID" = "$LATEST_PRE" ]; then
    PRE_NUM=$((LATEST_PRE_NUM + 1))
  else
    PRE_NUM=1
  fi
  NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}-${PRE_ID}.${PRE_NUM}"
  BUMP_LABEL="$PRE_ID"
  [ -z "$LATEST_PRE" ] && BUMP_LABEL="$BUMP $PRE_ID"
elif [ -n "$LATEST_PRE" ]; then
  # Finalize the pre-release series.
  NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
  BUMP_LABEL="final"
else
  bump_base
  NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}${SUFFIX}"
  BUMP_LABEL="$BUMP"
fi

# A stable release lists everything since the previous stable, its pre-releases included.
CHANGELOG_BASE="$LATEST_TAG"
if [ -z "$PRE_ID" ] && [ -n "$LATEST_PRE" ]; then
  CHANGELOG_BASE=$(sorted_tags "$STABLE_TAG_RE" | head -1)
  CHANGELOG_BASE="${CHANGELOG_BASE:-0.0.0${SUFFIX}}"
fi

# ─── Build changelog from commits since last tag ─────────────────────
echo ""
echo "──────────────────────────────────────"
echo "  $LATEST_TAG → $NEW_VERSION ($BUMP_LABEL)"
echo "──────────────────────────────────────"
echo ""

if [ "$CHANGELOG_BASE" = "0.0.0${SUFFIX}" ]; then
  COMMITS=$(git log --oneline --no-decorate)
else
  COMMITS=$(git log "${CHANGELOG_BASE}..HEAD" --oneline --no-decorate)
fi
# The code map workflow's regeneration commits are not release notes.
COMMITS=$(printf '%s\n' "$COMMITS" | grep -v -E '^[0-9a-f]+ chore\(codemap\)' || true)

if [ -z "$COMMITS" ]; then
  echo "No new commits since $CHANGELOG_BASE. Aborting."
  exit 1
fi

# ─── Format changelog ────────────────────────────────────────────────
CHANGELOG=$(echo "$COMMITS" | while IFS= read -r line; do
  # Strip the short hash, keep only the message
  MSG="${line#* }"
  echo "- $MSG"
done)

TAG_BODY="Release ${NEW_VERSION}

Changes since ${CHANGELOG_BASE}:

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

if [ "$NO_PUSH" = "1" ]; then
  echo ""
  echo "Tag $NEW_VERSION created locally. Skipping push (--no-push)."
  echo "Push later with:"
  echo "  git push origin main && git push origin $NEW_VERSION"
  exit 0
fi

echo ""
echo "Tag $NEW_VERSION created. Pushing to origin..."
echo ""

git push origin main
git push origin "$NEW_VERSION"

echo ""
echo "Tag $NEW_VERSION pushed to GitHub."

# ─── Prune old tags (keep last 4 of each kind, never touch 'nightly') ─
# Stable and pre-release tags are counted apart, so a run of betas never
# deletes the last stable release the Stable updater channel points at.
KEEP_COUNT=4
echo ""
echo "Pruning old tags (keeping last ${KEEP_COUNT} stable and last ${KEEP_COUNT} pre-release)..."

git fetch --tags --prune --prune-tags origin >/dev/null 2>&1 || true

OLD_TAGS=$(
  sorted_tags "$STABLE_TAG_RE" | tail -n +$((KEEP_COUNT + 1))
  sorted_tags '^[0-9]+\.[0-9]+\.[0-9]+-' | tail -n +$((KEEP_COUNT + 1))
)

if [ -z "$OLD_TAGS" ]; then
  echo "Nothing to prune."
else
  HAVE_GH=0
  command -v gh >/dev/null 2>&1 && HAVE_GH=1
  echo "$OLD_TAGS" | while IFS= read -r tag; do
    [ -z "$tag" ] && continue
    echo "  deleting $tag"
    if [ "$HAVE_GH" = "1" ]; then
      gh release delete "$tag" --cleanup-tag -y >/dev/null 2>&1 || true
    fi
    git push origin --delete "$tag" >/dev/null 2>&1 || true
    git tag -d "$tag" >/dev/null 2>&1 || true
  done
  echo "Pruned."
fi
