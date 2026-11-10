//! Guarded edits of task lines located by their `🆔 td-…` anchor plus the
//! line the caller expects there, never by line number (todoist-bisync design
//! rule 12). [`apply_task_line_edits`] is the pure half; the command that
//! reads, writes and indexes the note is `commands::vault::write_task_lines`.

use crate::vault::index::UpdateResult;
use crate::vault::parsing::{detect_code_fence, HEADING_RE, ID_RE};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Replaces the one line that carries `anchor`, if it still equals `expected_line`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TaskLineReplace {
	/// Anchor value, `td-` included.
	pub anchor: String,
	/// The whole line the caller last saw.
	pub expected_line: String,
	/// The whole line to write in its place.
	pub new_line: String,
}

/// Inserts lines under a heading, or at the end of the note.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TaskLineInsert {
	/// Text of the heading the lines go under (without the `#` run, trimmed,
	/// exact match). The lines go after the last non-blank line before the
	/// next heading. `null` puts them after the last non-blank line of the note.
	#[serde(default)]
	pub after_heading: Option<String>,
	/// Whole lines to insert, in order.
	pub lines: Vec<String>,
}

/// Removes the one line that carries `anchor`, if it still equals `expected_line`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TaskLineRemove {
	/// Anchor value, `td-` included.
	pub anchor: String,
	/// The whole line the caller last saw.
	pub expected_line: String,
}

/// One note's batch, applied all or nothing. Replacements and removals are
/// located in the content as read; the inserts then run in order against the
/// result, so a move within one note is a removal plus an insert.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TaskLineEdits {
	/// Lines to rewrite in place.
	pub replace: Vec<TaskLineReplace>,
	/// Lines to add, applied after the replacements and removals.
	pub insert: Vec<TaskLineInsert>,
	/// Lines to drop.
	pub remove: Vec<TaskLineRemove>,
}

/// Why a batch was not applied.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub enum TaskLinesStaleReason {
	/// No line carries the anchor of a replacement or removal.
	AnchorMissing,
	/// Two or more lines carry it.
	AnchorDuplicated,
	/// The anchored line is not the expected one.
	LineDiffers,
	/// An inserted line's anchor is already in the note.
	AnchorExists,
	/// No heading has the insert's text.
	HeadingMissing,
	/// Two or more headings have it.
	HeadingDuplicated,
	/// The note uses CRLF line endings, which this writer does not edit.
	CrlfLineEndings,
}

/// The first check that failed, and the anchor or heading it failed on.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TaskLinesStale {
	/// Which check failed.
	pub reason: TaskLinesStaleReason,
	/// The anchor or heading text; empty for `crlfLineEndings`.
	pub subject: String,
}

/// What `write_task_lines` did.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub enum TaskLinesOutcome {
	/// The note was written and indexed.
	Written,
	/// The batch leaves the note as it is; nothing was written.
	Unchanged,
	/// A check failed (see `stale`); nothing was written.
	Stale,
	/// The note does not exist and the batch would add text to an empty one;
	/// nothing was written. The caller creates the note, then calls again. A
	/// batch that adds no text to a missing note is `unchanged` instead.
	Missing,
}

/// Result of `write_task_lines`.
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TaskLinesWriteResult {
	/// What the call did.
	pub outcome: TaskLinesOutcome,
	/// The note's content after the call, for `written` and `unchanged`
	/// (`null` for `unchanged` on a missing note).
	pub content: Option<String>,
	/// The failed check, for `stale`.
	pub stale: Option<TaskLinesStale>,
	/// The `VaultIndex` diff; `changed: false` unless `written`.
	pub update_result: UpdateResult,
}

/// Result of [`apply_task_line_edits`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TaskLineEditOutcome {
	/// The content after the batch.
	Applied(String),
	/// A check failed; the content is untouched.
	Stale(TaskLinesStale),
}

/// Applies `edits` to `content`. Any edit on a CRLF note is stale, so the
/// note never ends up with mixed line endings. A line "carries" an anchor
/// when any of its `🆔` values equals it (the parser keeps only the first,
/// but a duplicate anchor further along the line must still freeze the link).
/// Two edits that locate the same line (their anchors share it) are stale
/// as `AnchorDuplicated`. Anchors inside code fences count too: being stale
/// is the safe side.
///
/// Errors on a batch the caller built wrong: a new or inserted line with a
/// line break, an anchor named by two replacements or removals, or the same
/// anchor in two inserted lines.
pub fn apply_task_line_edits(content: &str, edits: &TaskLineEdits) -> Result<TaskLineEditOutcome, String> {
	validate(edits)?;
	let is_empty = edits.replace.is_empty() && edits.insert.is_empty() && edits.remove.is_empty();
	if !is_empty && content.contains("\r\n") {
		return Ok(TaskLineEditOutcome::Stale(stale(TaskLinesStaleReason::CrlfLineEndings, "")));
	}
	let mut lines: Vec<String> = content.split('\n').map(String::from).collect();

	// Locate every replacement and removal before changing anything.
	let mut replaced: Vec<(usize, &str)> = Vec::new();
	let mut removed: Vec<usize> = Vec::new();
	let mut taken: HashSet<usize> = HashSet::new();
	let located = edits
		.replace
		.iter()
		.map(|r| (&r.anchor, &r.expected_line, Some(r.new_line.as_str())))
		.chain(edits.remove.iter().map(|r| (&r.anchor, &r.expected_line, None)));
	for (anchor, expected, new_line) in located {
		let at = match locate(&lines, anchor, expected) {
			Ok(at) => at,
			Err(stale) => return Ok(TaskLineEditOutcome::Stale(stale)),
		};
		if !taken.insert(at) {
			return Ok(TaskLineEditOutcome::Stale(stale(TaskLinesStaleReason::AnchorDuplicated, anchor)));
		}
		match new_line {
			Some(new_line) => replaced.push((at, new_line)),
			None => removed.push(at),
		}
	}
	for (at, new_line) in replaced {
		lines[at] = new_line.to_string();
	}
	removed.sort_unstable();
	for at in removed.into_iter().rev() {
		lines.remove(at);
	}

	let present: HashSet<&str> = lines.iter().flat_map(|l| anchors(l)).collect();
	if let Some(anchor) = edits
		.insert
		.iter()
		.flat_map(|i| i.lines.iter().flat_map(|l| anchors(l)))
		.find(|a| present.contains(a))
	{
		return Ok(TaskLineEditOutcome::Stale(stale(TaskLinesStaleReason::AnchorExists, anchor)));
	}
	for insert in &edits.insert {
		let at = match &insert.after_heading {
			None => after_last_non_blank(&lines, 0, lines.len()).unwrap_or(0),
			Some(heading) => match section_end(&lines, heading) {
				Ok(at) => at,
				Err(stale) => return Ok(TaskLineEditOutcome::Stale(stale)),
			},
		};
		lines.splice(at..at, insert.lines.iter().cloned());
	}
	Ok(TaskLineEditOutcome::Applied(lines.join("\n")))
}

