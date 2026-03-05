import type { SettingsSection } from './settings.types';

/** Whether the settings dialog is open */
let isOpen = $state(false);
/** Which section is currently selected in the sidebar */
let activeSection = $state<SettingsSection>('appearance');

/** Reactive store for the settings dialog UI state */
export const settingsDialogStore = {
	get isOpen() { return isOpen; },
	get activeSection() { return activeSection; },

	/** Opens the settings dialog, optionally jumping to a specific section */
	open(section?: SettingsSection) {
		activeSection = section ?? 'appearance';
		isOpen = true;
	},

	/** Closes the settings dialog */
	close() { isOpen = false; },

	/** Toggles the settings dialog */
	toggle() { isOpen = !isOpen; },

	/** Switches to a specific settings section */
	setSection(section: SettingsSection) { activeSection = section; },

	/** Resets all dialog state */
	reset() {
		isOpen = false;
		activeSection = 'appearance';
	},
};
