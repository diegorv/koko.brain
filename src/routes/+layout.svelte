<script lang="ts">
	import '../app.css';
	import NotConnectedBanner from '#lib/app/remote/NotConnectedBanner.svelte';
	import RemoteDialog from '#lib/app/remote/RemoteDialog.svelte';

	let { children } = $props();
</script>

<NotConnectedBanner />
<RemoteDialog />
{@render children()}
