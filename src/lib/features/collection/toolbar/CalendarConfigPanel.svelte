<script lang="ts">
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
	} from '$lib/components/ui/dropdown-menu';
	import { ChevronDown } from 'lucide-svelte';

	interface Props {
		/** Currently selected date property */
		dateProperty?: string;
		/** Currently selected end date property */
		endDateProperty?: string;
		/** First day of the week (0=Sun, 1=Mon, ..., 6=Sat) */
		weekStartDay: number;
		/** Currently selected color-by property */
		colorProperty?: string;
		/** All available property names from the index */
		availableProperties: string[];
		/** Called when the date property changes */
		onDatePropertyChange: (prop: string) => void;
		/** Called when the end date property changes */
		onEndDatePropertyChange: (prop: string | undefined) => void;
		/** Called when the week start day changes */
		onWeekStartDayChange: (day: number) => void;
		/** Called when the color property changes */
		onColorPropertyChange?: (prop: string | undefined) => void;
	}

	let {
		dateProperty,
		endDateProperty,
		weekStartDay,
		colorProperty,
		availableProperties,
		onDatePropertyChange,
		onEndDatePropertyChange,
		onWeekStartDayChange,
		onColorPropertyChange,
	}: Props = $props();

	const weekDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
</script>

<div class="flex flex-col gap-3">
	<!-- Date property -->
	<div class="flex flex-col gap-1">
		<span class="text-xs font-medium text-muted-foreground">Start date property</span>
		<DropdownMenu>
			<DropdownMenuTrigger>
				<button
					class="flex h-7 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs hover:bg-accent"
				>
					<span class="truncate">{dateProperty ?? 'Select property...'}</span>
					<ChevronDown class="size-3 shrink-0 opacity-50" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent class="max-h-[300px] overflow-y-auto">
				{#each availableProperties as prop}
					<DropdownMenuItem onclick={() => onDatePropertyChange(prop)}>
						<span class="text-xs">{prop}</span>
					</DropdownMenuItem>
				{/each}
			</DropdownMenuContent>
		</DropdownMenu>
	</div>

	<!-- End date property -->
	<div class="flex flex-col gap-1">
		<span class="text-xs font-medium text-muted-foreground">End date property (optional)</span>
		<DropdownMenu>
			<DropdownMenuTrigger>
				<button
					class="flex h-7 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs hover:bg-accent"
				>
					<span class="truncate">{endDateProperty ?? 'None'}</span>
					<ChevronDown class="size-3 shrink-0 opacity-50" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent class="max-h-[300px] overflow-y-auto">
				<DropdownMenuItem onclick={() => onEndDatePropertyChange(undefined)}>
					<span class="text-xs text-muted-foreground">None</span>
				</DropdownMenuItem>
				{#each availableProperties as prop}
					<DropdownMenuItem onclick={() => onEndDatePropertyChange(prop)}>
						<span class="text-xs">{prop}</span>
					</DropdownMenuItem>
				{/each}
			</DropdownMenuContent>
		</DropdownMenu>
	</div>

	<!-- Week start day -->
	<div class="flex flex-col gap-1">
		<span class="text-xs font-medium text-muted-foreground">Week starts on</span>
		<DropdownMenu>
			<DropdownMenuTrigger>
				<button
					class="flex h-7 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs hover:bg-accent"
				>
					<span>{weekDayNames[weekStartDay]}</span>
					<ChevronDown class="size-3 shrink-0 opacity-50" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				{#each weekDayNames as dayName, i}
					<DropdownMenuItem onclick={() => onWeekStartDayChange(i)}>
						<span class="text-xs">{dayName}</span>
					</DropdownMenuItem>
				{/each}
			</DropdownMenuContent>
		</DropdownMenu>
	</div>

	<!-- Color by property -->
	{#if onColorPropertyChange}
		<div class="flex flex-col gap-1">
			<span class="text-xs font-medium text-muted-foreground">Color by property (optional)</span>
			<DropdownMenu>
				<DropdownMenuTrigger>
					<button
						class="flex h-7 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs hover:bg-accent"
					>
						<span class="truncate">{colorProperty ?? 'None'}</span>
						<ChevronDown class="size-3 shrink-0 opacity-50" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent class="max-h-[300px] overflow-y-auto">
					<DropdownMenuItem onclick={() => onColorPropertyChange(undefined)}>
						<span class="text-xs text-muted-foreground">None</span>
					</DropdownMenuItem>
					{#each availableProperties as prop}
						<DropdownMenuItem onclick={() => onColorPropertyChange(prop)}>
							<span class="text-xs">{prop}</span>
						</DropdownMenuItem>
					{/each}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	{/if}
</div>
