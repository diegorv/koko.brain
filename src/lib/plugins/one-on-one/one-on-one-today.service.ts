import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import MyPeopleSection from './MyPeopleSection.svelte';

/** The Today section id of My people */
export const MY_PEOPLE_SECTION_ID = 'my-people';

/**
 * Adds My people to the rail shell's Today lens, which may not import plugins
 * (ADR 0003). Returns its unregister function; `initializeVault` registers it
 * and `teardownVault` unregisters it.
 */
export function registerOneOnOneTodaySection(): () => void {
	return railRegistryStore.registerTodaySection({
		id: MY_PEOPLE_SECTION_ID,
		label: 'My people',
		component: MyPeopleSection,
	});
}
