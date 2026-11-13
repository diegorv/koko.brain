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
 * Prerelease base (e.g. "4.0.0-beta.1"): appends ".nightly.<count>.<sha>"
 * with no patch bump, giving "4.0.0-beta.1.nightly.12.34158e03". The count
 * restarts at every tag, so the base has to stay in the version: a later
 * prerelease (beta.2, rc.1) and the final 4.0.0 then outrank every nightly
 * built on an earlier one. A patch bump here would put every nightly above
 * 4.0.0 and order them by the restarting count alone.
 *
 * @param {VersionInputs} inputs
 * @returns {string}
 */
export function resolveVersion(inputs) {
	const { pkgVersion, gitHash, commitCount, channel } = inputs;
	if (channel === 'nightly') {
		if (pkgVersion.includes('-')) {
			return `${pkgVersion}.nightly.${commitCount}.${gitHash}`;
		}
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
 * `dev` is not a release channel: it marks a run from the Vite dev server, which
 * the updater never targets, so it stays out of `ReleaseChannel`.
 *
 * @param {ReleaseChannel | 'dev'} channel
 * @returns {string}
 */
export function channelLabel(channel) {
	if (channel === 'dev') return 'DEV';
	return channel === 'nightly' ? 'NIGHTLY' : 'STABLE';
}

/**
 * @typedef {Object} ChangelogEntry
 * @property {string} sha - Short commit sha.
 * @property {string} subject - First line of the commit message.
 */

/** Conventional Commit types that never change the shipped app. */
const HIDDEN_CHANGELOG_TYPES = new Set(['docs', 'test', 'ci', 'style', 'build']);

/**
 * Parse `git log --format=%h%x09%s` output into the commits worth showing
 * in Settings > Update. Drops `docs`, `test`, `ci`, `style`, `build` and
 * every `chore` except `chore(deps)`, since a runtime dependency bump can
 * change behaviour and `chore(deps-dev)` cannot. Subjects without a
 * Conventional Commit prefix are kept. Order is preserved (git log is
 * newest first).
 *
 * @param {string} gitLogOutput
 * @returns {ChangelogEntry[]}
 */
export function parseChangelog(gitLogOutput) {
	/** @type {ChangelogEntry[]} */
	const entries = [];
	for (const line of gitLogOutput.split('\n')) {
		const tab = line.indexOf('\t');
		if (tab === -1) continue;
		const sha = line.slice(0, tab);
		const subject = line.slice(tab + 1);
		const match = subject.match(/^([a-z]+)(?:\(([^)]*)\))?!?:/);
		if (match) {
			const [, type, scope] = match;
			if (HIDDEN_CHANGELOG_TYPES.has(type)) continue;
			if (type === 'chore' && scope !== 'deps') continue;
		}
		entries.push({ sha, subject });
	}
	return entries;
}

/**
 * The git command that prints the tag the Settings > Update changelog
 * starts from. Mirrors the release notes in release.yml: a stable version
 * lists everything since the previous stable (its prereleases included),
 * while a prerelease, and every nightly built on one, starts from the
 * nearest tag. Describing HEAD^ makes a release built on its own tag
 * start from the tag before it. `[0-9]*` keeps the moving `nightly` tag out.
 *
 * @param {string} pkgVersion - Version field from package.json.
 * @returns {string}
 */
export function changelogBaseCommand(pkgVersion) {
	const exclude = pkgVersion.includes('-') ? '' : " --exclude '*-*'";
	return `git describe --tags --abbrev=0 --match '[0-9]*'${exclude} HEAD^`;
}
