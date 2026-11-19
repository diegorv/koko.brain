<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import SettingItem from '#lib/core/settings/sections/SettingItem.svelte';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { checkClaudeStatus } from './claude-code.service';
	import { claudeStatusStore } from './claude-status.store.svelte';

	let checking = $state(false);
	/** Whether the first-enable notice is open, waiting for Enable or Cancel. */
	let confirmingEnable = $state(false);

	const statusText = $derived.by(() => {
		const status = claudeStatusStore.status;
		// The store may hold the panel's earlier result; while this section checks, say so.
		if (checking) return 'Checking for the claude command...';
		if (claudeStatusStore.checkFailed) return 'Could not check for claude. Try again, or restart Kokobrain if it keeps failing.';
		if (!status) return 'Checking for the claude command...';
		if (status.installed) return `Installed: ${status.version} at ${status.path}`;
		return `Not installed: ${status.error ?? 'claude was not found.'}`;
	});

	// Opening the section and Check again recapture the login shell env, so
	// rc file edits apply; the shared store carries the result to the panel.
	async function check(): Promise<void> {
		checking = true;
		try {
			await checkClaudeStatus(settingsStore.claudeCode.binaryPath, true);
		} catch {
			// The store marks the failure; statusText shows it.
		} finally {
			checking = false;
		}
	}

	$effect(() => {
		untrack(() => void check());
	});

	function setEnabled(enabled: boolean): void {
		// A second click while the notice is open cancels it, so the Switch prop moves
		// true -> false and matches the switch's own bound state.
		if (!enabled && confirmingEnable) {
			confirmingEnable = false;
			return;
		}
		if (enabled && !settingsStore.claudeCode.privacyAcknowledged) {
			confirmingEnable = true;
			return;
		}
		settingsStore.updateClaudeCode({ enabled });
	}

	function confirmEnable(): void {
		settingsStore.updateClaudeCode({ enabled: true, privacyAcknowledged: true });
		confirmingEnable = false;
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Claude Code</h2>

	<div data-setting="enabled">
		<SettingItem
			label="Enable Claude Code"
			description="Off by default. When on, note content goes to Anthropic through your Claude Code account. Kokobrain runs your installed claude command and makes no network call itself."
		>
			<!-- The Switch binds `checked` internally: including `confirmingEnable` makes Cancel
			     change the prop (true -> false) so the switch resets to the real state. -->
			<Switch
				checked={settingsStore.claudeCode.enabled || confirmingEnable}
				onCheckedChange={setEnabled}
			/>
		</SettingItem>
	</div>

	{#if confirmingEnable}
		<div data-setting="consent" class="flex flex-col gap-2 rounded-lg px-4 py-3 bg-setting-item-bg" role="alertdialog" aria-label="Enable Claude Code">
			<p class="text-meta text-settings-text">
				Note content goes to Anthropic through your Claude Code account.
			</p>
			<p class="text-meta text-settings-text">
				The agent runs with full permissions: it can run any shell command and change any file you can write, without asking first.
			</p>
			<div class="flex justify-end gap-2">
				<Button variant="ghost" size="sm" onclick={() => (confirmingEnable = false)}>Cancel</Button>
				<Button size="sm" onclick={confirmEnable}>Enable</Button>
			</div>
		</div>
	{/if}

	<div data-setting="status">
		<SettingItem label="claude command" description={statusText}>
			<Button variant="outline" size="sm" disabled={checking} onclick={() => void check()}>
				Check again
			</Button>
		</SettingItem>
	</div>

	<div data-setting="binary-path">
		<SettingItem
			label="Path to claude"
			description="Leave empty to find it on your login shell PATH and in the usual install folders. When set, it must be an absolute path to an executable file named claude (~ is not expanded). The login shell environment is read when this section opens and on Check again."
			layout="stacked"
		>
			<Input
				value={settingsStore.claudeCode.binaryPath}
				oninput={(event) => settingsStore.updateClaudeCode({ binaryPath: (event.currentTarget as HTMLInputElement).value })}
				placeholder="/opt/homebrew/bin/claude"
				autocomplete="off"
				spellcheck={false}
			/>
		</SettingItem>
	</div>
</div>
