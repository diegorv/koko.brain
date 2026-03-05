<script lang="ts">
	import { Calendar as CalendarIcon, X } from 'lucide-svelte';
	import { Calendar as CalendarPrimitive, Popover as PopoverPrimitive } from 'bits-ui';
	import { CalendarDate, type DateValue } from '@internationalized/date';

	import type { DateProximity } from './kanban.logic';

	interface Props {
		/** Current date string in YYYY-MM-DD format, or null */
		date: string | null;
		/** Date proximity for coloring */
		proximity?: DateProximity;
		/** Callback when date changes. null means date was removed. */
		onDateChange: (date: string | null) => void;
	}

	let { date, proximity = 'none', onDateChange }: Props = $props();

	const PROXIMITY_BADGE: Record<DateProximity, string> = {
		overdue: 'bg-red-500/15 text-red-400',
		today: 'bg-yellow-500/15 text-yellow-400',
		tomorrow: 'bg-orange-400/15 text-orange-400',
		upcoming: 'bg-blue-400/15 text-blue-400',
		future: 'bg-muted text-muted-foreground',
		none: 'bg-muted text-muted-foreground',
	};

	let open = $state(false);

	/** Converts a YYYY-MM-DD string to a CalendarDate */
	function toCalendarDate(dateStr: string): CalendarDate {
		const [y, m, d] = dateStr.split('-').map(Number);
		return new CalendarDate(y, m, d);
	}

	/** Converts a DateValue to a YYYY-MM-DD string */
	function toDateString(dv: DateValue): string {
		const y = String(dv.year).padStart(4, '0');
		const m = String(dv.month).padStart(2, '0');
		const d = String(dv.day).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	let value = $derived(date ? toCalendarDate(date) : undefined);

	function handleSelect(newValue: DateValue | undefined) {
		if (newValue) {
			onDateChange(toDateString(newValue));
			open = false;
		}
	}

	function handleRemove(e: MouseEvent) {
		e.stopPropagation();
		onDateChange(null);
		open = false;
	}
</script>

<PopoverPrimitive.Root bind:open>
	{#if date}
		<div class="flex items-center gap-0.5">
			<PopoverPrimitive.Trigger>
				{#snippet children()}
					<button
						class="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs transition-colors {PROXIMITY_BADGE[proximity]}"
						type="button"
					>
						<CalendarIcon class="size-3" />
						{date}
					</button>
				{/snippet}
			</PopoverPrimitive.Trigger>
			<button
				class="rounded-full p-0.5 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted transition-colors"
				onclick={handleRemove}
				type="button"
				aria-label="Remove date"
			>
				<X class="size-2.5" />
			</button>
		</div>
	{:else}
		<PopoverPrimitive.Trigger>
			{#snippet children()}
				<button
					class="rounded-sm p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
					type="button"
					aria-label="Set date"
					title="Set date"
				>
					<CalendarIcon class="size-3.5" />
				</button>
			{/snippet}
		</PopoverPrimitive.Trigger>
	{/if}
	<PopoverPrimitive.Content
		class="z-50 rounded-md border bg-popover p-3 shadow-md"
		sideOffset={4}
		align="start"
		onOpenAutoFocus={(e) => e.preventDefault()}
		onFocusOutside={(e) => e.preventDefault()}
		onInteractOutside={(e) => e.preventDefault()}
	>
		<CalendarPrimitive.Root
			type="single"
			{value}
			onValueChange={handleSelect}
			class="w-fit"
		>
			{#snippet children({ months, weekdays })}
				<CalendarPrimitive.Header class="flex items-center justify-between pb-2">
					<CalendarPrimitive.PrevButton class="rounded p-1 hover:bg-muted">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
					</CalendarPrimitive.PrevButton>
					<CalendarPrimitive.Heading class="text-sm font-medium" />
					<CalendarPrimitive.NextButton class="rounded p-1 hover:bg-muted">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
					</CalendarPrimitive.NextButton>
				</CalendarPrimitive.Header>
				{#each months as month}
					<CalendarPrimitive.Grid class="w-full border-collapse">
						<CalendarPrimitive.GridHead>
							<CalendarPrimitive.GridRow class="flex">
								{#each weekdays as weekday}
									<CalendarPrimitive.HeadCell class="w-8 text-center text-xs font-normal text-muted-foreground">
										{weekday.slice(0, 2)}
									</CalendarPrimitive.HeadCell>
								{/each}
							</CalendarPrimitive.GridRow>
						</CalendarPrimitive.GridHead>
						<CalendarPrimitive.GridBody>
							{#each month.weeks as week}
								<CalendarPrimitive.GridRow class="flex">
									{#each week as cellDate}
										<CalendarPrimitive.Cell date={cellDate} month={month.value} class="p-0">
											<CalendarPrimitive.Day
												class="inline-flex size-8 items-center justify-center rounded text-sm transition-colors hover:bg-muted data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[today]:font-bold data-[outside-month]:text-muted-foreground/40 data-[disabled]:text-muted-foreground/40"
											>
												{#snippet children({ day })}
													{day}
												{/snippet}
											</CalendarPrimitive.Day>
										</CalendarPrimitive.Cell>
									{/each}
								</CalendarPrimitive.GridRow>
							{/each}
						</CalendarPrimitive.GridBody>
					</CalendarPrimitive.Grid>
				{/each}
			{/snippet}
		</CalendarPrimitive.Root>
	</PopoverPrimitive.Content>
</PopoverPrimitive.Root>
