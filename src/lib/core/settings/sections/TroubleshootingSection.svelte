<script lang="ts">
	import { toast } from 'svelte-sonner';

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

	/**
	 * Starts the log session for a log switch just turned on. `initLogSession`
	 * swallows its own errors, so the outcome is read from `isLogSessionActive`:
	 * with no session, `turnOff` sets that switch back to false and no heartbeat
	 * starts. With a session the other log switch opened, the switch stays on.
	 */
	async function startLogSession(turnOff: () => void) {
		await initLogSession();
		if (!isLogSessionActive()) {
			toast.error('Could not start the log file');
			turnOff();
			return;
		}
		if (settingsStore.debugHeartbeat) startHeartbeat();
	}

	/** Heartbeat and profiling write only to a log file, so they need one of the log switches on. */
	const hasLogFile = $derived(settingsStore.debugLogToFile || settingsStore.debugTauriLogToFile);
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
					startLogSession(() => settingsStore.updateDebugLogToFile(false));
				} else if (!settingsStore.debugTauriLogToFile) {
					teardownLogSession();
				}
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Save mod run messages to file"
		description="Save raw run.log text locally. Also requires Save debug log to file. Messages may contain note text, paths, prompts, API responses or secrets. Inspect log files before sharing. Turning this off stops future messages but does not delete content already saved. Existing ctx.log and error diagnostics are unaffected."
	>
		<Switch
			aria-label="Save mod run messages to file"
			checked={settingsStore.debugModRunMessages}
			onCheckedChange={(v) => settingsStore.updateDebugModRunMessages(v)}
		/>
	</SettingItem>

	<SettingItem
		label="Heartbeat"
		description="Log a tick every 250 ms, UI and main-thread stalls, and click-to-paint time. Needs a log file. Leave off unless you are chasing a stall."
	>
		<!-- An on value stays enabled so it can always be turned off. -->
		<Switch
			aria-label="Heartbeat"
			disabled={!settingsStore.debugHeartbeat && !hasLogFile}
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
			aria-label="Profile decoration plugins"
			disabled={!settingsStore.livePreviewProfiling && !hasLogFile}
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
					startLogSession(() => settingsStore.updateDebugTauriLogToFile(false));
				} else if (!settingsStore.debugLogToFile) {
					teardownLogSession();
				}
			}}
		/>
	</SettingItem>
</div>
