# 04: Release builds upload JS source maps so Sentry stack traces are readable

**What to build:** Today no source maps are produced (`vite.config.js` has no `build.sourcemap`, `build/` has no `.map` files) and nothing uploads them, so every frontend Sentry event shows minified `tauri://localhost/_app/immutable/...` frames.

1. Produce hidden source maps in production builds (`build.sourcemap: 'hidden'` in `vite.config.js`, so bundles carry no `sourceMappingURL` comment).
2. Add `@sentry/vite-plugin` (new devDependency, subject to the pnpm quarantine) with debug IDs, so maps match events regardless of the release name. Enable it only when `SENTRY_AUTH_TOKEN` is set; read `SENTRY_ORG` and `SENTRY_PROJECT` from the environment. Delete `.map` files from the output after upload (`sourcemaps.filesToDeleteAfterUpload`) so the shipped app does not carry them.
3. In `.github/workflows/release.yml` (and `nightly.yml` if it builds the app), pass the three values from repo secrets/vars to the frontend build. When the secret is absent the build must still succeed and simply skip the upload.
4. Local `pnpm build` and `pnpm tauri dev` must not need any Sentry credentials.

**Owner action (not a blocker for the code):** create a Sentry auth token with `project:releases` scope and add `SENTRY_AUTH_TOKEN` (secret), `SENTRY_ORG` and `SENTRY_PROJECT` (vars) to the GitHub repo. Until then the upload step is skipped.

**Blocked by:** 01 (the fixed privacy gate must know about the plugin's upload host, `sentry.io`, used only at build time in CI)

**Status:** ready-for-agent

**Gate:** Frontend + `package.json` change: `pnpm check` + `pnpm vitest run` + `pnpm build`. Show in the commit message that `pnpm build` without `SENTRY_AUTH_TOKEN` succeeds and leaves no `.map` file referenced from a bundle, and that the plugin is inactive.

- [ ] `pnpm build` without credentials succeeds, no `sourceMappingURL` comments in `build/`
- [ ] With `SENTRY_AUTH_TOKEN` set (dry run or `--dry-run`-like plugin option if available), the plugin injects debug IDs and would upload
- [ ] Release workflow passes the secret and vars; a run without them is green
- [ ] `.map` files are not shipped in the app bundle
- [ ] `PRIVACY.md` notes that source maps go to Sentry only from CI, never from the app

## Notes

- Source: `raw/j01.md` (s6), `raw/j21.md` (s1-F1), `raw/j23.md` (s6-F1, F3).
- Verify the plugin's current option names against its README for the version installed; do not rely on memory.
- Size: M.

## Comments
