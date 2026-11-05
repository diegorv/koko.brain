<script lang="ts">
	import * as Popover from '#lib/components/ui/popover/index.js';

	interface Props {
		/** Whether the popover is open */
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();
</script>

<!-- The shadcn popover with no caller classes, so the test sees the content's own padding. -->
<Popover.Root bind:open>
	<Popover.Trigger>Harness trigger</Popover.Trigger>
	<Popover.Content>
		<p>Harness popover</p>
	</Popover.Content>
</Popover.Root>
