/** Supported periodic note types */
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** Shared configuration for a single periodic note type */
export interface PeriodicNoteTypeSettings {
	/** dayjs format string for the note path (e.g. "YYYY/MM-MMM/_journal-day-DD-MM-YYYY") */
	format: string;
	/** Path to a template file relative to vault (e.g. "_templates/Weekly Note.md") */
	templatePath?: string;
}

/** Configuration for the periodic notes plugin */
export interface PeriodicNotesSettings {
	/** Base folder inside the vault where periodic notes are created (empty = vault root) */
	folder: string;
	/** Daily note settings (includes inline template and auto-open behaviour) */
	daily: PeriodicNoteTypeSettings & {
		/** Inline template fallback for daily notes */
		template: string;
		/** Whether to auto-open today's daily note when the vault loads */
		autoOpen?: boolean;
		/** Whether to auto-pin the daily note tab (requires autoOpen) */
		autoPin?: boolean;
	};
	/** Weekly note settings */
	weekly: PeriodicNoteTypeSettings;
	/** Monthly note settings */
	monthly: PeriodicNoteTypeSettings;
	/** Quarterly note settings */
	quarterly: PeriodicNoteTypeSettings;
	/** Yearly note settings */
	yearly: PeriodicNoteTypeSettings;
}

/** Deep-partial variant of PeriodicNotesSettings — nested period objects accept partial fields */
export interface PeriodicNotesUpdate {
	folder?: string;
	daily?: Partial<PeriodicNotesSettings['daily']>;
	weekly?: Partial<PeriodicNoteTypeSettings>;
	monthly?: Partial<PeriodicNoteTypeSettings>;
	quarterly?: Partial<PeriodicNoteTypeSettings>;
	yearly?: Partial<PeriodicNoteTypeSettings>;
}

/** Configuration for layout visibility preferences */
export interface LayoutSettings {
	/** Whether the right sidebar (Properties, Backlinks, Tags, etc.) is visible */
	rightSidebarVisible: boolean;
	/** Whether the calendar panel is shown in the right sidebar */
	calendarVisible: boolean;
	/** Whether the properties panel is shown in the right sidebar */
	propertiesVisible: boolean;
	/** Whether the backlinks panel is shown in the right sidebar */
	backlinksVisible: boolean;
	/** Whether the outgoing links panel is shown in the right sidebar */
	outgoingLinksVisible: boolean;
	/** Whether the tags panel is shown in the right sidebar */
	tagsVisible: boolean;
	/** Whether the terminal sidebar pane is visible */
	terminalVisible: boolean;
	/** Saved width percentage of the left sidebar pane (file explorer / search) */
	leftPaneSize: number;
	/** Saved width percentage of the right sidebar pane */
	rightSidebarSize: number;
	/** Saved width percentage of the terminal pane */
	terminalPaneSize: number;
}

/** Configuration for the folder notes feature */
export interface FolderNotesSettings {
	/** Whether clicking a folder also opens its matching folder note */
	enabled: boolean;
}

/** Font weight options for headings */
export type HeadingFontWeight = 'bold' | 'semibold' | 'normal';

/** Typography settings for a single heading level */
export interface HeadingLevelSettings {
	/** Font size relative to base, in em (0.5–5.0) */
	fontSize: number;
	/** Line height multiplier (1.0–3.0) */
	lineHeight: number;
	/** Font weight */
	fontWeight: HeadingFontWeight;
	/** Letter spacing in em (-0.1 to 0.1) */
	letterSpacing: number;
}

/** Typography configuration for all heading levels (h1–h6) */
export interface HeadingTypography {
	h1: HeadingLevelSettings;
	h2: HeadingLevelSettings;
	h3: HeadingLevelSettings;
	h4: HeadingLevelSettings;
	h5: HeadingLevelSettings;
	h6: HeadingLevelSettings;
}

/** Configuration for the markdown editor appearance */
export interface EditorSettings {
	/** Font family stack for the editor (CSS font-family value) */
	fontFamily: string;
	/** Font size in pixels */
	fontSize: number;
	/** Line height multiplier */
	lineHeight: number;
	/** Maximum content width in pixels (0 = no limit) */
	contentWidth: number;
	/** Extra vertical spacing added after each paragraph line, in em (0 = none) */
	paragraphSpacing: number;
	/** Typography settings for heading levels h1–h6 */
	headingTypography: HeadingTypography;
}

/** Configuration for the templates plugin */
export interface TemplatesSettings {
	/** Folder name (relative to vault root) where templates are stored */
	folder: string;
}

