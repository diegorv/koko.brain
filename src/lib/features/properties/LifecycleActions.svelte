<script lang="ts">
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import FolderCheck from '@lucide/svelte/icons/folder-check';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Star from '@lucide/svelte/icons/star';
	import { propertiesStore } from './properties.store.svelte';
	import { getLifecycleState, isFavorite } from './lifecycle.logic';
	import { setOrganized, setArchived, setFavorite } from './lifecycle.service';

	let lifecycleState = $derived(getLifecycleState(propertiesStore.properties));
	let favorited = $derived(isFavorite(propertiesStore.properties));

	const btnClass = 'flex flex-1 items-center justify-center gap-1.5 py-1.5 rounded-md text-xs text-right-sidebar-muted-fg hover:text-right-sidebar-fg hover:bg-right-sidebar-accent transition-colors cursor-pointer';
</script>

<div class="flex items-center gap-1 px-2 py-1.5">
	{#if lifecycleState === 'archived'}
		<button
			class={btnClass}
			onclick={() => setArchived(false)}
			title="Unarchive"
		>
			<ArchiveRestore class="size-3.5" />
			Unarchive
		</button>
	{:else}
		{#if lifecycleState === 'inbox'}
			<button
				class={btnClass}
				onclick={() => setOrganized(true)}
				title="Mark as organized"
			>
				<FolderCheck class="size-3.5" />
				Organize
			</button>
		{:else}
			<button
				class={btnClass}
				onclick={() => setOrganized(false)}
				title="Move back to inbox"
			>
				<Inbox class="size-3.5" />
				To Inbox
			</button>
		{/if}
		<button
			class={btnClass}
			onclick={() => setArchived(true)}
			title="Archive"
		>
			<Archive class="size-3.5" />
			Archive
		</button>
	{/if}
	<button
		class="flex flex-1 items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer {favorited ? 'text-yellow-500 hover:text-yellow-600' : 'text-right-sidebar-muted-fg hover:text-right-sidebar-fg hover:bg-right-sidebar-accent'}"
		onclick={() => setFavorite(!favorited)}
		title={favorited ? 'Remove from favorites' : 'Add to favorites'}
	>
		<Star class="size-3.5" fill={favorited ? 'currentColor' : 'none'} />
		{favorited ? 'Favorited' : 'Favorite'}
	</button>
</div>
