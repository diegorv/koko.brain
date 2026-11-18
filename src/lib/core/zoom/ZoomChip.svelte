<script lang="ts">
	import ZoomInIcon from '@lucide/svelte/icons/zoom-in';
	import { zoomStore } from '#lib/core/zoom/zoom.store.svelte.js';
	import { resetZoom } from '#lib/core/zoom/zoom.service.js';
	import { error } from '#lib/utils/debug.js';

	function reset() {
		resetZoom().catch((err) => error('ZOOM', 'resetZoom failed:', err));
	}
</script>

{#if zoomStore.chipVisible}
	<button
		type="button"
		aria-label="Reset zoom to 100%"
		class="bg-popover text-popover-foreground hover:text-primary animate-in fade-in-0 slide-in-from-bottom-1 fixed right-3 bottom-[calc(var(--status-bar-height)+0.75rem)] z-50 inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-2.5 text-xs font-semibold shadow-md transition-colors motion-reduce:animate-none motion-reduce:transition-none"
		onclick={reset}
	>
		<ZoomInIcon class="size-3.5" aria-hidden="true" />
		<span role="status" aria-live="polite">{Math.round(zoomStore.level * 100)}%</span>
	</button>
{/if}
