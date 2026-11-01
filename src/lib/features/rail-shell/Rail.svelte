<script lang="ts">
	import Inbox from '@lucide/svelte/icons/inbox';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { excludeSystemFolder } from '#lib/features/type-definitions/type-sidebar.logic.js';
	import { getInboxCount } from '#lib/features/type-definitions/inbox-workflow.logic.js';
	import { INBOX_LENS } from './lens.logic';
	import type { Lens } from './rail-shell.types';

	interface Props {
		/** Key of the highlighted rail item */
		activeItem: string;
		/** Called with the picked item's key and the lens it sets */
		onSelect: (item: string, lens: Lens) => void;
	}

	let { activeItem, onSelect }: Props = $props();

	// Same input as the dock badge in AppShell, so both show the same number.
	let inboxCount = $derived.by(() => {
		void typeDefinitionsStore.entriesVersion;
		return getInboxCount(
			excludeSystemFolder(typeDefinitionsStore.entries, vaultStore.path, settingsStore.templates.systemFolder),
		);
	});

	const items = [{ key: 'inbox', label: 'Inbox', icon: Inbox, lens: INBOX_LENS }];
</script>

<nav
	aria-label="Rail"
	class="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-file-explorer-border bg-background"
	data-rail
>
	<!-- Room for the macOS traffic lights (titleBarStyle Overlay), and a handle to drag the window. -->
	<div class="h-10 w-full shrink-0" data-tauri-drag-region></div>
	{#each items as item (item.key)}
		{@const active = item.key === activeItem}
		<button
			class="relative rounded-md p-2 cursor-default {active
				? 'bg-file-explorer-primary/25 text-file-explorer-primary'
				: 'text-file-explorer-fg/70 hover:bg-file-explorer-accent/60 hover:text-file-explorer-fg'}"
			title={item.label}
			aria-label={item.label}
			aria-current={active ? 'page' : undefined}
			data-rail-item={item.key}
			onclick={() => onSelect(item.key, item.lens)}
		>
			<item.icon class="size-4" />
			{#if item.key === 'inbox' && inboxCount > 0}
				<span
					class="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1 text-[9px] leading-[14px] tabular-nums text-primary-foreground"
					data-rail-badge
				>{inboxCount}</span>
			{/if}
		</button>
	{/each}
</nav>
