//! Phase 7 — Task parsing tests.
//!
//! Covers `extract_tasks`, `extract_tasks_from_section`,
//! `parse_task_metadata`, `map_checkbox_char`, `toggle_task_in_content`.
//! Fixtures mirror `src/tests/lib/features/tasks/{tasks,task-metadata}.logic.test.ts`
//! so divergences between TS and Rust extractors surface immediately.

use kokobrain_lib::vault::parsing::{
	extract_tasks, extract_tasks_from_section, map_checkbox_char, parse_task_metadata,
	toggle_task_in_content,
};
use kokobrain_lib::vault::task::{TaskPriority, TaskStatus};

// ---------- map_checkbox_char ----------

#[test]
fn map_checkbox_char_recognises_all_known_chars() {
	assert_eq!(map_checkbox_char(' '), TaskStatus::Todo);
	assert_eq!(map_checkbox_char('x'), TaskStatus::Done);
	assert_eq!(map_checkbox_char('X'), TaskStatus::Done);
	assert_eq!(map_checkbox_char('-'), TaskStatus::Cancelled);
	assert_eq!(map_checkbox_char('/'), TaskStatus::InProgress);
	assert_eq!(map_checkbox_char('?'), TaskStatus::Question);
	assert_eq!(map_checkbox_char('>'), TaskStatus::Forwarded);
	assert_eq!(map_checkbox_char('!'), TaskStatus::Important);
}

#[test]
fn map_checkbox_char_unknown_falls_back_to_todo() {
	assert_eq!(map_checkbox_char('z'), TaskStatus::Todo);
	assert_eq!(map_checkbox_char('@'), TaskStatus::Todo);
}

// ---------- extract_tasks: empty / no tasks ----------

#[test]
fn extract_tasks_empty_string_returns_empty() {
	assert!(extract_tasks("").is_empty());
}

#[test]
fn extract_tasks_no_tasks_in_plain_prose() {
	let content = "Just a paragraph.\nAnother paragraph.\n";
	assert!(extract_tasks(content).is_empty());
}

// ---------- extract_tasks: shapes ----------

#[test]
fn extract_tasks_unordered_basic_shape() {
	let content = "- [ ] Buy milk\n- [x] Write tests\n";
	let tasks = extract_tasks(content);
	assert_eq!(tasks.len(), 2);
	assert_eq!(tasks[0].text, "Buy milk");
	assert!(!tasks[0].checked);
	assert_eq!(tasks[0].indent, 0);
	assert_eq!(tasks[0].line_number, 1);
	assert_eq!(tasks[0].status, TaskStatus::Todo);

	assert_eq!(tasks[1].text, "Write tests");
	assert!(tasks[1].checked);
	assert_eq!(tasks[1].line_number, 2);
	assert_eq!(tasks[1].status, TaskStatus::Done);
}

#[test]
fn extract_tasks_supports_all_unordered_markers() {
	let content = "- [ ] dash task\n* [ ] star task\n+ [ ] plus task\n";
	let tasks = extract_tasks(content);
	assert_eq!(tasks.len(), 3);
	assert_eq!(tasks[0].text, "dash task");
	assert_eq!(tasks[1].text, "star task");
	assert_eq!(tasks[2].text, "plus task");
}

#[test]
fn extract_tasks_supports_ordered_marker() {
	let content = "1. [ ] first\n2. [x] second\n10. [-] tenth\n";
	let tasks = extract_tasks(content);
	assert_eq!(tasks.len(), 3);
	assert_eq!(tasks[0].text, "first");
	assert_eq!(tasks[1].text, "second");
	assert!(tasks[1].checked);
	assert_eq!(tasks[2].status, TaskStatus::Cancelled);
}

#[test]
fn extract_tasks_recognises_all_status_chars() {
	let content = "- [ ] todo\n- [x] done\n- [-] cancelled\n- [/] in-prog\n- [?] question\n- [>] forwarded\n- [!] important\n";
	let tasks = extract_tasks(content);
	assert_eq!(tasks.len(), 7);
	assert_eq!(tasks[0].status, TaskStatus::Todo);
	assert_eq!(tasks[1].status, TaskStatus::Done);
	assert_eq!(tasks[2].status, TaskStatus::Cancelled);
	assert_eq!(tasks[3].status, TaskStatus::InProgress);
	assert_eq!(tasks[4].status, TaskStatus::Question);
	assert_eq!(tasks[5].status, TaskStatus::Forwarded);
	assert_eq!(tasks[6].status, TaskStatus::Important);
}

