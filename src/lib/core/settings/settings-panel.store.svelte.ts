import type { SettingsSection } from './settings.types';

let isOpen = $state(false);
let activeSection = $state<SettingsSection>('appearance');

/** Reactive store for the in-app settings panel (open/close + active section). */
export const settingsPanelStore = {
	get isOpen() { return isOpen; },
	get activeSection() { return activeSection; },

	open(section?: SettingsSection) {
		activeSection = section ?? activeSection;
		isOpen = true;
	},
	close() { isOpen = false; },
	toggle() { isOpen = !isOpen; },
	setSection(section: SettingsSection) { activeSection = section; },

	/** @internal test-only */
	_reset() {
		isOpen = false;
		activeSection = 'appearance';
	},
};
