<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { Switch } from '$lib/components/ui/switch';
	import { settingsStore } from '../settings.store.svelte';
	import { error } from '$lib/utils/debug';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();

	let mirrorError = $state('');

	async function handleToggle(enabled: boolean) {
		settingsStore.updateMcp({ enabled });
		onchange();
		mirrorError = '';
		try {
			await invoke('set_mcp_enabled', { enabled });
		} catch (err) {
			error('SETTINGS', 'Failed to write MCP mirror file:', err);
			mirrorError = String(err);
		}
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-1 text-lg font-semibold">MCP Server</h2>
	<p class="mb-4 text-xs text-muted-foreground">
		Kokobrain hosts an in-process MCP (Model Context Protocol) endpoint on
		<code>127.0.0.1:3737/mcp</code> while the app is running. MCP clients (Claude Code, etc.)
		can query the vault's hybrid search through it. Disable to skip the bind on the next launch.
	</p>

	<SettingItem
		label="Enable MCP server"
		description="Bind 127.0.0.1:3737 on launch. Restart required for changes to take effect."
	>
		<Switch
			checked={settingsStore.mcp.enabled}
			onCheckedChange={handleToggle}
		/>
	</SettingItem>

	{#if mirrorError}
		<p class="px-4 text-xs text-destructive">
			Could not update the boot-time config: {mirrorError}. The setting is saved per-vault, but
			the next launch may not reflect it.
		</p>
	{/if}
</div>
