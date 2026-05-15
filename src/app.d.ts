/** Full build info string injected by Vite at build time: "version+hash · date". */
declare const __BUILD_INFO__: string;

/**
 * Active release channel for this build, injected by Vite at build time.
 *
 * - `'stable'` — produced by tag-driven builds in `.github/workflows/release.yml`.
 * - `'nightly'` — produced by push-to-main builds in `.github/workflows/nightly.yml`.
 *
 * Defaults to `'stable'` when `KOKO_RELEASE_CHANNEL` is unset (local dev builds).
 */
declare const __APP_CHANNEL__: 'stable' | 'nightly';

/**
 * Build-time flag set by `vite.config.js` when `PLAYWRIGHT=true` is in
 * the environment. Consumed by `src/lib/api.ts` to keep the Tauri
 * import path under e2e (where vite aliases route to `e2e/mocks/`)
 * instead of falling through to the HTTP transport.
 */
declare const __PLAYWRIGHT__: boolean;
