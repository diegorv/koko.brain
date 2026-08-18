import type { AppSettings, PeriodicNotesUpdate, QuickCaptureUpdate, OneOnOneSettings, LayoutSettings, FolderNotesSettings, EditorSettings, TemplatesSettings, HistorySettings, SearchSettings, TodoistSettings, TagColorSettings, QueryjsSettings, UpdateSettings, KeybindingsSettings } from './settings.types';
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
			templatePath: '_system/templates/periodic-note/Daily-Note.md',
			autoOpen: true,
			autoPin: true,
		},
		weekly: {
			format: 'YYYY/MM-MMM/[__journal-week-]WW[-]YYYY',
			templatePath: '_system/templates/periodic-note/Weekly-Note.md',
		},
		monthly: {
			format: 'YYYY/MM-MMM/MM-MMM',
			templatePath: '_system/templates/periodic-note/Monthly-Note.md',
		},
		quarterly: {
			format: 'YYYY/[_journal-quarter-]YYYY[-Q]Q',
			templatePath: '_system/templates/periodic-note/Quarterly-Note.md',
		},
		yearly: {
			format: 'YYYY/YYYY',
			templatePath: '_system/templates/periodic-note/Yearly-Note.md',
		},
	},
	quickCapture: {
		folderFormat: 'YYYY/MM-MMM',
		filenameFormat: '[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS',
		templates: {
			note: '_system/templates/quick-capture/Composer-Note.md',
			clip: '_system/templates/quick-capture/Clip-Note.md',
			link: '_system/templates/quick-capture/Link-Note.md',
			shot: '_system/templates/quick-capture/Shot-Note.md',
			file: '_system/templates/quick-capture/File-Note.md',
		},
	},
	oneOnOne: {
		peopleFolder: 'Personal/_people',
		workPeopleFolder: 'Work/_people',
		folderFormat: 'YYYY/MM-MMM',
		filenameFormat: '[-1on1-]{person}[-]DD-MM-YYYY',
		templatePath: '_system/templates/periodic-note/One-On-One.md',
	},
	layout: {
		sidebarMode: 'types',
		leftSidebarVisible: true,
		rightSidebarVisible: false,
		propertiesVisible: true,
		backlinksVisible: true,
		outgoingLinksVisible: true,
		tableOfContentsVisible: true,
		leftPaneSize: 25,
		middlePanelSize: 20,
		rightSidebarSize: 25,
	},
	folderNotes: {
		enabled: true,
	},
	keybindings: {
		cycleSidebarView: { key: 'e', meta: true, shift: true, alt: false, ctrl: false },
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
		systemFolder: '_system',
	},
	appearance: DEFAULT_APPEARANCE,
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
		defaultLabel: '',
	},
	debugMode: false,
	debugModeTauri: false,
	debugLogToFile: false,
	debugTauriLogToFile: false,
	debugHeartbeat: false,
	livePreviewProfiling: false,
	disabledDecorators: {},
	tagColors: {
		colors: {},
	},
	queryjs: {
		autoRunQueries: 'first-open',
	},
	updates: {
		channel: 'stable',
		autoCheck: false,
		lastCheckedAt: null,
	},
	explicitOrganization: false,
	showUntypedNotes: false,
	typesBaseFolder: '',
	dockBadgeInboxCount: true,
};

let settings = $state<AppSettings>(structuredClone(DEFAULT_SETTINGS));

/** Reactive store for the app's persisted settings */
export const settingsStore = {
	get settings() { return settings; },
	get periodicNotes() { return settings.periodicNotes; },
	get quickCapture() { return settings.quickCapture; },
	get oneOnOne() { return settings.oneOnOne; },
	get layout() { return settings.layout; },
	get folderNotes() { return settings.folderNotes; },
	get keybindings() { return settings.keybindings; },
	get editor() { return settings.editor; },
	get templates() { return settings.templates; },
	get appearance() { return settings.appearance; },
	get history() { return settings.history; },
	get search() { return settings.search; },
	get autoMove() { return settings.autoMove; },
	get todoist() { return settings.todoist; },
	get debugMode() { return settings.debugMode; },
	get debugModeTauri() { return settings.debugModeTauri; },
	get debugLogToFile() { return settings.debugLogToFile; },
	get debugTauriLogToFile() { return settings.debugTauriLogToFile; },
	get debugHeartbeat() { return settings.debugHeartbeat; },
	get livePreviewProfiling() { return settings.livePreviewProfiling; },
	get disabledDecorators() { return settings.disabledDecorators; },
	get tagColors() { return settings.tagColors; },
	get queryjs() { return settings.queryjs; },
	get updates() { return settings.updates; },
	get explicitOrganization() { return settings.explicitOrganization; },
	get showUntypedNotes() { return settings.showUntypedNotes; },
	get typesBaseFolder() { return settings.typesBaseFolder; },
	get dockBadgeInboxCount() { return settings.dockBadgeInboxCount; },

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

	/**
	 * Partially updates Quick Capture settings, merging with existing
	 * values. Templates are merged shallowly so a partial update of just
	 * `templates.note` does not wipe the other four kinds.
	 */
	updateQuickCapture(value: QuickCaptureUpdate) {
		const current = settings.quickCapture;
		settings = {
			...settings,
			quickCapture: {
				...current,
				...value,
				templates: { ...current.templates, ...(value.templates ?? {}) },
			},
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

	/**
	 * Partially updates customizable keyboard shortcuts, merging with existing
	 * values. Each shortcut is replaced wholesale (a full KeybindingConfig).
	 */
	updateKeybindings(value: Partial<KeybindingsSettings>) {
		settings = {
			...settings,
			keybindings: { ...settings.keybindings, ...value },
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

	/** Updates the heartbeat debug flag (250 ms `[HB] alive` ticks while logging) */
	updateDebugHeartbeat(value: boolean) {
		settings = { ...settings, debugHeartbeat: value };
	},

	/** Updates the live preview profiling flag */
	updateLivePreviewProfiling(value: boolean) {
		settings = { ...settings, livePreviewProfiling: value };
	},

	/** Toggles a specific live preview decorator on/off */
	toggleDecorator(name: string, disabled: boolean) {
		const updated = { ...settings.disabledDecorators, [name]: disabled };
		settings = { ...settings, disabledDecorators: updated };
	},

	/** Partially updates tag color settings, merging with existing values */
	updateTagColors(value: Partial<TagColorSettings>) {
		settings = {
			...settings,
			tagColors: { ...settings.tagColors, ...value },
		};
	},

	/** Partially updates QueryJS plugin settings, merging with existing values */
	updateQueryjs(value: Partial<QueryjsSettings>) {
		settings = {
			...settings,
			queryjs: { ...settings.queryjs, ...value },
		};
	},

	/**
	 * Partially updates the auto-updater settings (channel / autoCheck /
	 * lastCheckedAt), shallow-merging with the existing values.
	 */
	updateUpdates(value: Partial<UpdateSettings>) {
		settings = {
			...settings,
			updates: { ...settings.updates, ...value },
		};
	},

	/** Restores all settings to their defaults */
	reset() {
		settings = structuredClone(DEFAULT_SETTINGS);
	},
};
