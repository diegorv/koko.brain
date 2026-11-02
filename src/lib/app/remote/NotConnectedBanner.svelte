<script lang="ts">
	import { isBridgeStandInInstalled } from './tauri-bridge-stand-in';

	/** Fixed for the page's lifetime: the stand-in is installed before the app mounts. */
	const inBrowser = isBridgeStandInInstalled();
</script>

{#if inBrowser}
	<div
		role="status"
		data-testid="not-connected-banner"
		class="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground shadow-md"
	>
		<span class="font-semibold">Not connected.</span>
		This browser is not connected to the Kokobrain desktop app, so no vault can be opened here yet.
	</div>
{/if}
