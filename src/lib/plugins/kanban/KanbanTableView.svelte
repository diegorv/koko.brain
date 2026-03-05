<script lang="ts">
	import { Check } from 'lucide-svelte';
	import type { KanbanBoard } from './kanban.types';
	import { stripCardMetadata, extractCardDate, extractCardColor, extractCardTags, getDateProximity } from './kanban.logic';
	import { today } from '$lib/utils/date';
	import { COLOR_PRESET_BG, COLOR_PRESET_TEXT } from '$lib/utils/color-presets';

	interface Props {
		board: KanbanBoard;
		onToggleItem: (laneId: string, itemId: string) => void;
	}

	let { board, onToggleItem }: Props = $props();

	let tagColors = $derived(board.settings.tagColors ?? {});
</script>

<div class="flex flex-1 flex-col overflow-auto p-4">
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr class="border-b border-border text-left text-xs font-medium text-muted-foreground">
				<th class="w-8 px-2 py-2"></th>
				<th class="px-2 py-2">Lane</th>
				<th class="px-2 py-2">Card</th>
				<th class="px-2 py-2">Tags</th>
				<th class="px-2 py-2">Date</th>
				<th class="w-20 px-2 py-2">Status</th>
			</tr>
		</thead>
		<tbody>
			{#each board.lanes as lane (lane.id)}
				{#each lane.items as item (item.id)}
					{@const cardDate = extractCardDate(item.text)}
					{@const cardColor = extractCardColor(item.text)}
					{@const displayText = stripCardMetadata(item.text)}
					{@const tags = extractCardTags(item.text)}
					{@const proximity = getDateProximity(cardDate, today())}
					<tr
						class="border-b border-border/50 hover:bg-muted/20"
						style={cardColor ? `background: ${COLOR_PRESET_BG[cardColor]}` : ''}
					>
						<td class="px-2 py-1.5">
							<button
								class="flex size-4 items-center justify-center rounded border transition-colors
									{item.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 hover:border-primary'}"
								onclick={() => onToggleItem(lane.id, item.id)}
							>
								{#if item.checked}
									<Check class="size-3" />
								{/if}
							</button>
						</td>
						<td class="px-2 py-1.5 text-xs text-muted-foreground">{lane.title}</td>
						<td class="px-2 py-1.5 {item.checked ? 'text-muted-foreground line-through' : ''}">{displayText}</td>
						<td class="px-2 py-1.5">
							<div class="flex flex-wrap gap-0.5">
								{#each tags as tag}
									<span
										class="rounded-sm px-1 py-0.5 text-xs"
										style="background: {COLOR_PRESET_BG[tagColors[tag] ?? 'gray']}; color: {COLOR_PRESET_TEXT[tagColors[tag] ?? 'gray']}"
									>
										#{tag}
									</span>
								{/each}
							</div>
						</td>
						<td class="px-2 py-1.5">
							{#if cardDate}
								<span class="rounded px-1.5 py-0.5 text-xs {proximity === 'overdue' ? 'bg-red-500/15 text-red-500' : proximity === 'today' ? 'bg-yellow-500/15 text-yellow-500' : 'bg-muted text-muted-foreground'}">
									{cardDate}
								</span>
							{/if}
						</td>
						<td class="px-2 py-1.5 text-xs {item.checked ? 'text-green-500' : 'text-muted-foreground'}">
							{item.checked ? 'Done' : 'Open'}
						</td>
					</tr>
				{/each}
			{/each}
		</tbody>
	</table>
</div>
