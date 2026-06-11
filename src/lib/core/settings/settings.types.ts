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
/** Left sidebar mode: file explorer (default) or type-grouped view (Portent) */
export type SidebarMode = 'files' | 'types' | 'calendar';

export interface LayoutSettings {
	/** Left sidebar mode: file explorer or type-grouped */
	sidebarMode: SidebarMode;
	/** Whether the left sidebar is visible */
	leftSidebarVisible: boolean;
	/** Whether the right sidebar (Properties, Backlinks, Tags, etc.) is visible */
	rightSidebarVisible: boolean;
	/** Whether the properties panel is shown in the right sidebar */
	propertiesVisible: boolean;
	/** Whether the backlinks panel is shown in the right sidebar */
	backlinksVisible: boolean;
	/** Whether the outgoing links panel is shown in the right sidebar */
	outgoingLinksVisible: boolean;
	/** Whether the tags panel is shown in the right sidebar */
	tagsVisible: boolean;
	/** Whether the table of contents panel is shown in the right sidebar */
	tableOfContentsVisible: boolean;
	/** Saved width percentage of the left sidebar pane (file explorer / search) */
	leftPaneSize: number;
	/** Saved width percentage of the middle panel (type note list, types mode only) */
	middlePanelSize: number;
	/** Saved width percentage of the right sidebar pane */
	rightSidebarSize: number;
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
	/**
	 * Vault-relative folder that holds system/template files which should be
	 * excluded from the type sidebar (note list, nav counts, inbox dock badge).
	 * Empty string disables the exclusion. Defaults to `_system`.
	 */
	systemFolder: string;
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

/**
 * Per-kind template paths for the Quick Capture composer + clipboard
 * shortcut. Each kind picks its own template; an empty string means
 * "no template — just write the rendered body".
 */
export interface QuickCaptureTemplates {
	note: string;
	clip: string;
	link: string;
	shot: string;
	file: string;
}

/** Configuration for the Quick Capture surface (composer popover + clipboard shortcut) */
export interface QuickCaptureSettings {
	/** dayjs format for the subfolder path (e.g. "YYYY/MM-MMM") */
	folderFormat: string;
	/** dayjs format for the filename (e.g. "[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS") */
	filenameFormat: string;
	/** Template file paths relative to vault root, keyed by capture kind */
	templates: QuickCaptureTemplates;
}

/** Partial Quick Capture update — `templates` accepts a per-kind subset */
export interface QuickCaptureUpdate {
	folderFormat?: string;
	filenameFormat?: string;
	templates?: Partial<QuickCaptureTemplates>;
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

/** Policy for QueryJS block execution — controls when `kb.pages()`/`dv.view()` blocks run */
export type AutoRunQueriesPolicy =
	| 'first-open' // execute the first time the file is opened in this session, then cache for the session
	| 'always' // execute on every render (legacy behaviour — slower, fresher results)
	| 'manual'; // never auto-execute — user clicks ▶ Run on each block

/** Configuration for the QueryJS scripting plugin */
export interface QueryjsSettings {
	/** When QueryJS blocks should auto-execute. Default 'first-open'. */
	autoRunQueries: AutoRunQueriesPolicy;
}

/**
 * Release channel the in-app auto-updater follows.
 *
 * - `'stable'` → tag-driven builds from `.github/workflows/release.yml`.
 * - `'nightly'` → push-to-main builds from `.github/workflows/nightly.yml`.
 *
 * The channel chosen here is independent of the channel the build itself
 * belongs to (see `__APP_CHANNEL__`). A nightly build can follow the
 * stable channel and vice versa, but switching from nightly to stable
 * does not automatically downgrade the user — nightly versions are
 * semver-greater than the same-base stable versions, so the auto-updater
 * will never offer a "downgrade". Manual reinstall is required.
 */
export type ReleaseChannel = 'stable' | 'nightly';

/** Configuration for the in-app auto-updater */
export interface UpdateSettings {
	/**
	 * Which release channel the auto-updater should check.
	 *
	 * Defaults to the channel the current build belongs to on first launch
	 * (so a freshly installed nightly DMG starts on the nightly channel,
	 * a freshly installed stable DMG starts on stable). Persists across
	 * restarts.
	 */
	channel: ReleaseChannel;
	/**
	 * Whether the app should silently check for updates when the vault
	 * opens. Off by default — the first check should be a user-initiated
	 * action so the app does not phone home on every cold start without
	 * consent. When enabled, fires once per vault open (no throttle —
	 * the cost is one HTTP request per launch to a public GitHub CDN
	 * object, and a Nightly user publishing several builds per day
	 * expects the toggle to actually fire on every launch).
	 */
	autoCheck: boolean;
	/**
	 * Unix milliseconds timestamp of the last update check, manual or
	 * automatic. `null` means the user has never checked. Drives the
	 * "Last checked X ago" row in the Update section. Does NOT gate the
	 * launch-time auto-check — every vault open re-checks when
	 * `autoCheck` is on.
	 */
	lastCheckedAt: number | null;
}

/**
 * A serializable keyboard shortcut (modifiers + a single key, no handler).
 * Backs user-customizable global shortcuts persisted in settings. The `key`
 * is matched case-insensitively against `KeyboardEvent.key`.
 */
export interface KeybindingConfig {
	/** Primary key, matched case-insensitively against `KeyboardEvent.key` (e.g. "e") */
	key: string;
	/** Requires the Cmd/Meta key */
	meta: boolean;
	/** Requires the Shift key */
	shift: boolean;
	/** Requires the Alt/Option key */
	alt: boolean;
	/** Requires the Ctrl key */
	ctrl: boolean;
}

/** User-customizable global keyboard shortcuts persisted in settings */
export interface KeybindingsSettings {
	/** Shortcut that cycles the left sidebar view (Files -> Types -> Calendar) */
	cycleSidebarView: KeybindingConfig;
}

/** Sidebar navigation sections in the settings dialog */
export type SettingsSection = 'appearance' | 'sidebar' | 'editor' | 'keybindings' | 'periodic-notes' | 'quick-capture' | 'one-on-one' | 'templates' | 'search' | 'file-history' | 'auto-move' | 'trash' | 'todoist' | 'queryjs' | 'types' | 'troubleshooting' | 'update';

/** Top-level settings object persisted as `.kokobrain/settings.json` inside the vault */
export interface AppSettings {
	periodicNotes: PeriodicNotesSettings;
	quickCapture: QuickCaptureSettings;
	oneOnOne: OneOnOneSettings;
	layout: LayoutSettings;
	folderNotes: FolderNotesSettings;
	editor: EditorSettings;
	/** User-customizable global keyboard shortcuts */
	keybindings: KeybindingsSettings;
	templates: TemplatesSettings;
	appearance: import('./theme.types').AppearanceSettings;
	/** File history feature configuration */
	history: HistorySettings;
	/** Search feature configuration */
	search: SearchSettings;
	/** Todoist integration configuration */
	todoist: TodoistSettings;
	/** Auto-move feature configuration */
	autoMove: import('$lib/features/auto-move/auto-move.types').AutoMoveSettings;
	/** Whether debug messages are logged to the browser console */
	debugMode: boolean;
	/** Whether Rust backend debug logs are forwarded to browser devtools */
	debugModeTauri: boolean;
	/** Whether frontend debug logs are also written to a file in .kokobrain/logs/ */
	debugLogToFile: boolean;
	/** Whether Tauri backend debug logs are also written to a file in .kokobrain/logs/ */
	debugTauriLogToFile: boolean;
	/**
	 * Whether the log heartbeat ticks every 250 ms ([HB] alive lines). Used only when
	 * investigating UI freezes — a missing tick pinpoints the wall-clock window the
	 * JS event loop was stuck. Off by default; turn on alongside `debugLogToFile`
	 * when reproducing a stall. No effect unless a log session is active.
	 */
	debugHeartbeat: boolean;
	/** Whether live preview decoration plugin timing is logged (LP-PROFILE entries) */
	livePreviewProfiling: boolean;
	/** Live preview decorators that are disabled (keyed by decorator name) */
	disabledDecorators: Record<string, boolean>;
	/** Tag color assignments (persisted per-vault) */
	tagColors: TagColorSettings;
	/** QueryJS plugin configuration (execution policy, …) */
	queryjs: QueryjsSettings;
	/** In-app auto-updater configuration (channel selection, …) */
	updates: UpdateSettings;
	/** Whether new notes start unorganized and require explicit organization (Portent inbox workflow) */
	explicitOrganization: boolean;
	/** Whether to show notes without a type in the type sidebar */
	showUntypedNotes: boolean;
	/** Whether the inbox count is shown as a red badge on the macOS dock icon */
	dockBadgeInboxCount: boolean;
}
