<script lang="ts">
	import Archive from '@lucide/svelte/icons/archive';
	import Check from '@lucide/svelte/icons/check';
	import { Popover, PopoverPortal, PopoverTrigger, PopoverContent } from '#lib/components/ui/popover/index.js';
	import type { ArchivedFilter } from '#lib/features/type-definitions/type-sidebar.logic.js';

	interface Props {
		/** Which notes the list shows by lifecycle */
		value: ArchivedFilter;
		/** Called with the picked mode; the panel has already closed */
		onChange: (value: ArchivedFilter) => void;
	}

	let { value, onChange }: Props = $props();

	let open = $state(false);

	const OPTIONS: { value: ArchivedFilter; label: string }[] = [
		{ value: 'active', label: 'Hide archived' },
		{ value: 'all', label: 'Show archived' },
		{ value: 'archived', label: 'Only archived' },
	];

	const triggerTitle = $derived(OPTIONS.find((o) => o.value === value)?.label ?? 'Archived notes');

	function pick(next: ArchivedFilter) {
		open = false;
		if (next !== value) onChange(next);
	}
</script>

<Popover bind:open>
	<PopoverTrigger
		class="flex shrink-0 cursor-default items-center rounded-md p-1 transition-colors hover:bg-file-explorer-accent hover:text-tab-text-active focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 {value !== 'active'
			? 'text-tab-text-active'
			: 'text-tab-text-inactive'}"
		title={triggerTitle}
		aria-label={triggerTitle}
		data-note-list-archived={value}
	>
		<Archive class="size-3.5" />
	</PopoverTrigger>
	<!-- The list pane clips its overflow, and the rows paint over anything inline in its header. -->
	<PopoverPortal>
		<PopoverContent align="end" class="w-44 p-1">
			<div class="flex flex-col">
				{#each OPTIONS as option (option.value)}
					{@const active = option.value === value}
					<button
						type="button"
						aria-pressed={active}
						class="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1 text-left text-meta hover:bg-file-explorer-accent {active
							? 'text-tab-text-active'
							: ''}"
						data-archived-option={option.value}
						onclick={() => pick(option.value)}
					>
						<span class="flex-1 truncate">{option.label}</span>
						{#if active}
							<Check class="size-3 shrink-0" />
						{/if}
					</button>
				{/each}
			</div>
		</PopoverContent>
	</PopoverPortal>
</Popover>
