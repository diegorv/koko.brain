import type { AppSettings, PeriodicNotesUpdate, QuickNoteSettings, OneOnOneSettings, LayoutSettings, FolderNotesSettings, EditorSettings, TemplatesSettings, TerminalSettings, HistorySettings, SearchSettings, TodoistSettings, TagColorSettings } from './settings.types';
import type { AutoMoveSettings } from '$lib/features/auto-move/auto-move.types';
import type { AppearanceSettings } from './theme.types';
import { DEFAULT_APPEARANCE } from './theme.logic';

/** Fallback values used when no settings file exists or when it fails to parse */
export const DEFAULT_SETTINGS: AppSettings = {
	periodicNotes: {
		folder: '_notes',
		daily: {
			format: 'YYYY/MM-MMM/_[journal]-[day]-DD-MM-YYYY',
			template: '',
			templatePath: '_system/templates/Daily Note.md',
			autoOpen: true,
			autoPin: true,
		},
		weekly: {
			format: 'YYYY/MM-MMM/[__journal-week-]WW[-]YYYY',
			templatePath: '_system/templates/Weekly Note.md',
		},
		monthly: {
			format: 'YYYY/MM-MMM/MM-MMM',
			templatePath: '_system/templates/Monthly Note.md',
		},
		quarterly: {
			format: 'YYYY/[_journal-quarter-]YYYY[-Q]Q',
			templatePath: '_system/templates/Quarterly Note.md',
		},
		yearly: {
			format: 'YYYY/YYYY',
			templatePath: '_system/templates/Yearly Note.md',
		},
	},
	quickNote: {
		folderFormat: 'YYYY/MM-MMM',
		filenameFormat: '[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS',
		templatePath: '_system/templates/Quick Note.md',
	},
	oneOnOne: {
		peopleFolder: 'Personal/_people',
		workPeopleFolder: 'Work/_people',
		folderFormat: 'YYYY/MM-MMM',
		filenameFormat: '[-1on1-]{person}[-]DD-MM-YYYY',
		templatePath: '_system/templates/One on One.md',
	},
	layout: {
		rightSidebarVisible: false,
		calendarVisible: true,
		propertiesVisible: true,
		backlinksVisible: true,
		outgoingLinksVisible: true,
		tagsVisible: true,
		terminalVisible: false,
		leftPaneSize: 25,
		rightSidebarSize: 25,
		terminalPaneSize: 25,
	},
	folderNotes: {
		enabled: true,
	},
	editor: {
		fontFamily: 'iA Writer Duo S',
		fontSize: 18,
		lineHeight: 1.6,
		contentWidth: 0,
		paragraphSpacing: 0.05,
		headingTypography: {
			h1: { fontSize: 2.058, lineHeight: 1.4, fontWeight: 'bold', letterSpacing: -0.02 },
			h2: { fontSize: 1.618, lineHeight: 1.4, fontWeight: 'bold', letterSpacing: -0.015 },
			h3: { fontSize: 1.272, lineHeight: 1.4, fontWeight: 'bold', letterSpacing: -0.01 },
			h4: { fontSize: 1.0, lineHeight: 1.6, fontWeight: 'bold', letterSpacing: 0 },
			h5: { fontSize: 1.0, lineHeight: 1.6, fontWeight: 'bold', letterSpacing: 0 },
			h6: { fontSize: 1.0, lineHeight: 1.6, fontWeight: 'bold', letterSpacing: 0 },
		},
	},
	templates: {
		folder: '_system/templates',
	},
	appearance: DEFAULT_APPEARANCE,
	terminal: {
		fontFamily: '"FiraCode Nerd Font Mono", "Symbols Nerd Font Mono", monospace',
		fontSize: 15,
		lineHeight: 1,
		shell: '',
	},
	history: {
		enabled: true,
		retentionDays: 7,
		snapshotBackupEnabled: false,
	},
	search: {
		semanticSearchEnabled: false,
	},
	autoMove: {
		enabled: false,
		debounceMs: 3000,
	},
	todoist: {
		apiToken: '',
	},
	debugMode: false,
	debugModeTauri: false,
	debugLogToFile: false,
	debugTauriLogToFile: false,
	tagColors: {
		colors: {},
	},
};

let settings = $state<AppSettings>(structuredClone(DEFAULT_SETTINGS));

