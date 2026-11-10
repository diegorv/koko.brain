<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import SettingsPanel from '#lib/app/SettingsPanel.svelte';
	import { appliedThemeStore } from '#lib/core/settings/applied-theme.store.svelte.js';
	import QuickSwitcher from '#lib/features/quick-switcher/QuickSwitcher.svelte';
	import CommandPalette from '#lib/features/command-palette/CommandPalette.svelte';
	import TemplatePicker from '#lib/plugins/templates/TemplatePicker.svelte';
	import OneOnOnePicker from '#lib/plugins/one-on-one/OneOnOnePicker.svelte';
	import ModActionPicker from '#lib/plugins/mods/ModActionPicker.svelte';
	import ModDialogHost from '#lib/plugins/mods/ModDialogHost.svelte';
	import FileHistoryDialog from '#lib/features/file-history/FileHistoryDialog.svelte';
	import TodoistSyncLogDialog from '#lib/features/todoist-sync/TodoistSyncLogDialog.svelte';
	import { getBuiltInCommands } from '#lib/app/commands.js';
</script>

<Toaster richColors theme={appliedThemeStore.isDark ? 'dark' : 'light'} />
<SettingsPanel />
<QuickSwitcher />
<CommandPalette commands={getBuiltInCommands()} />
<TemplatePicker />
<OneOnOnePicker />
<ModActionPicker />
<ModDialogHost />
<FileHistoryDialog />
<TodoistSyncLogDialog />
