<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { setTauriDebugMode } from '$lib/utils/debug';
	import { initLogSession, teardownLogSession, openLogDir, startHeartbeat, stopHeartbeat, isLogSessionActive } from '$lib/utils/log.service';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();

	/** All live preview decorator names that can be toggled */
	const DECORATOR_NAMES = [
		'table', 'metaBindInput', 'queryjs', 'codeBlock', 'frontmatter',
		'callout', 'link', 'inlineMarks', 'simpleWidget', 'heading',
		'blockquote', 'markdownStyle',
	] as const;

	function isDecoratorDisabled(name: string): boolean {
		return settingsStore.disabledDecorators[name] ?? false;
	}
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
					initLogSession().then(() => {
						if (settingsStore.debugHeartbeat) startHeartbeat();
					});
				} else if (!settingsStore.debugTauriLogToFile) {
					teardownLogSession();
				}
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Heartbeat ([HB] alive every 250 ms)"
		description="Emit a heartbeat tick so gaps in the log pinpoint UI freezes. Off by default — only enable when investigating a stall (requires log to file)"
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

	<h3 class="mt-6 mb-2 text-sm font-medium text-muted-foreground">Live Preview</h3>

	<SettingItem
		label="Profile decoration plugins"
		description="Log timing for each live preview decoration rebuild (requires log to file enabled)"
	>
		<Switch
			checked={settingsStore.livePreviewProfiling}
			onCheckedChange={(v) => {
				settingsStore.updateLivePreviewProfiling(v);
				onchange();
			}}
		/>
	</SettingItem>

	<p class="text-xs text-muted-foreground mt-4 mb-2">
		Disable individual decorators for debugging. Changes require app restart.
	</p>

	{#each DECORATOR_NAMES as name}
		<SettingItem
			label={name}
			description=""
		>
			<Switch
				checked={!isDecoratorDisabled(name)}
				onCheckedChange={(v) => {
					settingsStore.toggleDecorator(name, !v);
					onchange();
				}}
			/>
		</SettingItem>
	{/each}

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
					initLogSession().then(() => {
						if (settingsStore.debugHeartbeat) startHeartbeat();
					});
				} else if (!settingsStore.debugLogToFile) {
					teardownLogSession();
				}
				onchange();
			}}
		/>
	</SettingItem>
</div>