/** Reactive store for the app's persisted settings */
export const settingsStore = {
	get settings() { return settings; },
	get periodicNotes() { return settings.periodicNotes; },
	get quickNote() { return settings.quickNote; },
	get oneOnOne() { return settings.oneOnOne; },
	get layout() { return settings.layout; },
	get folderNotes() { return settings.folderNotes; },
	get editor() { return settings.editor; },
	get templates() { return settings.templates; },
	get appearance() { return settings.appearance; },
	get terminal() { return settings.terminal; },
	get history() { return settings.history; },
	get search() { return settings.search; },
	get autoMove() { return settings.autoMove; },
	get todoist() { return settings.todoist; },
	get debugMode() { return settings.debugMode; },
	get debugModeTauri() { return settings.debugModeTauri; },
	get debugLogToFile() { return settings.debugLogToFile; },
	get debugTauriLogToFile() { return settings.debugTauriLogToFile; },
	get tagColors() { return settings.tagColors; },

	/** Replaces the entire settings object (used on load) */
	setSettings(value: AppSettings) {
		settings = value;
	},

	/** Partially updates periodic notes settings, deep-merging nested period objects */
	updatePeriodicNotes(value: PeriodicNotesUpdate) {
		const current = settings.periodicNotes;
		settings = {
			...settings,
			periodicNotes: {
				...current,
				...value,
				daily: { ...current.daily, ...(value.daily ?? {}) },
				weekly: { ...current.weekly, ...(value.weekly ?? {}) },
				monthly: { ...current.monthly, ...(value.monthly ?? {}) },
				quarterly: { ...current.quarterly, ...(value.quarterly ?? {}) },
				yearly: { ...current.yearly, ...(value.yearly ?? {}) },
			},
		};
	},

	/** Partially updates quick note settings, merging with existing values */
	updateQuickNote(value: Partial<QuickNoteSettings>) {
		settings = {
			...settings,
			quickNote: { ...settings.quickNote, ...value },
		};
	},

	/** Partially updates 1:1 notes settings, merging with existing values */
	updateOneOnOne(value: Partial<OneOnOneSettings>) {
		settings = {
			...settings,
			oneOnOne: { ...settings.oneOnOne, ...value },
		};
	},

	/** Partially updates layout settings, merging with existing values */
	updateLayout(value: Partial<LayoutSettings>) {
		settings = {
			...settings,
			layout: { ...settings.layout, ...value },
		};
	},

	/** Partially updates folder notes settings, merging with existing values */
	updateFolderNotes(value: Partial<FolderNotesSettings>) {
		settings = {
			...settings,
			folderNotes: { ...settings.folderNotes, ...value },
		};
	},

	/** Partially updates editor settings, merging with existing values */
	updateEditor(value: Partial<EditorSettings>) {
		settings = {
			...settings,
			editor: { ...settings.editor, ...value },
		};
	},

	/** Partially updates templates settings, merging with existing values */
	updateTemplates(value: Partial<TemplatesSettings>) {
		settings = {
			...settings,
			templates: { ...settings.templates, ...value },
		};
	},

	/** Partially updates appearance settings, merging with existing values */
	updateAppearance(value: Partial<AppearanceSettings>) {
		settings = {
			...settings,
			appearance: { ...settings.appearance, ...value },
		};
	},

	/** Partially updates terminal settings, merging with existing values */
	updateTerminal(value: Partial<TerminalSettings>) {
		settings = {
			...settings,
			terminal: { ...settings.terminal, ...value },
		};
	},

	/** Partially updates file history settings, merging with existing values */
	updateHistory(value: Partial<HistorySettings>) {
		settings = {
			...settings,
			history: { ...settings.history, ...value },
		};
	},

	/** Partially updates search settings, merging with existing values */
	updateSearch(value: Partial<SearchSettings>) {
		settings = {
			...settings,
			search: { ...settings.search, ...value },
		};
	},

	/** Partially updates auto-move settings, merging with existing values */
	updateAutoMove(value: Partial<AutoMoveSettings>) {
		settings = {
			...settings,
			autoMove: { ...settings.autoMove, ...value },
		};
	},

	/** Partially updates Todoist settings, merging with existing values */
	updateTodoist(value: Partial<TodoistSettings>) {
		settings = {
			...settings,
			todoist: { ...settings.todoist, ...value },
		};
	},

	/** Updates the debug mode flag */
	updateDebugMode(value: boolean) {
		settings = { ...settings, debugMode: value };
	},

	/** Updates the Tauri debug mode flag */
	updateDebugModeTauri(value: boolean) {
		settings = { ...settings, debugModeTauri: value };
	},

	/** Updates the debug log-to-file flag */
	updateDebugLogToFile(value: boolean) {
		settings = { ...settings, debugLogToFile: value };
	},

	/** Updates the Tauri debug log-to-file flag */
	updateDebugTauriLogToFile(value: boolean) {
		settings = { ...settings, debugTauriLogToFile: value };
	},

	/** Partially updates tag color settings, merging with existing values */
	updateTagColors(value: Partial<TagColorSettings>) {
		settings = {
			...settings,
			tagColors: { ...settings.tagColors, ...value },
		};
	},

	/** Restores all settings to their defaults */
	reset() {
		settings = structuredClone(DEFAULT_SETTINGS);
	},
};
