<script lang="ts">
	import type { QueryResult, PropertyIndexRecord, SortDef } from './collection.types';
	import { formatColumnCell, getPropertyValue } from './collection.logic';
	import { sortState, type SortState } from './toolbar/sort.logic';
	import { isDisplayValue } from './expression/expression.types';
	import { sanitizeHtml } from '#lib/utils/sanitize.js';

	interface Props {
		result: QueryResult;
		currentSort?: SortDef[];
		onClickRow?: (record: PropertyIndexRecord) => void;
		onToggleSort?: (column: string) => void;
	}

	let { result, currentSort = [], onClickRow, onToggleSort }: Props = $props();

	/**
	 * Rows drawn per step. A table view with no filter and no `limit` matches
	 * every note in the vault, and building all its rows freezes the webview.
	 */
	const ROW_CAP = 200;

	/** How many records are drawn; "Show more" raises it by ROW_CAP. */
	let visibleCount = $state(ROW_CAP);

	let visibleRecords = $derived(result.records.slice(0, visibleCount));

	function getSortIndicator(state: SortState | null): string {
		if (!state) return '';
		return state.direction === 'ASC' ? ' \u2191' : ' \u2193';
	}

	/** `aria-sort` for the primary sorted column only; secondary sorts have no ARIA value. */
	function getAriaSort(state: SortState | null): 'ascending' | 'descending' | undefined {
		if (state?.rank !== 1) return undefined;
		return state.direction === 'ASC' ? 'ascending' : 'descending';
	}
</script>

{#if result.records.length === 0}
	<div class="flex items-center justify-center p-8 text-sm text-muted-foreground">
		No results match the current filters
	</div>
{:else}
	<!-- No overflow-* here or on any element down to the th: sticky resolves against the nearest scroller, which is CollectionView's. -->
	<div>
		<table class="w-full border-collapse text-sm">
			<thead>
				<tr>
					{#each result.columns as col}
						{@const state = sortState(currentSort, col.key)}
						<th
							class="sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap bg-card px-3 py-2 text-left font-medium text-muted-foreground shadow-[inset_0_-1px_0_var(--border)] hover:text-foreground transition-colors"
							title={col.displayName !== col.key ? col.key : undefined}
							aria-sort={getAriaSort(state)}
							onclick={() => onToggleSort?.(col.key)}
						>
							{col.displayName}{getSortIndicator(state)}{#if state && currentSort.length > 1}<span data-sort-rank class="text-[0.7em] tabular-nums">{state.rank}</span>{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each visibleRecords as record (record.path)}
					<tr
						class="border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors even:bg-muted/20"
						onclick={() => onClickRow?.(record)}
					>
						{#each result.columns as col}
							{@const value = getPropertyValue(record, col.key)}
							<td class="whitespace-nowrap px-3 py-1.5">
								{#if value === null || value === undefined}
									<span class="text-muted-foreground">{'\u2014'}</span>
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
									{@const text = formatColumnCell(col.key, value)}
									<span class="block max-w-80 truncate" title={text}>{text}</span>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
		{#if result.records.length > visibleRecords.length}
			<div class="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
				<span>Showing {visibleRecords.length} of {result.records.length}</span>
				<button
					class="rounded-xs px-2 py-0.5 cursor-default hover:bg-muted hover:text-foreground"
					onclick={() => (visibleCount += ROW_CAP)}
				>
					Show more
				</button>
			</div>
		{/if}
	</div>
{/if}