#[test]
fn extract_tasks_indent_levels_tabs_and_spaces() {
	let content = "- [ ] zero\n  - [ ] one space*2=1\n    - [ ] two spaces*4=2\n\t- [ ] one tab=1\n\t\t- [ ] two tabs=2\n";
	let tasks = extract_tasks(content);
	assert_eq!(tasks.len(), 5);
	assert_eq!(tasks[0].indent, 0);
	assert_eq!(tasks[1].indent, 1);
	assert_eq!(tasks[2].indent, 2);
	assert_eq!(tasks[3].indent, 1);
	assert_eq!(tasks[4].indent, 2);
}

#[test]
fn extract_tasks_rejects_empty_text() {
	let content = "- [ ] \n- [x]    \n- [ ] real task\n";
	let tasks = extract_tasks(content);
	assert_eq!(tasks.len(), 1);
	assert_eq!(tasks[0].text, "real task");
	assert_eq!(tasks[0].line_number, 3);
}

// ---------- extract_tasks: code blocks ----------

#[test]
fn extract_tasks_skips_inside_backtick_fenced_block() {
	let content = "- [ ] outside\n```\n- [ ] inside fence\n```\n- [ ] after\n";
	let tasks = extract_tasks(content);
	assert_eq!(tasks.len(), 2);
	assert_eq!(tasks[0].text, "outside");
	assert_eq!(tasks[1].text, "after");
}

#[test]
fn extract_tasks_skips_inside_tilde_fenced_block() {
	let content = "- [ ] outside\n~~~\n- [ ] inside\n~~~\n- [ ] after\n";
	let tasks = extract_tasks(content);
	assert_eq!(tasks.len(), 2);
}

#[test]
fn extract_tasks_mismatched_fence_markers_do_not_close() {
	// A backtick fence is not closed by tildes (and vice versa).
	let content = "```\n- [ ] still inside\n~~~\n- [ ] still inside too\n```\n- [ ] after\n";
	let tasks = extract_tasks(content);
	assert_eq!(tasks.len(), 1);
	assert_eq!(tasks[0].text, "after");
}

#[test]
fn extract_tasks_line_numbers_are_one_based() {
	let content = "header\n\n- [ ] task at line 3\n";
	let tasks = extract_tasks(content);
	assert_eq!(tasks.len(), 1);
	assert_eq!(tasks[0].line_number, 3);
}

// ---------- extract_tasks_from_section ----------

#[test]
fn extract_tasks_from_section_falls_through_when_tag_empty() {
	let content = "- [ ] one\n- [ ] two\n";
	let tasks = extract_tasks_from_section(content, "");
	assert_eq!(tasks.len(), 2);
}

#[test]
fn extract_tasks_from_section_filters_to_matching_heading_only() {
	let content = "## Random\n- [ ] outside\n## To-list #to-list\n- [ ] inside\n- [ ] inside2\n## Other\n- [ ] outside2\n";
	let tasks = extract_tasks_from_section(content, "#to-list");
	assert_eq!(tasks.len(), 2);
	assert_eq!(tasks[0].text, "inside");
	assert_eq!(tasks[1].text, "inside2");
}

#[test]
fn extract_tasks_from_section_handles_nested_headings() {
	let content = "## Section #to-list\n- [ ] level2\n### Sub\n- [ ] level3\n## Other\n- [ ] outside\n";
	let tasks = extract_tasks_from_section(content, "#to-list");
	assert_eq!(tasks.len(), 2);
	assert_eq!(tasks[0].text, "level2");
	assert_eq!(tasks[1].text, "level3");
}

#[test]
fn extract_tasks_from_section_adds_hash_when_missing() {
	let content = "## Inbox #to-list\n- [ ] x\n";
	let with_hash = extract_tasks_from_section(content, "#to-list");
	let without_hash = extract_tasks_from_section(content, "to-list");
	assert_eq!(with_hash.len(), 1);
	assert_eq!(without_hash.len(), 1);
}

#[test]
fn extract_tasks_from_section_ignores_heading_lines_inside_code_block() {
	let content = "```\n## Fake heading #to-list\n- [ ] inside fence\n```\n## Real #to-list\n- [ ] real task\n";
	let tasks = extract_tasks_from_section(content, "#to-list");
	assert_eq!(tasks.len(), 1);
	assert_eq!(tasks[0].text, "real task");
}

