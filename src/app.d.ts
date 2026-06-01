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

/** Build-time environment variables exposed by Vite via `import.meta.env`. */
interface ImportMetaEnv {
	/** PostHog project API key. Empty/undefined disables telemetry entirely. */
	readonly VITE_POSTHOG_KEY?: string;
	/** PostHog ingestion host (region). Defaults to the EU cloud when unset. */
	readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
