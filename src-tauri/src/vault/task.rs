//! Task data types and IPC structs for the Tasks/Tags Phase 7 work.
//!
//! Mirrors the TS interfaces in
//! `src/lib/features/tasks/{tasks.types.ts, task-metadata.types.ts}` exactly.
//! Field names are camelCase over IPC; enum variants use kebab-case to match
//! the TS string-literal unions (`'in-progress'`, `'highest'`, etc.).
//!
//! `Task` is parsed at `NoteEntry::from_content` time via
//! `vault::parsing::extract_tasks` and stored on each entry. `TagAggregate`
//! and `FileTaskGroup` are projection types returned by `VaultIndex` lookup
//! methods (`lookup_all_tags`, `lookup_all_tasks`).

use serde::{Deserialize, Serialize};

/// One task list item parsed from a note's body.
///
/// Mirrors `tasks.types.ts::TaskItem`. `line_number` is 1-based to match
/// the TS contract used by `toggleTask(filePath, lineNumber)`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Task {
	/// Raw task text (without the `- [ ] ` prefix).
	pub text: String,
	/// Whether the checkbox is checked (i.e. status is anything other than `todo`).
	pub checked: bool,
	/// Indent level: tabs + (spaces / 2). Mirrors `calculateIndent`.
	pub indent: usize,
	/// 1-based line number within the source file.
	pub line_number: usize,
	/// Parsed status from the checkbox character.
	pub status: TaskStatus,
	/// Structured metadata extracted from emoji signifiers in `text`.
	pub metadata: TaskMetadata,
}

/// Task status parsed from the checkbox character. Mirrors
/// `task-metadata.types.ts::TaskStatus` with kebab-case JSON values.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TaskStatus {
	Todo,
	Done,
	Cancelled,
	InProgress,
	Question,
	Forwarded,
	Important,
}

impl Default for TaskStatus {
	fn default() -> Self {
		TaskStatus::Todo
	}
}

/// Task priority parsed from emoji signifiers (🔺/⏫/🔼/🔽/⏬). Mirrors
/// `task-metadata.types.ts::TaskPriority` — note `'none'` is a valid value.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TaskPriority {
	Highest,
	High,
	Medium,
	None,
	Low,
	Lowest,
}

/// Recurrence rule extracted from the 🔁 signifier. The `text` field carries
/// the raw recurrence text verbatim (e.g. `"every week"`, `"every 3 days"`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RecurrenceRule {
	pub text: String,
}

/// Structured metadata extracted from a task's raw text. Mirrors
/// `task-metadata.types.ts::TaskMetadata` exactly — every field is optional
/// except `description` and `tags` (which always serialize, possibly empty).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TaskMetadata {
	/// Clean task text with all signifiers stripped.
	pub description: String,
	/// Due date in YYYY-MM-DD format (📅).
	#[serde(skip_serializing_if = "Option::is_none", default)]
	pub due_date: Option<String>,
	/// Scheduled date (⏳).
	#[serde(skip_serializing_if = "Option::is_none", default)]
	pub scheduled_date: Option<String>,
	/// Start date (🛫).
	#[serde(skip_serializing_if = "Option::is_none", default)]
	pub start_date: Option<String>,
	/// Created date (➕).
	#[serde(skip_serializing_if = "Option::is_none", default)]
	pub created_date: Option<String>,
	/// Done date (✅).
	#[serde(skip_serializing_if = "Option::is_none", default)]
	pub done_date: Option<String>,
	/// Cancelled date (❌).
	#[serde(skip_serializing_if = "Option::is_none", default)]
	pub cancelled_date: Option<String>,
	/// Priority level.
	#[serde(skip_serializing_if = "Option::is_none", default)]
	pub priority: Option<TaskPriority>,
	/// Recurrence rule (🔁).
	#[serde(skip_serializing_if = "Option::is_none", default)]
	pub recurrence: Option<RecurrenceRule>,
	/// Task ID (🆔).
	#[serde(skip_serializing_if = "Option::is_none", default)]
	pub id: Option<String>,
	/// Task IDs this task depends on (⛔).
	#[serde(skip_serializing_if = "Option::is_none", default)]
	pub depends_on: Option<Vec<String>>,
	/// Action on completion (🏁).
	#[serde(skip_serializing_if = "Option::is_none", default)]
	pub on_completion: Option<String>,
	/// Tags extracted from the description (e.g. `#work`, `#home`).
	pub tags: Vec<String>,
}

