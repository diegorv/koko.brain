<script lang="ts">
	import type { QueryResult, NoteRecord, SortDef } from './collection.types';
	import { formatCellValue, getPropertyValue } from './collection.logic';
	import { isDisplayValue } from './expression/expression.types';
	import { sanitizeHtml } from '$lib/utils/sanitize';

	interface Props {
		result: QueryResult;
		currentSort?: SortDef[];
		onClickRow?: (record: NoteRecord) => void;
		onToggleSort?: (column: string) => void;
	}

	let { result, currentSort = [], onClickRow, onToggleSort }: Props = $props();

	function getSortIndicator(column: string): string {
		const sortDef = currentSort.find((s) => s.column === column);
		if (!sortDef) return '';
		return sortDef.direction === 'ASC' ? ' \u2191' : ' \u2193';
	}
</script>

{#if result.records.length === 0}
	<div class="flex items-center justify-center p-8 text-sm text-muted-foreground">
		No results match the current filters
	</div>
{:else}
	<div class="overflow-auto">
		<table class="w-full border-collapse text-sm">
			<thead>
				<tr class="border-b border-border">
					{#each result.columns as col}
						<th
							class="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground hover:text-foreground transition-colors"
							onclick={() => onToggleSort?.(col.key)}
						>
							{col.displayName}{getSortIndicator(col.key)}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each result.records as record}
					<tr
						class="border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors even:bg-muted/20"
						onclick={() => onClickRow?.(record)}
					>
						{#each result.columns as col}
							{@const value = getPropertyValue(record, col.key)}
							<td class="whitespace-nowrap px-3 py-1.5">
								{#if value === null || value === undefined}
									<span class="text-muted-foreground/50">{'\u2014'}</span>
								{:else if typeof value === 'boolean'}
									<input type="checkbox" checked={value} disabled class="pointer-events-none" />
								{:else if isDisplayValue(value)}
									{#if value.__display === 'link'}
										<a href={value.href} class="text-primary underline hover:text-primary/80">{value.display || value.href}</a>
									{:else if value.__display === 'image'}
										<img src={value.src} alt={value.alt} class="inline-block max-h-6" />
									{:else if value.__display === 'icon'}
										<span class="inline-flex items-center" title={value.name}>{value.name}</span>
									{:else if value.__display === 'html'}
										{@html sanitizeHtml(value.html)}
									{/if}
								{:else}
									{formatCellValue(value)}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
