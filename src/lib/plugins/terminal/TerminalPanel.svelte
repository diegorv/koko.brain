<script lang="ts">
	import { onMount } from 'svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	import { terminalStore } from './terminal.store.svelte';
	import { spawnTerminal, killTerminal } from './terminal.service';
	import TerminalInstance from './TerminalInstance.svelte';

	onMount(() => {
		if (terminalStore.sessions.length === 0) {
			spawnTerminal();
		}
	});
</script>

<div class="flex h-full flex-col bg-background">
	<!-- Header bar -->
	<div
		class="flex h-10 shrink-0 items-center gap-1 border-b border-divider bg-tab-bar px-2"
		data-tauri-drag-region
	>
		<!-- Tabs -->
		{#each terminalStore.sessions as session, i (session.sessionId)}
			<div
				class="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors cursor-pointer"
				class:bg-card={i === terminalStore.activeSessionIndex}
				class:text-tab-text-active={i === terminalStore.activeSessionIndex}
				class:text-tab-text-inactive={i !== terminalStore.activeSessionIndex}
				role="tab"
				tabindex="0"
				aria-selected={i === terminalStore.activeSessionIndex}
				onclick={() => terminalStore.setActiveIndex(i)}
				onkeydown={(e) => { if (e.key === 'Enter') terminalStore.setActiveIndex(i); }}
			>
				{session.title}
				{#if !session.alive}
					<span class="text-muted-foreground">(exited)</span>
				{/if}
				<button
					class="ml-1 rounded p-0.5 hover:bg-destructive/20"
					onclick={(e) => { e.stopPropagation(); killTerminal(session.sessionId); }}
				>
					<XIcon class="size-3" />
				</button>
			</div>
		{/each}

		<!-- New terminal button -->
		<button
			class="ml-1 rounded p-1 text-muted-foreground hover:text-foreground"
			onclick={() => spawnTerminal()}
		>
			<PlusIcon class="size-3.5" />
		</button>
	</div>

	<!-- Content area: all instances stay mounted, hidden controls visibility -->
	<div class="flex-1 overflow-hidden">
		{#each terminalStore.sessions as session, i (session.sessionId)}
			<div class="h-full" class:hidden={i !== terminalStore.activeSessionIndex}>
				<TerminalInstance sessionId={session.sessionId} />
			</div>
		{/each}
	</div>
</div>
