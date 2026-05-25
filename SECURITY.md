# Supply Chain Security

After the [axios npm supply chain attack (March 2026)](https://en.wikipedia.org/wiki/Npm#Security), where compromised maintainer tokens were used to publish malicious package versions that existed for only hours before removal, we added a multi-layered defense to prevent this class of attack.

## 1. pnpm Quarantine (primary defense)

`pnpm-workspace.yaml` sets `minimumReleaseAge: 10080` (7 days in minutes). pnpm will refuse to resolve any npm package version published less than 7 days ago during `pnpm install` or `pnpm update`. Already-locked versions are not affected.

## 2. Pre-commit hook (second layer)

A git pre-commit hook (`scripts/pre-commit-dep-age.sh`) catches changes that bypass pnpm config - e.g., manual lockfile edits. When `pnpm-lock.yaml` is staged, the hook queries the npm registry for each new/changed package version and blocks the commit if any version is younger than 7 days.

```bash
# Install the hook
bash scripts/setup-hooks.sh

# Emergency bypass
git commit --no-verify

# Allow a specific version (with justification)
echo "lodash@4.17.22  # Emergency security patch" >> .dep-age-allowlist
```

## 3. CI guardrail (tamper detection)

The [Security workflow](.github/workflows/security.yml) includes a `supply-chain-quarantine` job that verifies on every push, PR, and weekly schedule that:
- `pnpm-workspace.yaml` exists
- `minimumReleaseAge` is set to at least 10080 minutes (7 days)

If someone accidentally deletes the config or lowers the threshold, CI fails with a clear error.
