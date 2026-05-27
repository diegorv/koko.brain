<script lang="ts">
	import { channelLabel } from '$lib/utils/build-info';

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
	 * Variants control surrounding typography:
	 * - `default`: monospace, text-sm, muted-foreground (used inside
	 *   SettingItem rows).
	 * - `footer`: monospace, text-xs, muted-foreground/50, absolute
	 *   positioning is supplied by the parent (used by +page.svelte).
	 */
	let { variant = 'default' as 'default' | 'footer' }: { variant?: 'default' | 'footer' } = $props();

	// `__APP_CHANNEL__` is a Vite-injected literal, so the badge class is
	// effectively a compile-time constant. `containerClass` reacts to the
	// `variant` prop via `$derived` so consumers that change the variant
	// at runtime would still re-render correctly.
	const channelBadgeClass = __APP_CHANNEL__ === 'nightly'
		? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
		: 'bg-muted text-muted-foreground';

	const containerClass = $derived(
		variant === 'footer'
			? 'inline-flex items-center gap-2 rounded-md border border-muted-foreground/10 bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground'
			: 'inline-flex items-center gap-2 font-mono text-sm text-muted-foreground',
	);
</script>

<span class={containerClass}>
	<span class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider {channelBadgeClass}">{channelLabel(__APP_CHANNEL__)}</span>
	<span>{__BUILD_INFO__}</span>
</span>
