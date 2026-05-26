<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { searchStore } from '$lib/features/search/search.store.svelte';
	import { performSearch } from '$lib/features/search/search.service';
	import { registerGlobalKeybindings } from '$lib/core/keybindings/global-keybindings';
	import { initializeVault, teardownVault } from '$lib/core/app-lifecycle/app-lifecycle.service';
	import { autoOpenDailyNote } from '$lib/plugins/periodic-notes/periodic-notes.service';
	import { registerMenuSettingsListener, registerCloseHandler, registerFocusListener, registerVaultIndexUpdatedListener, registerSettingsChangedListener } from '$lib/core/layout/tauri-listeners.service';
	import { registerDeepLinkListener } from '$lib/features/deep-link/deep-link.service';
	import { maybeAutoCheckForUpdates } from '$lib/core/settings/update-check.service';
	import { fetchBacklinksV2 } from '$lib/features/backlinks/backlinks.service';
	import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
	import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
	import { updateIndexesForFile } from '$lib/core/app-lifecycle/index-updater.service';
	import { isVirtualTab } from '$lib/core/editor/editor.logic';
	import { debug, perfStart, perfEnd, perfBaseline } from '$lib/utils/debug';
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

	$effect(() => {
		return registerFocusListener();
	});

	$effect(() => {
		return registerVaultIndexUpdatedListener();
	});

	$effect(() => {
		return registerSettingsChangedListener();
	});

	// ── Vault initialization / teardown ─────────────────────────────
	$effect(() => {
		const isOpen = vaultStore.isOpen;
		const path = vaultStore.path;

		untrack(() => {
			if (isOpen && path) {
				initializeVault(path)
					.then(() => {
						// Defer the daily-note open until initializeVault has returned
						// and the browser has had a chance to paint the UI. If we run
						// it synchronously with the sync index builds, the auto-open's
						// `exists()` / `readTextFile` microtasks get starved behind
						// buildTagIndex / buildPropertyIndex / Svelte initial mount,
						// adding ~2 s of perceived startup delay for a file IO that
						// costs <20 ms on its own.
						setTimeout(() => {
							autoOpenDailyNote().catch((err) => {
								console.error('autoOpenDailyNote failed:', err);
							});
						}, 0);
						// Background update check. Internally throttled to once per
						// 24h and gated by `settings.updates.autoCheck`, so a cold
						// start is otherwise a no-op. Settings have to be loaded
						// already (initializeVault calls loadSettings) for the
						// auto-check policy to be readable.
						maybeAutoCheckForUpdates().catch((err) => {
							console.error('maybeAutoCheckForUpdates failed:', err);
						});
					})
					.catch((err) => {
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
	// before the backlinks computation runs on the main thread.
	//
	// Linked mentions come from `fetchBacklinksV2` (Rust `VaultIndex` via
	// `invoke('get_backlinks_v2')`); outgoing links + unlinked mentions are
	// driven by `OutgoingLinksPanel.svelte`'s `$effect` on
	// `(activeTabPath, vaultIndexVersion)` and `BacklinksPanel.svelte`'s
	// `unlinkedDirty` watcher — so this effect only needs to fan
	// fetchBacklinksV2 + markUnlinkedDirty for the immediate tab-switch
	// path. Cold-start guard: if the vault is open but the Rust index hasn't
	// emitted its first `vault-index-updated` yet (vaultIndexVersion === 0),
	// skip the fetch — calling it would just write an empty array and
	// briefly flash the panel.
	$effect(() => {
		const path = editorStore.activeTabPath;
		const t0 = perfStart();
		debug('LAYOUT', `activeTabPath changed → scheduling 150ms refresh for: ${path}`);

		const timer = setTimeout(() => {
			untrack(() => {
				const tab = editorStore.activeTab;
				if (path && tab && isVirtualTab(tab)) {
					perfEnd('LAYOUT', 'activeTabLinks:effect→callback(150ms debounce+work)', t0);
					return;
				}
				if (path && vaultStore.isOpen && vaultStore.vaultIndexVersion === 0) {
					perfEnd('LAYOUT', 'activeTabLinks:effect→callback(150ms debounce+work)', t0);
					return;
				}
				if (!path) {
					backlinksStore.setLinkedMentions([]);
					backlinksStore.setUnlinkedMentions([]);
					outgoingLinksStore.reset();
					perfEnd('LAYOUT', 'activeTabLinks:effect→callback(150ms debounce+work)', t0);
					return;
				}
				const tWork = perfStart();
				fetchBacklinksV2(path)
					.catch((err) => console.error('updateActiveTabLinks failed:', err))
					.finally(() => {
						backlinksStore.markUnlinkedDirty();
						perfEnd('ACTIVE-TAB', 'updateActiveTabLinks', tWork);
						perfBaseline('updateActiveTabLinks', tWork);
						perfEnd('LAYOUT', 'activeTabLinks:effect→callback(150ms debounce+work)', t0);
					});
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

		const tEffect = perfStart();
		const timer = setTimeout(() => {
			untrack(() => {
				perfEnd('LAYOUT', 'contentEffect→updateIndexesForFile(1000ms debounce)', tEffect);
				updateIndexesForFile(path, content);
			});
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
