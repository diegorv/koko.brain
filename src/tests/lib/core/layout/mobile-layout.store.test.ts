import { describe, it, expect, beforeEach } from 'vitest';
import { mobileLayoutStore } from '$lib/core/layout/mobile-layout.store.svelte';

describe('mobileLayoutStore', () => {
	beforeEach(() => {
		mobileLayoutStore._reset();
	});

	it('starts with the drawer closed', () => {
		expect(mobileLayoutStore.drawerOpen).toBe(false);
	});

	it('openDrawer shows the drawer and is idempotent', () => {
		mobileLayoutStore.openDrawer();
		expect(mobileLayoutStore.drawerOpen).toBe(true);
		mobileLayoutStore.openDrawer();
		expect(mobileLayoutStore.drawerOpen).toBe(true);
	});

	it('closeDrawer hides the drawer and is a no-op when already closed', () => {
		mobileLayoutStore.closeDrawer();
		expect(mobileLayoutStore.drawerOpen).toBe(false);
		mobileLayoutStore.openDrawer();
		mobileLayoutStore.closeDrawer();
		expect(mobileLayoutStore.drawerOpen).toBe(false);
	});

	it('toggleDrawer flips the state each call', () => {
		mobileLayoutStore.toggleDrawer();
		expect(mobileLayoutStore.drawerOpen).toBe(true);
		mobileLayoutStore.toggleDrawer();
		expect(mobileLayoutStore.drawerOpen).toBe(false);
	});

	it('_reset returns to the closed launch state', () => {
		mobileLayoutStore.openDrawer();
		mobileLayoutStore._reset();
		expect(mobileLayoutStore.drawerOpen).toBe(false);
	});
});