// ---------- parse_task_metadata: dates ----------

#[test]
fn parse_task_metadata_each_date_emoji() {
	let m = parse_task_metadata("buy milk \u{1F4C5} 2026-02-20");
	assert_eq!(m.due_date.as_deref(), Some("2026-02-20"));

	let m = parse_task_metadata("read book \u{23F3} 2026-02-21");
	assert_eq!(m.scheduled_date.as_deref(), Some("2026-02-21"));

	let m = parse_task_metadata("trip \u{1F6EB} 2026-03-01");
	assert_eq!(m.start_date.as_deref(), Some("2026-03-01"));

	let m = parse_task_metadata("seed \u{2795} 2026-01-01");
	assert_eq!(m.created_date.as_deref(), Some("2026-01-01"));

	let m = parse_task_metadata("finished \u{2705} 2026-04-01");
	assert_eq!(m.done_date.as_deref(), Some("2026-04-01"));

	let m = parse_task_metadata("scrapped \u{274C} 2026-04-02");
	assert_eq!(m.cancelled_date.as_deref(), Some("2026-04-02"));
}

#[test]
fn parse_task_metadata_strips_signifiers_from_description() {
	let m = parse_task_metadata("Buy milk \u{1F4C5} 2026-02-20");
	assert_eq!(m.description, "Buy milk");
}

#[test]
fn parse_task_metadata_handles_optional_variation_selector() {
	// Some emojis ship with the variation selector U+FE0F to force an
	// emoji presentation. Both forms must be recognised.
	let m = parse_task_metadata("Buy milk \u{1F4C5}\u{FE0F} 2026-02-20");
	assert_eq!(m.due_date.as_deref(), Some("2026-02-20"));
}

// ---------- parse_task_metadata: priorities ----------

#[test]
fn parse_task_metadata_priority_first_match_wins() {
	let m = parse_task_metadata("important \u{1F53A} \u{23EB}"); // 🔺 then ⏫
	assert_eq!(m.priority, Some(TaskPriority::Highest));
}

#[test]
fn parse_task_metadata_each_priority_emoji() {
	for (raw, expected) in [
		("\u{1F53A}", TaskPriority::Highest),
		("\u{23EB}", TaskPriority::High),
		("\u{1F53C}", TaskPriority::Medium),
		("\u{1F53D}", TaskPriority::Low),
		("\u{23EC}", TaskPriority::Lowest),
	] {
		let m = parse_task_metadata(&format!("task {}", raw));
		assert_eq!(m.priority, Some(expected), "input: {}", raw);
	}
}

// ---------- parse_task_metadata: recurrence ----------

#[test]
fn parse_task_metadata_recurrence_simple() {
	let m = parse_task_metadata("water plants \u{1F501} every week");
	let rec = m.recurrence.expect("recurrence missing");
	assert_eq!(rec.text, "every week");
}

#[test]
fn parse_task_metadata_recurrence_stops_at_next_signifier() {
	// 🔁 every week 📅 2026-02-20 — recurrence text is "every week", date stays.
	let m = parse_task_metadata("task \u{1F501} every week \u{1F4C5} 2026-02-20");
	let rec = m.recurrence.expect("recurrence missing");
	assert_eq!(rec.text, "every week");
	assert_eq!(m.due_date.as_deref(), Some("2026-02-20"));
}

#[test]
fn parse_task_metadata_recurrence_stops_at_hash_tag() {
	let m = parse_task_metadata("task \u{1F501} every week #project");
	let rec = m.recurrence.expect("recurrence missing");
	assert_eq!(rec.text, "every week");
	assert_eq!(m.tags, vec!["project".to_string()]);
}

// ---------- parse_task_metadata: id / dependsOn / onCompletion ----------

#[test]
fn parse_task_metadata_id_signifier() {
	let m = parse_task_metadata("task \u{1F194} abc123");
	assert_eq!(m.id.as_deref(), Some("abc123"));
}

#[test]
fn parse_task_metadata_depends_on_csv_no_spaces() {
	// Matches TS fixture in `task-metadata.logic.test.ts:174`. The regex
	// does NOT support whitespace around commas (greedy `\S+` consumes
	// the first comma before the optional repetition group can match),
	// so callers writing `id1, id2, id3` get only the first id. Parity
	// preserved with the TS implementation.
	let m = parse_task_metadata("task \u{26D4} id1,id2,id3");
	assert_eq!(
		m.depends_on,
		Some(vec![
			"id1".to_string(),
			"id2".to_string(),
			"id3".to_string()
		])
	);
}

