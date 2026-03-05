<script lang="ts">
	import { Check } from 'lucide-svelte';
	import type { KanbanBoard, KanbanItem } from './kanban.types';
	import { stripCardMetadata, extractCardDate, extractCardColor, getDateProximity } from './kanban.logic';
	import { today } from '$lib/utils/date';
	import { COLOR_PRESET_BG } from '$lib/utils/color-presets';
	import KanbanCardText from './KanbanCardText.svelte';

	interface Props {
		board: KanbanBoard;
		onToggleItem: (laneId: string, itemId: string) => void;
		onWikilinkClick?: (target: string, heading?: string) => void;
	}

	let { board, onToggleItem, onWikilinkClick }: Props = $props();
</script>

<div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
	{#each board.lanes as lane (lane.id)}
		<div class="rounded-lg border border-border">
			<h3 class="border-b border-border bg-muted/30 px-3 py-2 text-sm font-semibold">
				{lane.title}
				<span class="ml-1 text-xs font-normal text-muted-foreground">({lane.items.length})</span>
			</h3>
			<div class="flex flex-col divide-y divide-border">
				{#each lane.items as item (item.id)}
					{@const cardDate = extractCardDate(item.text)}
					{@const cardColor = extractCardColor(item.text)}
					{@const displayText = stripCardMetadata(item.text)}
					{@const proximity = getDateProximity(cardDate, today())}
					<div
						class="flex items-center gap-2 px-3 py-2 text-sm"
						style={cardColor ? `background: ${COLOR_PRESET_BG[cardColor]}` : ''}
					>
						<button
							class="flex size-4 shrink-0 items-center justify-center rounded border transition-colors
								{item.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 hover:border-primary'}"
							onclick={() => onToggleItem(lane.id, item.id)}
						>
							{#if item.checked}
								<Check class="size-3" />
							{/if}
						</button>
						<span class="{item.checked ? 'text-muted-foreground line-through' : ''} flex-1">
							<KanbanCardText text={displayText} tagColors={board.settings.tagColors ?? {}} {onWikilinkClick} />
						</span>
						{#if cardDate}
							<span class="shrink-0 rounded px-1.5 py-0.5 text-xs {proximity === 'overdue' ? 'bg-red-500/15 text-red-500' : proximity === 'today' ? 'bg-yellow-500/15 text-yellow-500' : 'bg-muted text-muted-foreground'}">
								{cardDate}
							</span>
						{/if}
					</div>
				{/each}
				{#if lane.items.length === 0}
					<div class="px-3 py-2 text-xs text-muted-foreground">No cards</div>
				{/if}
			</div>
		</div>
	{/each}
</div>
