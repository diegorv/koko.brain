<script lang="ts">
	import { modsStore } from './mods.store.svelte';
</script>

<div class="flex flex-col gap-1 px-4">
	{#if modsStore.entries.length === 0}
		<p class="text-meta text-muted-foreground">No mods in _system/mods/</p>
	{:else}
		<ul class="flex flex-col gap-1">
			{#each modsStore.entries as entry (entry.folder)}
				<li class="flex flex-col gap-0.5 py-1" data-mod-folder={entry.folder} data-mod-state={entry.state}>
					<div class="flex items-baseline justify-between gap-4">
						<span class="text-row text-settings-text">
							{entry.name}
							{#if entry.version}<span class="text-meta text-muted-foreground">{entry.version}</span>{/if}
						</span>
						<span class="text-meta {entry.state === 'error' ? 'text-destructive' : 'text-muted-foreground'}">
							{entry.state === 'error' ? 'Error' : 'Loaded'}
						</span>
					</div>
					{#if entry.error}
						<p class="text-meta text-destructive break-words">{entry.error.message}</p>
						{#if entry.error.stack}
							<details class="text-meta text-muted-foreground">
								<summary class="cursor-pointer">Stack trace</summary>
								<pre class="overflow-x-auto whitespace-pre-wrap">{entry.error.stack}</pre>
							</details>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