/// Aggregate tag info returned by `VaultIndex::lookup_all_tags`. Mirrors
/// the shape consumed by the TS `buildTagTree` (which expects
/// `{ name, count, filePaths }`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagAggregate {
	/// Original-case tag name (first occurrence wins per
	/// `tags.logic.ts::extractAllTags` semantics).
	pub name: String,
	/// Number of distinct notes that use this tag (case-insensitively).
	pub count: usize,
	/// Absolute paths of the notes that contain this tag, sorted ascending.
	pub file_paths: Vec<String>,
}

/// One file's worth of tasks, as returned by
/// `VaultIndex::lookup_all_tasks`. Mirrors `tasks.types.ts::FileTaskGroup`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTaskGroup {
	/// Absolute file path.
	pub file_path: String,
	/// Display name (filename without extension).
	pub file_name: String,
	/// File's last-modified time in seconds since the UNIX epoch — note this
	/// is SECONDS to match `NoteEntry.modified_at`, not the milliseconds
	/// `FileNode.modifiedAt` from `scan_vault` uses. Frontend code that
	/// compares these must convert.
	pub modified_at: i64,
	/// Tasks in document order.
	pub tasks: Vec<Task>,
}

/// Returns the display name for a file path: the basename with the
/// trailing extension dropped (e.g. `/vault/foo.md` -> `foo`,
/// `/vault/.hidden` -> `.hidden`). Hidden-file behaviour matches the TS
/// `getDisplayName` in `tasks.logic.ts:256-260`.
pub fn display_name(path: &str) -> String {
	let basename = path.rsplit('/').next().unwrap_or(path);
	match basename.rfind('.') {
		Some(idx) if idx > 0 => basename[..idx].to_string(),
		_ => basename.to_string(),
	}
}

/// Result of a single `toggle_task_status` mutation. Carries the updated
/// content back to the frontend so it can sync `noteIndexStore` and the
/// open editor without re-reading the file.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleTaskResult {
	/// New file content after the toggle (entire body — frontend uses it
	/// to update `noteIndexStore` and the editor view).
	pub updated_content: String,
	/// `UpdateResult` from the `VaultIndex::update_entry` call that ran
	/// after the disk write. `changed: false` means the line was a no-op
	/// (out of bounds or no checkbox); the disk file is untouched in that
	/// case and the content equals the pre-call content.
	pub update_result: crate::vault::index::UpdateResult,
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn display_name_strips_md_extension() {
		assert_eq!(display_name("/vault/notes/foo.md"), "foo");
		assert_eq!(display_name("/vault/foo.markdown"), "foo");
	}

	#[test]
	fn display_name_strips_only_last_dot() {
		assert_eq!(display_name("/vault/foo.bar.md"), "foo.bar");
	}

	#[test]
	fn display_name_keeps_dotfile_basename() {
		assert_eq!(display_name("/vault/.hidden"), ".hidden");
	}

	#[test]
	fn display_name_no_directory() {
		assert_eq!(display_name("foo.md"), "foo");
	}

	#[test]
	fn display_name_no_extension() {
		assert_eq!(display_name("/vault/Foo"), "Foo");
	}

	#[test]
	fn task_status_serializes_kebab() {
		let json = serde_json::to_string(&TaskStatus::InProgress).unwrap();
		assert_eq!(json, "\"in-progress\"");
		let json = serde_json::to_string(&TaskStatus::Todo).unwrap();
		assert_eq!(json, "\"todo\"");
	}

	#[test]
	fn task_priority_serializes_kebab_and_includes_none() {
		assert_eq!(
			serde_json::to_string(&TaskPriority::None).unwrap(),
			"\"none\""
		);
		assert_eq!(
			serde_json::to_string(&TaskPriority::Highest).unwrap(),
			"\"highest\""
		);
	}

	#[test]
	fn task_metadata_omits_none_fields() {
		let m = TaskMetadata::default();
		let json = serde_json::to_string(&m).unwrap();
		// description always present; tags always present (empty array)
		assert!(json.contains("\"description\":\"\""));
		assert!(json.contains("\"tags\":[]"));
		// no Option fields appear
		assert!(!json.contains("\"dueDate\""));
		assert!(!json.contains("\"priority\""));
	}
}