#[test]
fn parse_task_metadata_depends_on_single_id() {
	let m = parse_task_metadata("blocked \u{26D4} abc123");
	assert_eq!(m.depends_on, Some(vec!["abc123".to_string()]));
}

#[test]
fn parse_task_metadata_on_completion_signifier() {
	let m = parse_task_metadata("task \u{1F3C1} delete");
	assert_eq!(m.on_completion.as_deref(), Some("delete"));
}

// ---------- parse_task_metadata: tags ----------

#[test]
fn parse_task_metadata_extracts_tags_with_hyphens() {
	let m = parse_task_metadata("task #work #my-project");
	assert_eq!(m.tags, vec!["work".to_string(), "my-project".to_string()]);
}

#[test]
fn parse_task_metadata_tags_excluded_from_description() {
	let m = parse_task_metadata("Buy milk #grocery #urgent");
	assert_eq!(m.description, "Buy milk");
	assert_eq!(m.tags, vec!["grocery".to_string(), "urgent".to_string()]);
}

// ---------- parse_task_metadata: description cleanup ----------

#[test]
fn parse_task_metadata_collapses_multi_spaces() {
	let m = parse_task_metadata("Buy   milk    today");
	assert_eq!(m.description, "Buy milk today");
}

#[test]
fn parse_task_metadata_strips_all_signifiers_combined() {
	let m = parse_task_metadata(
		"Buy milk \u{1F4C5} 2026-02-20 \u{1F53A} \u{1F501} every week #grocery",
	);
	assert_eq!(m.description, "Buy milk");
	assert_eq!(m.due_date.as_deref(), Some("2026-02-20"));
	assert_eq!(m.priority, Some(TaskPriority::Highest));
	assert_eq!(m.recurrence.unwrap().text, "every week");
	assert_eq!(m.tags, vec!["grocery".to_string()]);
}

// ---------- toggle_task_in_content ----------

#[test]
fn toggle_task_in_content_unchecked_to_checked() {
	let content = "- [ ] task";
	let result = toggle_task_in_content(content, 1);
	assert_eq!(result, "- [x] task");
}

#[test]
fn toggle_task_in_content_checked_lowercase_to_unchecked() {
	let content = "- [x] task";
	let result = toggle_task_in_content(content, 1);
	assert_eq!(result, "- [ ] task");
}

#[test]
fn toggle_task_in_content_checked_uppercase_to_unchecked() {
	let content = "- [X] task";
	let result = toggle_task_in_content(content, 1);
	assert_eq!(result, "- [ ] task");
}

#[test]
fn toggle_task_in_content_in_progress_to_unchecked() {
	let content = "- [/] task";
	let result = toggle_task_in_content(content, 1);
	assert_eq!(result, "- [ ] task");
}

#[test]
fn toggle_task_in_content_cancelled_to_unchecked() {
	let content = "- [-] task";
	let result = toggle_task_in_content(content, 1);
	assert_eq!(result, "- [ ] task");
}

#[test]
fn toggle_task_in_content_line_zero_returns_unchanged() {
	let content = "- [ ] task";
	assert_eq!(toggle_task_in_content(content, 0), content);
}

#[test]
fn toggle_task_in_content_line_out_of_bounds_returns_unchanged() {
	let content = "- [ ] task\n";
	assert_eq!(toggle_task_in_content(content, 100), content);
}

#[test]
fn toggle_task_in_content_no_checkbox_returns_unchanged() {
	let content = "just a paragraph";
	assert_eq!(toggle_task_in_content(content, 1), content);
}

#[test]
fn toggle_task_in_content_only_first_match_on_line() {
	// Two checkboxes on one line — only the first is toggled. This
	// matches the TS implementation, which uses `String.replace(re, ...)`
	// without the global flag.
	let content = "- [ ] foo [ ] bar";
	assert_eq!(toggle_task_in_content(content, 1), "- [x] foo [ ] bar");
}

#[test]
fn toggle_task_in_content_preserves_other_lines() {
	let content = "line one\n- [ ] task on line two\nline three";
	let result = toggle_task_in_content(content, 2);
	assert_eq!(result, "line one\n- [x] task on line two\nline three");
}

