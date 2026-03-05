<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import QuickSwitcher from '$lib/features/quick-switcher/QuickSwitcher.svelte';
	import CommandPalette from '$lib/features/command-palette/CommandPalette.svelte';
	import TemplatePicker from '$lib/plugins/templates/TemplatePicker.svelte';
	import OneOnOnePicker from '$lib/plugins/one-on-one/OneOnOnePicker.svelte';
	import SettingsDialog from '$lib/core/settings/SettingsDialog.svelte';
	import FileHistoryDialog from '$lib/features/file-history/FileHistoryDialog.svelte';
</script>

<Toaster richColors theme="dark" />
<QuickSwitcher />
<CommandPalette />
<TemplatePicker />
<OneOnOnePicker />
<SettingsDialog />
<FileHistoryDialog />
