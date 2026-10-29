// Pure build-info helpers shared by Vite's build-time config and runtime tests.
// Kept in plain JS (with JSDoc types) so vite.config.js can import it directly
// at config-load time without needing a TS transpile step. checkJs + allowJs
// in tsconfig.json type-check this file alongside the rest of the codebase.

/** @typedef {'stable' | 'nightly'} ReleaseChannel */

/**
 * @typedef {Object} VersionInputs
 * @property {string} pkgVersion - Version field from package.json (e.g. "2.8.0").
 * @property {string} gitHash - Short git sha for the build (e.g. "34158e03").
 * @property {string} commitCount - Commits since the stable tag `pkgVersion`. Only used for nightly builds.
 * @property {ReleaseChannel} channel - Active release channel.
 * @property {string} [versionOverride] - Full version computed by CI (e.g. the
 *   Tauri 3 alpha workflow's `X.Y.Z-tauri3-alpha.<count>.<sha>`). Wins over the
 *   channel rule when non-empty, so the UI shows the same version as the bundle.
 */

/**
 * Resolve the package version string for a given release channel.
 *
 * Stable: returns the pkg.json version as-is (e.g. "2.8.0").
 * Nightly: bumps patch+1 and appends "-nightly.<count>.<sha>".
 *   Result: "2.8.1-nightly.12.34158e03" (12 commits after stable "2.8.0").
 *
 * The patch bump puts the nightly between the stable it builds on and the
 * next stable: semver ranks X.Y.Z-pre below X.Y.Z, so without it the
 * updater would offer the current stable as an upgrade, and with a larger
 * bump nightly users would never be offered the next stable.
 *
 * The commit count makes consecutive nightlies sort monotonically under
 * semver: numeric prerelease identifiers compare numerically, while raw
 * shas would compare lexically.
 *
 * @param {VersionInputs} inputs
 * @returns {string}
 */
export function resolveVersion(inputs) {
	const { pkgVersion, gitHash, commitCount, channel, versionOverride } = inputs;
	if (versionOverride) {
		return versionOverride;
	}
	if (channel === 'nightly') {
		const match = pkgVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
		const [, major, minor, patch] = match || ['', '0', '0', '0'];
		const nightlyBase = `${major}.${minor}.${Number(patch) + 1}`;
		return `${nightlyBase}-nightly.${commitCount}.${gitHash}`;
	}
	return pkgVersion;
}

/**
 * Build the display string injected as `__BUILD_INFO__` and shown in the UI.
 *
 * Stable pattern: `<version> (<sha>) (<buildTime>)`
 * Nightly pattern: `<version> (<buildTime>)` — the `<sha>` parens is
 *   dropped because the nightly version string already ends with the
 *   git hash as its semver tiebreaker, and repeating it would render
 *   "2.8.1-nightly.12.fc788c2d (fc788c2d) (...)" with a
 *   duplicate hash.
 *
 * @param {VersionInputs & { buildTime: string }} inputs
 * @returns {string}
 */
export function formatBuildInfo(inputs) {
	const version = resolveVersion(inputs);
	const hashInVersion = inputs.channel === 'nightly' || !!inputs.versionOverride;
	const shaSegment = hashInVersion ? '' : `(${inputs.gitHash}) `;
	return `${version} ${shaSegment}(${inputs.buildTime})`;
}

/**
 * Normalise the release channel from an env-var string.
 *
 * Unknown / missing values default to "stable". Treats the env var as
 * case-insensitive so `KOKO_RELEASE_CHANNEL=Nightly` works the same as
 * `nightly`.
 *
 * @param {string | undefined} value
 * @returns {ReleaseChannel}
 */
export function parseReleaseChannel(value) {
	if (value && value.toLowerCase() === 'nightly') {
		return 'nightly';
	}
	return 'stable';
}

/**
 * Display label for the release channel badge shown in build-info widgets.
 *
 * Uppercased so it reads as a tag/pill rather than prose, matching the
 * convention used in GitHub release titles (e.g. "Latest", "Pre-release").
 *
 * @param {ReleaseChannel} channel
 * @returns {string}
 */
export function channelLabel(channel) {
	return channel === 'nightly' ? 'NIGHTLY' : 'STABLE';
}

/**
 * Badge label for a build: `ALPHA` when the version is an alpha prerelease
 * (the Tauri 3 alpha builds run on the stable updater channel, so the channel
 * alone would label them STABLE), otherwise the channel label.
 *
 * @param {ReleaseChannel} channel
 * @param {string} version - Resolved version string (see `resolveVersion`).
 * @returns {string}
 */
export function buildLabel(channel, version) {
	return /-(.*[.-])?alpha([.-]|$)/.test(version) ? 'ALPHA' : channelLabel(channel);
}