fn validate(edits: &TaskLineEdits) -> Result<(), String> {
	let new_lines = edits
		.replace
		.iter()
		.map(|r| &r.new_line)
		.chain(edits.insert.iter().flat_map(|i| i.lines.iter()));
	for line in new_lines {
		if line.contains(['\n', '\r']) {
			return Err(format!("A task line may not hold a line break: {:?}", line));
		}
	}
	let mut named = HashSet::new();
	for anchor in edits.replace.iter().map(|r| &r.anchor).chain(edits.remove.iter().map(|r| &r.anchor)) {
		if !named.insert(anchor.as_str()) {
			return Err(format!("Anchor {} is named by two edits", anchor));
		}
	}
	let mut inserted = HashSet::new();
	for anchor in edits.insert.iter().flat_map(|i| i.lines.iter().flat_map(|l| anchors(l))) {
		if !inserted.insert(anchor) {
			return Err(format!("Anchor {} is inserted twice", anchor));
		}
	}
	Ok(())
}

/// Every `🆔` value on the line.
fn anchors(line: &str) -> impl Iterator<Item = &str> {
	ID_RE.captures_iter(line).filter_map(|c| c.get(1)).map(|m| m.as_str())
}

/// The index of the one line carrying `anchor`, if it equals `expected`.
fn locate(lines: &[String], anchor: &str, expected: &str) -> Result<usize, TaskLinesStale> {
	let mut hits = lines.iter().enumerate().filter(|(_, l)| anchors(l).any(|a| a == anchor));
	let Some((at, line)) = hits.next() else {
		return Err(stale(TaskLinesStaleReason::AnchorMissing, anchor));
	};
	if hits.next().is_some() {
		return Err(stale(TaskLinesStaleReason::AnchorDuplicated, anchor));
	}
	if line != expected {
		return Err(stale(TaskLinesStaleReason::LineDiffers, anchor));
	}
	Ok(at)
}

/// Where lines inserted under `heading` go: after the last non-blank line
/// between it and the next heading of any level, or right below it.
fn section_end(lines: &[String], heading: &str) -> Result<usize, TaskLinesStale> {
	let headings = heading_indexes(lines);
	let mut matches = headings.iter().filter(|(_, text)| text == heading);
	let Some(&(at, _)) = matches.next() else {
		return Err(stale(TaskLinesStaleReason::HeadingMissing, heading));
	};
	if matches.next().is_some() {
		return Err(stale(TaskLinesStaleReason::HeadingDuplicated, heading));
	}
	let end = headings.iter().map(|(i, _)| *i).find(|i| *i > at).unwrap_or(lines.len());
	Ok(after_last_non_blank(lines, at + 1, end).unwrap_or(at + 1))
}

/// The index after the last non-blank line in `lines[from..to]`, if any.
fn after_last_non_blank(lines: &[String], from: usize, to: usize) -> Option<usize> {
	(from..to).rev().find(|i| !lines[*i].trim().is_empty()).map(|i| i + 1)
}

/// `(index, trimmed text)` of every heading outside frontmatter and code fences.
fn heading_indexes(lines: &[String]) -> Vec<(usize, String)> {
	let mut out = Vec::new();
	let mut start = 0;
	if lines.first().is_some_and(|l| l.trim_end() == "---") {
		if let Some(close) = lines.iter().skip(1).position(|l| l.trim_end() == "---") {
			start = close + 2;
		}
	}
	let mut fence: Option<&str> = None;
	for (i, line) in lines.iter().enumerate().skip(start) {
		if let Some(marker) = detect_code_fence(line) {
			match fence {
				None => fence = Some(marker),
				Some(open) if open == marker => fence = None,
				Some(_) => {}
			}
			continue;
		}
		if fence.is_some() {
			continue;
		}
		if let Some(caps) = HEADING_RE.captures(line) {
			out.push((i, caps.get(2).map_or("", |m| m.as_str()).trim().to_string()));
		}
	}
	out
}

fn stale(reason: TaskLinesStaleReason, subject: &str) -> TaskLinesStale {
	TaskLinesStale {
		reason,
		subject: subject.to_string(),
	}
}
