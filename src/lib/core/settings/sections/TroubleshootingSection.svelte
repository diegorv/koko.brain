<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { setTauriDebugMode } from '$lib/utils/debug';
	import { initLogSession, teardownLogSession, openLogDir } from '$lib/utils/log.service';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Troubleshooting</h2>

	<h3 class="mb-2 text-sm font-medium text-muted-foreground">About</h3>

	<SettingItem label="Build" description="Version, commit hash, and build time">
		<span class="font-mono text-sm text-muted-foreground">{__BUILD_INFO__}</span>
	</SettingItem>

	<h3 class="mb-2 text-sm font-medium text-muted-foreground">Frontend</h3>

	<SettingItem
		label="Debug mode"
		description="Log debug messages to the browser console"
	>
		<Switch
			checked={settingsStore.debugMode}
			onCheckedChange={(v) => {
				settingsStore.updateDebugMode(v);
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Save debug log to file"
		description="Write frontend debug logs to the system log directory"
	>
		<Switch
			checked={settingsStore.debugLogToFile}
			onCheckedChange={(v) => {
				settingsStore.updateDebugLogToFile(v);
				if (v) {
					initLogSession();
				} else if (!settingsStore.debugTauriLogToFile) {
					teardownLogSession();
				}
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Open log folder"
		description="Browse saved log files in the system file manager"
	>
		<Button variant="outline" size="sm" onclick={() => openLogDir()}>
			Open
		</Button>
	</SettingItem>

	<h3 class="mt-6 mb-2 text-sm font-medium text-muted-foreground">Backend (Tauri)</h3>

	<SettingItem
		label="Tauri debug mode"
		description="Forward Rust backend logs to the browser console"
	>
		<Switch
			checked={settingsStore.debugModeTauri}
			onCheckedChange={(v) => {
				settingsStore.updateDebugModeTauri(v);
				setTauriDebugMode(v);
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Save Tauri log to file"
		description="Write Rust backend logs to the system log directory"
	>
		<Switch
			checked={settingsStore.debugTauriLogToFile}
			onCheckedChange={(v) => {
				settingsStore.updateDebugTauriLogToFile(v);
				if (v) {
					initLogSession();
				} else if (!settingsStore.debugLogToFile) {
					teardownLogSession();
				}
				onchange();
			}}
		/>
	</SettingItem>
</div>
