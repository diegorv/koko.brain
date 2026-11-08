# Shared mod contract

The canonical contract lives in `packages/mod-core/src/contract/mod-api.v1.ts` in the private repository [diegorv/koko.brain-mods](https://github.com/diegorv/koko.brain-mods). This host installs `@kokobrain/mod-core` directly from Git, pinned to a full commit SHA and the `packages/mod-core` subdirectory in `package.json` and `pnpm-lock.yaml`.

`src/lib/plugins/mods/contract/mod-api.v1.ts` is a type-only compatibility export, not another editable definition. The host imports no runtime helpers from this dependency. Its conformance tests import the installed contract and compare it against the real context implementation. The source stays `.ts` so `skipLibCheck` does not exempt it as a declaration file.

## Local installation

Git needs read access to the private repository through an HTTPS credential helper. Developers who already use GitHub SSH can scope an HTTPS-to-SSH rewrite to this dependency for one install, without changing global configuration:

```sh
GIT_CONFIG_COUNT=1 \
GIT_CONFIG_KEY_0='url.git@github.com:diegorv/koko.brain-mods.git.insteadOf' \
GIT_CONFIG_VALUE_0='https://github.com/diegorv/koko.brain-mods.git' \
pnpm install --frozen-lockfile
```

Never put tokens in dependency URLs, committed config or lockfiles. No npm registry publication, local tarball or sibling checkout is required.

## CI credential

The default `GITHUB_TOKEN` belongs to this repository and cannot read the private mods repository. Create a fine-grained personal access token with:

- Resource owner: `diegorv`.
- Repository access: only `koko.brain-mods`.
- Repository permissions: Contents, read-only (and the required read-only metadata).
- An expiration date; rotate the secret before it expires.

Store it as an Actions repository secret named `MODS_REPO_READ_TOKEN` in `diegorv/koko.brain`. For example, `gh secret set MODS_REPO_READ_TOKEN --repo diegorv/koko.brain` prompts for the value without putting it in command history. Do not paste it into an issue, source file or chat.

Reusable workflows pass only this secret explicitly. The shared setup action supplies it only to `scripts/install-frontend-deps-ci.sh`, which uses process-local Git credential configuration scoped to the exact mods repository. It resets the checkout action's HTTP authorization header for that dependency only, leaving the host's authentication intact. The credential is not written to Git config or persisted for later release steps.

Missing credentials fail installation with a setup instruction, even if a package cache exists. Fork pull requests do not receive this secret and cannot run dependency-consuming checks. Do not switch to `pull_request_target`, expose secrets to fork code, or skip those checks to work around that restriction. The repository does not accept external contributions.

## Updating the dependency

1. Change and validate the canonical source in the mods workspace, commit it and push that commit to its private GitHub repository.
2. In an independent temporary consumer, install the Git package and run the mods workspace's `pnpm check:package <consumer>`; see that workspace's `docs/architecture.md`.
3. With Git read access configured, update the dependency using the selected full SHA:

   ```sh
   pnpm add -D '@kokobrain/mod-core@github:diegorv/koko.brain-mods#<full-sha>&path:/packages/mod-core'
   ```

4. Inspect the generated lockfile: Git repository, commit and package path must match. It must contain no credentials, workspace links or personal paths. Do not use a floating branch or rewrite the adopted commit.
5. Run `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm vitest run` and `pnpm build`.
6. Run the mods workspace's `pnpm verify` with `KOKOBRAIN_HOST_ROOT` pointing to this checkout.

The package has no dependency preparation scripts. Do not run the mods workspace's root build as an installation hook: that command installs mod bundles into a vault. Keep dependency quarantine, trust policies and allowlists unchanged.
