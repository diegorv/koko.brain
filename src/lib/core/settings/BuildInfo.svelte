<script lang="ts">
	import { channelLabel } from '#lib/utils/build-info.js';

	/**
	 * Standalone display widget for `__BUILD_INFO__` with a per-channel
	 * pill prefix. Used by:
	 * - Settings → Troubleshooting → Build row
	 * - Settings → Update → Current version row
	 * - +page.svelte (welcome screen footer)
	 *
	 * The pill colour reflects the build channel itself (from
	 * `__APP_CHANNEL__`), NOT the user's chosen updater channel — the
	 * two are independent (a Nightly build can be set to follow Stable
	 * updates and vice versa). The pill therefore always shows what
	 * the user is actually running, while the channel toggle in
	 * UpdateSection shows what the auto-updater will check next.
	 *
	 * A run from the Vite dev server (`pnpm tauri dev`) shows DEV instead:
	 * `__APP_CHANNEL__` falls back to `stable` there, which would claim
	 * an official release.
	 *
	 * Variants control surrounding typography:
	 * - `default`: monospace, text-row, muted-foreground (used inside
	 *   SettingItem rows).
	 * - `footer`: monospace, text-meta, muted-foreground/50, absolute
	 *   positioning is supplied by the parent (used by +page.svelte).
	 */
	let { variant = 'default' as 'default' | 'footer' }: { variant?: 'default' | 'footer' } = $props();

	const BADGE_CLASSES = {
		stable: 'bg-green-500/20 text-green-700 dark:text-green-400',
		nightly: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
		dev: 'bg-violet-500/20 text-violet-700 dark:text-violet-400',
	};

	// Both inputs are fixed at build time, so the badge is effectively a
	// compile-time constant. `containerClass` reacts to the `variant` prop
	// via `$derived` so consumers that change the variant at runtime would
	// still re-render correctly.
	const buildKind = import.meta.env.DEV ? 'dev' : __APP_CHANNEL__;

	const containerClass = $derived(
		variant === 'footer'
			? 'inline-flex items-center gap-2 rounded-md border border-muted-foreground/10 bg-card px-3 py-1.5 font-mono text-meta text-muted-foreground'
			: 'inline-flex items-center gap-2 font-mono text-row text-muted-foreground',
	);
</script>

<span class={containerClass}>
	<span class="rounded-xs px-1.5 py-0.5 text-label font-semibold uppercase tracking-wider {BADGE_CLASSES[buildKind]}">{channelLabel(buildKind)}</span>
	<span>{__BUILD_INFO__}</span>
</span>
