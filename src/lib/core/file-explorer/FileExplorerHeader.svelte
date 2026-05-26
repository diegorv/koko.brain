<script lang="ts">
	import DailyNoteButton from '$lib/plugins/periodic-notes/DailyNoteButton.svelte';
	import SidebarModeToggle from '$lib/features/type-definitions/SidebarModeToggle.svelte';
</script>

<div class="flex items-center justify-end h-10 px-3 gap-0.5 bg-tab-bar" data-tauri-drag-region>
	<div class="flex items-center gap-0.5">
		<DailyNoteButton />

		<div class="mx-0.5 h-4 w-px bg-file-explorer-fg/30"></div>

		<SidebarModeToggle />
	</div>
</div>