// --- Audit finding #9 — toggle_task_status FS-level TOCTOU --------------------
//
// `commands/vault.rs::toggle_task_status_inner` faz read → modify → write
// no arquivo em disco (linhas 559, 561, 574). O write-lock em VaultIndex
// é segurado durante toda a operação, mas o ARQUIVO não tem lock.
// Outro processo (vim externo, Obsidian rodando em paralelo, app de sync
// como iCloud/Dropbox/Syncthing) que reescreva o arquivo entre o read
// e o write tem suas mudanças silenciosamente sobrescritas.
//
// Marcado #[ignore] porque o resultado depende de timing — o sleep de
// poucos microssegundos da thread B pode cair antes/durante/depois da
// janela read-write da thread A. Repete N iterações para aumentar a
// chance de pelo menos uma cair na janela ruim.
//
// Audit plan: ~/.claude/plans/atue-como-um-auditor-witty-minsky.md (Apêndice A.3).

use kokobrain_lib::commands::vault::toggle_task_status_inner;
use kokobrain_lib::vault::index::VaultIndex;
use std::sync::{Arc, Barrier};
use std::thread;

#[test]
#[ignore]
fn audit_finding_9_toggle_task_loses_concurrent_external_edit() {
	const ITERATIONS: usize = 200;
	let mut lost = 0;

	for _i in 0..ITERATIONS {
		let dir = tempfile::tempdir().unwrap();
		let path = dir.path().join("note.md");
		std::fs::write(&path, "- [ ] Buy milk\n- [ ] Write tests\n").unwrap();
		let path_str = path.to_string_lossy().to_string();
		let path_b = path_str.clone();

		// Barrier sincroniza para que ambas as threads partam ~ao mesmo tempo.
		let barrier = Arc::new(Barrier::new(2));
		let barrier_b = Arc::clone(&barrier);

		let h = thread::spawn(move || {
			barrier_b.wait();
			// Sleep curto para tentar aterrissar entre o read (l. 559) e o
			// write (l. 574) de toggle_task_status_inner. Valor escolhido
			// empiricamente; pequeno demais cai antes do read, grande demais
			// cai depois do write.
			thread::sleep(std::time::Duration::from_micros(10));
			let _ = std::fs::write(
				&path_b,
				"- [ ] Buy milk\n- [ ] Write tests\n- [ ] Externally added\n",
			);
		});

		let mut idx = VaultIndex::default();
		barrier.wait();
		let _ = toggle_task_status_inner(&mut idx, &path_str, 1);
		h.join().unwrap();

		let final_content = std::fs::read_to_string(&path).unwrap();
		// Se a edição externa foi perdida (toggle_task escreveu DEPOIS do
		// write da thread B), "Externally added" não estará no arquivo.
		if !final_content.contains("Externally added") {
			lost += 1;
		}
	}

	// Não asseveramos `lost == 0` porque o teste é probabilístico — o objetivo
	// é DETECTAR quando a janela TOCTOU é exercitada na prática. Imprime
	// e falha somente se NUNCA caiu na janela (improvável em 200 iterações;
	// se zero, o test setup precisa ser revisto, e.g. sleep timing). Usuários
	// que rodarem manualmente vão observar "lost > 0" como confirmação do bug.
	eprintln!(
		"audit_finding_9: {} de {} iterações perderam edição externa (race FS confirmada quando >0)",
		lost, ITERATIONS
	);
	assert!(
		lost > 0 || ITERATIONS == 0,
		"esperado ao menos 1 perda em {} iterações para confirmar a janela TOCTOU; \
		se sempre 0, ajuste o sleep timing da thread B",
		ITERATIONS
	);
}

#[test]
#[ignore]
fn audit_finding_9_toggle_task_no_concurrent_writer_preserves_state() {
	// Counterpart deterministico: SEM thread concorrente, toggle_task_inner
	// produz o resultado esperado. Serve de baseline e como sanity para
	// distinguir bug TOCTOU (#9) de bug de toggle propriamente dito.
	let dir = tempfile::tempdir().unwrap();
	let path = dir.path().join("note.md");
	std::fs::write(&path, "- [ ] Buy milk\n- [ ] Write tests\n").unwrap();
	let path_str = path.to_string_lossy().to_string();

	let mut idx = VaultIndex::default();
	let result = toggle_task_status_inner(&mut idx, &path_str, 1).unwrap();

	let final_content = std::fs::read_to_string(&path).unwrap();
	assert_eq!(final_content, "- [x] Buy milk\n- [ ] Write tests\n");
	assert_eq!(result.updated_content, final_content);
}
