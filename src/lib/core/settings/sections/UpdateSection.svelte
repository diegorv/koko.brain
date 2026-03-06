<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { check } from '@tauri-apps/plugin-updater';
	import { relaunch } from '@tauri-apps/plugin-process';
	import SettingItem from './SettingItem.svelte';

	let status = $state<'idle' | 'checking' | 'downloading' | 'ready' | 'up-to-date' | 'error'>('idle');
	let errorMessage = $state('');
	let updateVersion = $state('');
	let downloadProgress = $state(0);

	async function checkForUpdates() {
		status = 'checking';
		errorMessage = '';
		try {
			const update = await check();
			if (update) {
				updateVersion = update.version;
				status = 'downloading';
				let totalBytes = 0;
				let downloadedBytes = 0;
				await update.downloadAndInstall((event) => {
					if (event.event === 'Started' && event.data.contentLength) {
						totalBytes = event.data.contentLength;
					} else if (event.event === 'Progress') {
						downloadedBytes += event.data.chunkLength;
						if (totalBytes > 0) {
							downloadProgress = Math.round((downloadedBytes / totalBytes) * 100);
						}
					} else if (event.event === 'Finished') {
						downloadProgress = 100;
					}
				});
				status = 'ready';
			} else {
				status = 'up-to-date';
			}
		} catch (err) {
			status = 'error';
			errorMessage = err instanceof Error ? err.message : String(err);
		}
	}

	async function restartApp() {
		await relaunch();
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Update</h2>

	<SettingItem label="Current version" description="The version currently installed">
		<span class="font-mono text-sm text-muted-foreground">{__BUILD_INFO__}</span>
	</SettingItem>

	<SettingItem
		label="Check for updates"
		description="Check if a newer version is available on GitHub"
	>
		{#if status === 'idle'}
			<Button variant="outline" size="sm" onclick={checkForUpdates}>
				Check
			</Button>
		{:else if status === 'checking'}
			<span class="text-sm text-muted-foreground">Checking...</span>
		{:else if status === 'downloading'}
			<span class="text-sm text-muted-foreground">Downloading v{updateVersion}... {downloadProgress}%</span>
		{:else if status === 'ready'}
			<Button variant="default" size="sm" onclick={restartApp}>
				Restart to update
			</Button>
		{:else if status === 'up-to-date'}
			<span class="text-sm text-green-500">You're up to date!</span>
		{:else if status === 'error'}
			<div class="flex items-center gap-2">
				<span class="text-sm text-destructive">{errorMessage}</span>
				<Button variant="outline" size="sm" onclick={checkForUpdates}>
					Retry
				</Button>
			</div>
		{/if}
	</SettingItem>
</div>
