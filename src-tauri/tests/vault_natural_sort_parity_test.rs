//! Pins the Rust scan name order (`natural_cmp`) against the shared parity
//! fixture (`src/tests/fixtures/natural-sort-parity.fixture.json`). The TS
//! port (`naturalCompare` in `fs.logic.ts`) is checked against the same
//! fixture in `fs.logic.test.ts`, so a node the app inserts into the file
//! tree lands where the next `scan_vault` puts it.

use kokobrain_lib::commands::vault::natural_cmp;
use serde_json::Value;
use std::cmp::Ordering;

const FIXTURE: &str = include_str!("../../src/tests/fixtures/natural-sort-parity.fixture.json");

/// Returns each fixture case as (name, expected order).
fn cases() -> Vec<(String, Vec<String>)> {
	let fixture: Value = serde_json::from_str(FIXTURE).expect("fixture is valid JSON");
	fixture["cases"]
		.as_array()
		.expect("cases array")
		.iter()
		.map(|case| {
			let names = case["expected"]
				.as_array()
				.expect("expected array")
				.iter()
				.map(|n| n.as_str().expect("name string").to_string())
				.collect();
			(case["name"].as_str().unwrap().to_string(), names)
		})
		.collect()
}

#[test]
fn every_earlier_name_compares_less_than_every_later_one() {
	let mut failures = Vec::new();
	for (case, names) in cases() {
		for i in 0..names.len() {
			for j in (i + 1)..names.len() {
				if natural_cmp(&names[i], &names[j]) != Ordering::Less {
					failures.push(format!("{case}: {:?} should sort before {:?}", names[i], names[j]));
				}
				if natural_cmp(&names[j], &names[i]) != Ordering::Greater {
					failures.push(format!("{case}: {:?} should sort after {:?}", names[j], names[i]));
				}
			}
		}
	}
	assert!(failures.is_empty(), "fixture mismatches:\n{}", failures.join("\n"));
}

#[test]
fn sorting_the_reversed_list_restores_the_expected_order() {
	for (case, names) in cases() {
		let mut sorted: Vec<String> = names.iter().rev().cloned().collect();
		sorted.sort_by(|a, b| natural_cmp(a, b));
		assert_eq!(sorted, names, "{case}");
	}
}
