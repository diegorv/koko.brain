<script lang="ts">
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import type { DiffLine } from './file-history.types';

	interface Props {
		diffLines: DiffLine[];
		isLoading: boolean;
	}

	let { diffLines, isLoading }: Props = $props();

	function lineClass(type: DiffLine['type']): string {
		switch (type) {
			case 'insert': return 'bg-green-500/15 text-green-300';
			case 'delete': return 'bg-red-500/15 text-red-300';
			default: return '';
		}
	}

	function linePrefix(type: DiffLine['type']): string {
		switch (type) {
			case 'insert': return '+';
			case 'delete': return '-';
			default: return ' ';
		}
	}
</script>

<ScrollArea class="h-full" orientation="both">
	{#if isLoading}
		<div class="flex items-center justify-center py-12 text-sm text-muted-foreground">
			Loading diff...
		</div>
	{:else if diffLines.length === 0}
		<div class="flex items-center justify-center py-12 text-sm text-muted-foreground">
			Select a snapshot to view changes
		</div>
	{:else}
		<table class="w-full border-collapse font-mono text-sm">
			<tbody>
				{#each diffLines as line}
					<tr class={lineClass(line.type)}>
						<td class="w-10 select-none px-2 text-right text-muted-foreground">
							{line.oldLineNum ?? ''}
						</td>
						<td class="w-10 select-none px-2 text-right text-muted-foreground">
							{line.newLineNum ?? ''}
						</td>
						<td class="w-4 select-none text-center">{linePrefix(line.type)}</td>
						<td class="whitespace-pre px-2">{line.content}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</ScrollArea>
