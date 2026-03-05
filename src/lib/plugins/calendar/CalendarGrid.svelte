<script lang="ts">
	import type { MonthGrid } from './calendar.logic';

	interface Props {
		grid: MonthGrid;
		dayFileCounts: Map<string, number>;
		selectedDateKey: string | null;
		onDayClick: (dateKey: string) => void;
		onWeekClick?: (dateKey: string) => void;
	}

	let { grid, dayFileCounts, selectedDateKey, onDayClick, onWeekClick }: Props = $props();

	const DAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

	/** Returns 1, 2, or 3 dots based on file count */
	function dotCount(count: number): number {
		if (count <= 1) return 1;
		if (count <= 3) return 2;
		return 3;
	}
</script>

<div class="flex gap-1">
	<!-- Week number column -->
	<div class="flex flex-col gap-y-0.5">
		<!-- Header spacer -->
		<div class="h-6"></div>
		<!-- Week buttons with continuous background -->
		<div class="flex flex-col gap-y-0.5 bg-background/70 rounded-md px-0.5 py-0.5">
			{#each grid.weeks as week, wi}
				<button
					class="flex items-center justify-center h-7 w-6 text-xs text-foreground/70 rounded-sm hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
					onclick={() => onWeekClick?.(week[0].dateKey)}
					title="Open weekly note (W{grid.weekNumbers[wi]})"
				>
					{grid.weekNumbers[wi]}
				</button>
			{/each}
		</div>
	</div>

	<!-- Days grid -->
	<div class="grid grid-cols-7 gap-y-0.5 flex-1">
		{#each DAY_HEADERS as header, i}
			<div class="flex items-center justify-center h-6 text-xs font-medium
				{i >= 5 ? 'text-primary' : 'text-muted-foreground'}">
				{header}
			</div>
		{/each}

		{#each grid.weeks as week, _wi}
			{#each week as day, di (day.dateKey)}
				{@const count = dayFileCounts.get(day.dateKey) ?? 0}
				<button
					class="relative flex items-center justify-center h-7 text-[13px] rounded-md transition-colors cursor-pointer
						{day.isCurrentMonth ? (di >= 5 ? 'text-primary' : 'text-foreground') : 'text-muted-foreground/40'}
						{day.isToday ? 'font-bold ring-1 ring-primary' : ''}
						{selectedDateKey === day.dateKey ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}"
					onclick={() => onDayClick(day.dateKey)}
				>
					{day.day}
					{#if count > 0}
						<span class="absolute bottom-0.5 flex gap-px">
							{#each { length: dotCount(count) } as _}
								<span class="w-1 h-1 rounded-full bg-primary"></span>
							{/each}
						</span>
					{/if}
				</button>
			{/each}
		{/each}
	</div>
</div>
