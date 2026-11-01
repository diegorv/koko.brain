<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import SettingsPanel from '#lib/app/SettingsPanel.svelte';
	import QuickSwitcher from '#lib/features/quick-switcher/QuickSwitcher.svelte';
	import CommandPalette from '#lib/features/command-palette/CommandPalette.svelte';
	import TemplatePicker from '#lib/plugins/templates/TemplatePicker.svelte';
	import OneOnOnePicker from '#lib/plugins/one-on-one/OneOnOnePicker.svelte';
	import FileHistoryDialog from '#lib/features/file-history/FileHistoryDialog.svelte';
	import { getBuiltInCommands } from '#lib/app/commands.js';
</script>

<Toaster richColors theme="dark" />
<SettingsPanel />
<QuickSwitcher />
<CommandPalette commands={getBuiltInCommands()} />
<TemplatePicker />
<OneOnOnePicker />
<FileHistoryDialog />
