<script lang="ts">
	import { remoteConnectionStore } from './remote-connection.store.svelte';
	import { isBridgeStandInInstalled } from './tauri-bridge-stand-in';

	interface Props {
		/** Reloads the page; tests pass a spy. */
		reload?: () => void;
	}

	let { reload = () => location.reload() }: Props = $props();

	/** Fixed for the page's lifetime: the stand-in is installed before the app mounts. */
	const inBrowser = isBridgeStandInInstalled();
</script>

{#if inBrowser && remoteConnectionStore.status === 'disconnected'}
	<div
		role="alert"
		data-testid="not-connected-banner"
		class="fixed inset-0 z-50 flex items-start justify-center bg-background/70 pt-3 backdrop-blur-sm"
	>
		<div class="flex items-center gap-3 rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground shadow-md">
			<span>
				<span class="font-semibold">Disconnected from the Mac.</span>
				Trying to reconnect; nothing here is live until it does. Check that the Mac is awake and Browser access is on.
			</span>
			<button
				type="button"
				onclick={() => reload()}
				class="rounded-md border border-border px-3 py-1 font-medium hover:bg-muted"
			>
				Reload
			</button>
		</div>
	</div>
{:else if inBrowser && remoteConnectionStore.hasNoVault}
	<div
		role="status"
		data-testid="no-vault-banner"
		class="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground shadow-md"
	>
		<span class="font-semibold">No vault open.</span>
		Open a vault in the Kokobrain desktop app; this page reloads when it does.
	</div>
{/if}