/** Configuration for the 1:1 notes plugin */
export interface OneOnOneSettings {
	/** Folder name (relative to vault root) where personal people files are stored */
	peopleFolder: string;
	/** Folder name (relative to vault root) where work people files are stored */
	workPeopleFolder: string;
	/** dayjs format for the subfolder path (e.g. "YYYY/MM-MMM") */
	folderFormat: string;
	/** dayjs format for the filename, with {person} placeholder (e.g. "[-1on1-]{person}[-]DD-MM-YYYY") */
	filenameFormat: string;
	/** Path to template file relative to vault (e.g. "_templates/One on One.md") */
	templatePath?: string;
}

/** Configuration for the quick note plugin */
export interface QuickNoteSettings {
	/** dayjs format for the subfolder path (e.g. "YYYY/MM-MMM") */
	folderFormat: string;
	/** dayjs format for the filename (e.g. "[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS") */
	filenameFormat: string;
	/** Path to template file relative to vault (e.g. "_templates/Quick Note.md") */
	templatePath?: string;
}

/** Configuration for the terminal plugin */
export interface TerminalSettings {
	/** Font family for the terminal (CSS font-family value) */
	fontFamily: string;
	/** Font size in pixels (8–24) */
	fontSize: number;
	/** Line height multiplier (1.0–2.0) */
	lineHeight: number;
	/** Shell executable path (empty string = system default from $SHELL) */
	shell: string;
}

/** Configuration for the file history feature */
export interface HistorySettings {
	/** Whether automatic snapshots are enabled */
	enabled: boolean;
	/** Number of days to keep all snapshots before applying thinning policy */
	retentionDays: number;
	/** Whether snapshots are also saved as plain .md files in .kokobrain/snapshots-backup/ */
	snapshotBackupEnabled: boolean;
}

/** Configuration for the search feature */
export interface SearchSettings {
	/** Whether semantic (AI-powered) search is enabled — downloads ~118MB model */
	semanticSearchEnabled: boolean;
}

/** Configuration for the Todoist integration */
export interface TodoistSettings {
	/** Todoist personal API token (from Settings → Integrations → Developer) */
	apiToken: string;
}

/** Configuration for tag color assignments */
export interface TagColorSettings {
	/** Map of lowercase tag path to hex color (e.g., { "work": "#fb464c", "personal/health": "#44cf6e" }) */
	colors: Record<string, string>;
}

/** Configuration for LAN sync between devices */
export interface SyncSettings {
	/** Whether LAN sync is enabled */
	enabled: boolean;
	/** TCP port for the sync server (default: 39782) */
	port: number;
	/** Interval in minutes between automatic sync cycles (default: 5) */
	intervalMinutes: number;
}

/** Sidebar navigation sections in the settings dialog */
export type SettingsSection = 'appearance' | 'sidebar' | 'editor' | 'periodic-notes' | 'quick-note' | 'one-on-one' | 'templates' | 'terminal' | 'search' | 'file-history' | 'auto-move' | 'trash' | 'todoist' | 'sync' | 'security' | 'troubleshooting';

/** Top-level settings object persisted as `.kokobrain/settings.json` inside the vault */
export interface AppSettings {
	periodicNotes: PeriodicNotesSettings;
	quickNote: QuickNoteSettings;
	oneOnOne: OneOnOneSettings;
	layout: LayoutSettings;
	folderNotes: FolderNotesSettings;
	editor: EditorSettings;
	templates: TemplatesSettings;
	appearance: import('./theme.types').AppearanceSettings;
	/** Terminal plugin configuration */
	terminal: TerminalSettings;
	/** File history feature configuration */
	history: HistorySettings;
	/** Search feature configuration */
	search: SearchSettings;
	/** Todoist integration configuration */
	todoist: TodoistSettings;
	/** Auto-move feature configuration */
	autoMove: import('$lib/features/auto-move/auto-move.types').AutoMoveSettings;
	/** LAN sync configuration */
	sync: SyncSettings;
	/** Whether debug messages are logged to the browser console */
	debugMode: boolean;
	/** Whether Rust backend debug logs are forwarded to browser devtools */
	debugModeTauri: boolean;
	/** Whether frontend debug logs are also written to a file in .kokobrain/logs/ */
	debugLogToFile: boolean;
	/** Whether Tauri backend debug logs are also written to a file in .kokobrain/logs/ */
	debugTauriLogToFile: boolean;
	/** Tag color assignments (persisted per-vault) */
	tagColors: TagColorSettings;
}
