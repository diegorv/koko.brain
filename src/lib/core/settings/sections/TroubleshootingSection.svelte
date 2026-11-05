<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { setTauriDebugMode } from '#lib/utils/debug.js';
	import { initLogSession, teardownLogSession, openLogDir, startHeartbeat, stopHeartbeat, isLogSessionActive } from '#lib/utils/log.service.js';
	// Deep import on purpose: `decorator-names` is a names-only module with no
	// imports of its own, so the settings chunk stays free of katex, mermaid
	// and DOMPurify. Never import the registry in `live-preview.ts` here.
	import { DECORATOR_LABELS, DECORATOR_NAMES } from '#lib/core/markdown-editor/extensions/live-preview/core/decorator-names.js';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	function isDecoratorDisabled(name: string): boolean {
		return settingsStore.disabledDecorators[name] ?? false;
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Troubleshooting</h2>

	<h3 class="section-label mb-2">Frontend</h3>

	<SettingItem
		label="Debug mode"
		description="Log debug messages to the browser console"
	>
		<Switch
			checked={settingsStore.debugMode}
			onCheckedChange={(v) => {
				settingsStore.updateDebugMode(v);
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
					initLogSession().then(() => {
						if (settingsStore.debugHeartbeat) startHeartbeat();
					});
				} else if (!settingsStore.debugTauriLogToFile) {
					teardownLogSession();
				}
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Heartbeat"
		description="Log a tick every 250 ms, UI and main-thread stalls, and click-to-paint time. Needs a log file. Leave off unless you are chasing a stall."
	>
		<Switch
			checked={settingsStore.debugHeartbeat}
			onCheckedChange={(v) => {
				settingsStore.updateDebugHeartbeat(v);
				if (v && isLogSessionActive()) {
					startHeartbeat();
				} else if (!v) {
					stopHeartbeat();
				}
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Open log folder"
		description="Browse saved log files in the system file manager"
	>
		<Button variant="outline" size="sm" onclick={() => openLogDir()}>
			Show in Finder
		</Button>
	</SettingItem>

	<h3 class="section-label mt-6 mb-2">Live preview</h3>

	<SettingItem
		label="Profile decoration plugins"
		description="Log timing for each live preview decoration rebuild (requires log to file enabled)"
	>
		<Switch
			checked={settingsStore.livePreviewProfiling}
			onCheckedChange={(v) => {
				settingsStore.updateLivePreviewProfiling(v);
			}}
		/>
	</SettingItem>

	<h3 class="section-label mt-6 mb-2">Live preview decorators</h3>

	<p class="text-meta text-muted-foreground">
		Turn one off to isolate a rendering problem. A change applies the next time a note opens.
	</p>

	{#each DECORATOR_NAMES as name}
		<SettingItem
			label={DECORATOR_LABELS[name]}
		>
			<Switch
				aria-label={DECORATOR_LABELS[name]}
				checked={!isDecoratorDisabled(name)}
				onCheckedChange={(v) => {
					settingsStore.toggleDecorator(name, !v);
				}}
			/>
		</SettingItem>
	{/each}

	<h3 class="section-label mt-6 mb-2">Backend (Tauri)</h3>

	<SettingItem
		label="Tauri debug mode"
		description="Forward Rust backend logs to the browser console"
	>
		<Switch
			checked={settingsStore.debugModeTauri}
			onCheckedChange={(v) => {
				settingsStore.updateDebugModeTauri(v);
				setTauriDebugMode(v);
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
					initLogSession().then(() => {
						if (settingsStore.debugHeartbeat) startHeartbeat();
					});
				} else if (!settingsStore.debugLogToFile) {
					teardownLogSession();
				}
			}}
		/>
	</SettingItem>
</div>
