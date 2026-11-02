<script lang="ts">
	import '../app.css';
	import NotConnectedBanner from '#lib/app/remote/NotConnectedBanner.svelte';

	let { children } = $props();
</script>

<NotConnectedBanner />
{@render children()}
