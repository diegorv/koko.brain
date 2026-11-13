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
 * App-relevant commits in this build since the previous release tag, newest
 * first, injected by Vite at build time (filter: `parseChangelog` in
 * `utils/build-info.js`). `null` when git or the tags were unavailable.
 */
declare const __CHANGELOG__: {
	since: string;
	commits: { sha: string; subject: string }[];
} | null;
