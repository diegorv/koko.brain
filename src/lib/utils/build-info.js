// Pure build-info helpers shared by Vite's build-time config and runtime tests.
// Kept in plain JS (with JSDoc types) so vite.config.js can import it directly
// at config-load time without needing a TS transpile step. checkJs + allowJs
// in tsconfig.json type-check this file alongside the rest of the codebase.

/** @typedef {'stable' | 'nightly'} ReleaseChannel */

/**
 * @typedef {Object} VersionInputs
 * @property {string} pkgVersion - Version field from package.json (e.g. "2.0.19-alpha").
 * @property {string} gitHash - Short git sha for the build (e.g. "34158e03").
 * @property {string} commitCount - Output of `git rev-list --count HEAD`. Only used for nightly builds.
 * @property {ReleaseChannel} channel - Active release channel.
 */

/**
 * Resolve the package version string for a given release channel.
 *
 * Stable: returns the pkg.json version as-is (e.g. "2.0.19-alpha").
 * Nightly: appends "-nightly.<count>.<sha>".
 *   Result: "2.0.19-alpha-nightly.1234.34158e03".
 *
 * The commit count is included so consecutive nightlies sort monotonically
 * under semver: numeric prerelease identifiers compare numerically, while
 * raw shas would compare lexically (so an older sha could sort "greater"
 * than a newer one and the auto-updater would never offer the upgrade).
 *
 * A nightly version is intentionally semver-greater than the same-base
 * stable counterpart because the prerelease identifier "alpha-nightly"
 * sorts after "alpha". The Tauri auto-updater therefore never "downgrades"
 * a nightly user to a same-base stable release. Switching nightly → stable
 * requires a manual reinstall.
 *
 * @param {VersionInputs} inputs
 * @returns {string}
 */
export function resolveVersion(inputs) {
	const { pkgVersion, gitHash, commitCount, channel } = inputs;
	if (channel === 'nightly') {
		return `${pkgVersion}-nightly.${commitCount}.${gitHash}`;
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
 *   "2.0.19-alpha-nightly.545.fc788c2d (fc788c2d) (...)" with a
 *   duplicate hash.
 *
 * @param {VersionInputs & { buildTime: string }} inputs
 * @returns {string}
 */
export function formatBuildInfo(inputs) {
	const version = resolveVersion(inputs);
	const shaSegment = inputs.channel === 'nightly' ? '' : `(${inputs.gitHash}) `;
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
