import type { ReleaseChannel } from '$lib/core/settings/settings.types';

/**
 * Read the build-time `__APP_CHANNEL__` define safely.
 *
 * Returns `'stable'` as a fallback when the constant is not defined — e.g.
 * vitest does not inject Vite's `define` block, so `__APP_CHANNEL__` is
 * absent at test time. The `typeof` guard avoids a `ReferenceError` in
 * that environment.
 *
 * Use this when settings need a sensible default for the channel the
 * current build belongs to (e.g. a fresh-install nightly DMG should
 * default the user's auto-updater channel to nightly, not stable).
 */
export function getBuildChannel(): ReleaseChannel {
	return typeof __APP_CHANNEL__ !== 'undefined' ? __APP_CHANNEL__ : 'stable';
}
