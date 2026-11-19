<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import SettingsPanel from '#lib/app/SettingsPanel.svelte';
	import { appliedThemeStore } from '#lib/core/settings/applied-theme.store.svelte.js';
	import ZoomChip from '#lib/core/zoom/ZoomChip.svelte';
	import QuickSwitcher from '#lib/features/quick-switcher/QuickSwitcher.svelte';
	import CommandPalette from '#lib/features/command-palette/CommandPalette.svelte';
	import TemplatePicker from '#lib/plugins/templates/TemplatePicker.svelte';
	import OneOnOnePicker from '#lib/plugins/one-on-one/OneOnOnePicker.svelte';
	import ModActionPicker from '#lib/plugins/mods/ModActionPicker.svelte';
	import ModDialogHost from '#lib/plugins/mods/ModDialogHost.svelte';
	import FileHistoryDialog from '#lib/features/file-history/FileHistoryDialog.svelte';
	import TodoistSyncLogDialog from '#lib/features/todoist-sync/TodoistSyncLogDialog.svelte';
	import { getBuiltInCommands } from '#lib/app/commands.js';

	/**
	 * Left accent per toast type. Important on purpose: sonner's unlayered
	 * `[data-sonner-toast][data-styled='true'] { border: ... }` beats any
	 * Tailwind utility, which sits in `@layer utilities`.
	 */
	const toastClasses = {
		error: '!border-l-3 !border-l-destructive',
		success: '!border-l-3 !border-l-success',
		warning: '!border-l-3 !border-l-warning',
		info: '!border-l-3 !border-l-primary',
	};
</script>

<!-- The inline style overrides sonner's per-theme `--normal-*` rules with the app's tokens. -->
<Toaster
	theme={appliedThemeStore.isDark ? 'dark' : 'light'}
	style="--normal-bg: var(--popover); --normal-text: var(--popover-foreground); --normal-border: var(--border)"
	toastOptions={{ classes: toastClasses }}
/>
<SettingsPanel />
<QuickSwitcher />
<CommandPalette commands={getBuiltInCommands()} />
<TemplatePicker />
<OneOnOnePicker />
<ModActionPicker />
<ModDialogHost />
<FileHistoryDialog />
<TodoistSyncLogDialog />
<ZoomChip />
