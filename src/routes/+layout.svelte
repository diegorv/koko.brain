<script lang="ts">
	import '../app.css';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { searchStore } from '$lib/features/search/search.store.svelte';
	import { performSearch } from '$lib/features/search/search.service';
	import { registerGlobalKeybindings } from '$lib/core/keybindings/global-keybindings';
	import { initializeVault, teardownVault } from '$lib/core/app-lifecycle/app-lifecycle.service';
	import { registerMenuSettingsListener, registerCloseHandler } from '$lib/core/layout/tauri-listeners.service';
	import { registerDeepLinkListener } from '$lib/features/deep-link/deep-link.service';
	import { updateActiveTabLinks } from '$lib/core/app-lifecycle/active-tab-tracker.service';
	import { updateIndexesForFile } from '$lib/core/app-lifecycle/index-updater.service';
	import { isVirtualTab } from '$lib/core/editor/editor.logic';
	import { perfStart, perfEnd } from '$lib/utils/debug';
	import AppOverlays from '$lib/core/layout/AppOverlays.svelte';
	import AppShell from '$lib/core/layout/AppShell.svelte';

	let { children } = $props();

	// ── Global keybindings ──────────────────────────────────────────
	$effect(() => {
		return registerGlobalKeybindings();
	});

	// ── Tauri event listeners ───────────────────────────────────────
	$effect(() => {
		return registerMenuSettingsListener();
	});

	$effect(() => {
		return registerCloseHandler();
	});

	$effect(() => {
		return registerDeepLinkListener();
	});

	// ── Vault initialization / teardown ─────────────────────────────
	$effect(() => {
		const isOpen = vaultStore.isOpen;
		const path = vaultStore.path;

		untrack(() => {
			if (isOpen && path) {
				initializeVault(path).catch((err) => {
					console.error('Vault initialization failed:', err);
					toast.error('Vault initialization failed. Please try reopening the vault.');
				});
			} else {
				teardownVault();
			}
		});
	});

	// ── Active tab link tracking ────────────────────────────────────
	// Deferred 150ms so the CM document swap + decoration rebuild can paint
	// before the backlinks/outgoing-links computation runs on the main thread.
	$effect(() => {
		const path = editorStore.activeTabPath;
		const t0 = perfStart();

		const timer = setTimeout(() => {
			untrack(() => {
				const tab = editorStore.activeTab;
				if (path && tab && isVirtualTab(tab)) return;
				updateActiveTabLinks(path);
				perfEnd('LAYOUT', 'activeTabLinks:effect→callback', t0);
			});
		}, 150);

		return () => clearTimeout(timer);
	});

	// ── Debounced index updates on content change ───────────────────
	// Uses a 1s debounce so index updates don't block user input.
	// The previous 300ms was too aggressive — expensive O(V×n) backlinks/outgoing
	// scans could fire right when the user resumes typing after a brief pause.
	$effect(() => {
		const path = editorStore.activeTabPath;
		const content = editorStore.activeTabContent;
		if (!path || content === null) return;

		const isVirtual = untrack(() => {
			const tab = editorStore.activeTab;
			return tab && isVirtualTab(tab);
		});
		if (isVirtual) return;

		const timer = setTimeout(() => {
			untrack(() => updateIndexesForFile(path, content));
		}, 1000);

		return () => clearTimeout(timer);
	});

	// ── Debounced search ────────────────────────────────────────────
	$effect(() => {
		const query = searchStore.query;
		const _mode = searchStore.mode;
		const _fuzzy = searchStore.fuzzyEnabled;

		const timer = setTimeout(() => {
			untrack(() => performSearch());
		}, 200);

		return () => clearTimeout(timer);
	});
</script>

<AppOverlays />

<AppShell>
	{@render children()}
</AppShell>
