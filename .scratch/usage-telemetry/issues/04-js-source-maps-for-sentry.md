# 04: Release builds upload JS source maps so Sentry stack traces are readable

**What to build:** Today no source maps are produced: `vite.config.js` has no `build.sourcemap`, and `build/` has no `.map` files. Nothing uploads them either, so every frontend Sentry event shows minified `tauri://localhost/_app/immutable/...` frames.

1. **Hidden source maps, only when uploading.** Set `build.sourcemap: 'hidden'` in `vite.config.js` only when `SENTRY_AUTH_TOKEN` is set. Builds without the token (local `pnpm build`, `pnpm tauri build`, and CI before the owner adds secrets) must produce no maps at all. Otherwise `.map` files would ship inside the app.
2. **The upload plugin.** Add `@sentry/vite-plugin` as a new devDependency, subject to the pnpm quarantine.
   - Pin it to the same version as `@sentry/browser`. The plugin line tracks the SDK, and `@sentry/bundler-plugins` pins `@sentry/core` exactly.
   - Enable it only when `SENTRY_AUTH_TOKEN` is set. Read `SENTRY_ORG` and `SENTRY_PROJECT` from the environment.
   - Set `telemetry: false`. It defaults to true and would report to Sentry about the build itself.
   - Use debug IDs, so maps match events regardless of the release name.
   - Delete `.map` files after the upload (`sourcemaps.filesToDeleteAfterUpload`). SvelteKit writes maps to `.svelte-kit/output/client`, and adapter-static copies them to `build/`. Check `build/` after the adapter runs, not only the Vite output.
   - Verify the current option names against the README for the installed version.
3. **Workflows.** In `.github/workflows/release.yml`, and in `nightly.yml` if it builds the app, pass the three values from repo secrets and vars to the frontend build. When the secret is absent, the build must still succeed and simply skip maps and the upload.
4. **Local builds.** `pnpm build` and `pnpm tauri dev` must not need any Sentry credentials.

**Owner action (not a blocker for the code):** create a Sentry auth token with `project:releases` scope. Add `SENTRY_AUTH_TOKEN` as a repo secret, and `SENTRY_ORG` and `SENTRY_PROJECT` as repo vars. Until then the upload step is skipped.

**Blocked by:** 01 (both edit `PRIVACY.md`), 03 (both change `package.json` and the lockfile; the plugin must match the bumped SDK version)

**Status:** ready-for-agent

**Gate:** Frontend plus a `package.json` change: `pnpm check` + `pnpm vitest run` + `pnpm build`.

**Without a token**
- [ ] `pnpm build` succeeds, the plugin is inactive, and `build/` contains no `.map` files and no `sourceMappingURL` comments.

**With a token** (use `sourcemaps: { disable: 'disable-upload' }`, which injects debug IDs without uploading, or the equivalent option in the installed version)
- [ ] Debug IDs are injected.
- [ ] After the adapter runs, no `.map` file remains in `build/`.

**Plugin config**
- [ ] `telemetry: false` is set.
- [ ] `@sentry/vite-plugin` is pinned to the same version as `@sentry/browser`.

**Workflow and docs**
- [ ] The release workflow passes the secret and vars, and a run without them is green.
- [ ] `PRIVACY.md` says source maps go to Sentry only from CI, never from the app.

## Notes

- Source: `raw/j01.md` (s6), `raw/j21.md` (s1-F1), `raw/j23.md` (s6-F1, F3), review 2026-11-06 (maps shipped without a token, plugin telemetry, Blocked by).
- Size: M.

## Comments
