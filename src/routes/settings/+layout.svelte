<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { loadSettings } from '$lib/core/settings/settings.service';

	let { children } = $props();

	const vaultPath = $derived(page.url.searchParams.get('vault') ?? '');

	let ready = $state(false);

	onMount(async () => {
		if (vaultPath) {
			await loadSettings(vaultPath);
			ready = true;
		}
	});
</script>

<div class="h-screen overflow-hidden bg-background text-foreground">
	{#if ready}
		{@render children()}
	{/if}
</div>
