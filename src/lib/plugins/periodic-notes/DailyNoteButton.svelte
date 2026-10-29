<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import { openOrCreateDailyNote } from './periodic-notes.service';
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				size="icon-sm"
				class="size-6"
				onclick={() => openOrCreateDailyNote()}
			>
				<NotebookPen class="size-3.5" />
			</Button>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content>Daily Note</Tooltip.Content>
</Tooltip.Root>
