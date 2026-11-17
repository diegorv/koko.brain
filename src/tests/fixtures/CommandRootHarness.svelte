<script lang="ts">
	import * as Command from '#lib/components/ui/command/index.js';
</script>

<!-- The command primitives outside a command dialog, as the font picker and the mod pick dialog use them. -->
<Command.Root>
	<Command.Input placeholder="Type..." />
	<Command.List>
		<Command.Item value="one">One</Command.Item>
	</Command.List>
</Command.Root>
