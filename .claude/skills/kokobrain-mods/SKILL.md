---
name: kokobrain-mods
description: Kokobrain vault mods, the plain-JS `main.js` + `manifest.json` folders in `<vault>/_system/mods/<id>/`. Use when creating a new mod, changing or debugging an existing mod, or reviewing a mod.
---

The reference is `help/documentation/mods/` in the Kokobrain checkout. It is the single source of truth for every rule, signature and error message: read it there, cite it by file and anchor. `help/examples/mods/` holds working mods. The links below are relative to this file and resolve to those folders.

## Where the mod lives

Write the mod folder where the user names, else in the current workspace, as `<somewhere>/<id>/manifest.json` + `main.js`. Write into a real vault's `_system/mods/<id>/` only when the user asks for it: with **Vault mods** on, every save there loads the mod at once, and a broken save unloads the running version with no rollback ([01 § No rollback](../../../help/documentation/mods/01-anatomy-and-loading.md#no-rollback)).

## Rules that break every mod

The loader rejects the whole mod, before any of your code runs, unless:

- `main.js` has exactly one line starting with `export default ` at column 0, exporting an object (or instance) with an `onload` function. No line inside a comment or template literal starts with `export default`.
- `main.js` has no `import`, no `import.meta`, no other `export`, no top-level `await`.
- `manifest.json` has `id` equal to the folder name (`^[a-z0-9]+(-[a-z0-9]+)*$`, at most 64 characters) and non-empty string `name` and `version`.

Every other rule is in the [golden rules](../../../help/documentation/mods/README.md#golden-rules): read them all before writing any code.

## The checker

Run it as `node <skill-dir>/scripts/check-mod.mjs <mod-folder>`, with `<skill-dir>` the absolute path of this skill's folder (the base directory shown when the skill loaded), so it works from any working directory and for a mod folder anywhere. It uses the app's loader from the checkout it lives in; `--repo <checkout>` picks another. `--help` lists every option. It never writes to disk and never sends a request.

- **Check mode** (no `--run`) loads the folder with the app's real `parseModManifest` and `evaluateModSource`, runs `onload` against a fake `ctx` that applies the host's registration rules and messages, unloads it, and prints the registrations, the tiers, the members the source uses, the members `onload` touched, and each cleanup the unload ran. Static warnings cover action bodies and callbacks without running them.
- **Run mode** (`--run <action-id>`) then runs that one action body against an in-memory vault seeded from `--vault <fixture-folder>`, with `--input`, `--target note:<path>|folder:<path>` and `--answers '<json array>'` (one answer per dialog in order; `"STOP"` presses Stop there). It prints the outcome (done, failed, cancelled), the log, progress, toasts, dialogs, the note it opened and every file change as a diff. It models the `ctx.app` members actions read first (the vault root, an editor with no open tab, the system and daily note settings, the daily note, `updateNoteFrontmatter` through the app's own frontmatter code); `--help` lists them and the fixed values. Any other `ctx.app` member, and `ctx.kb()`, throws `not modelled by --run: ctx.<member>`, and that path needs the app.

The checker is **green** when it prints `PASS` and exits 0. Errors fail it. Each warning is either fixed or named in the handover with its reason.

Each part of a mod ends at one **verification level**, which the handover states: **ran** (an action body under `--run`, with the fixture and answers used), **static** (only the checker's warnings and the checklist saw it: watch, save and theme callbacks, key handlers, DOM code, timers), or **app** (it needs an unmodelled `ctx.app` member, `ctx.kb()` or the real UI, so only the app shows it works).

## Steps

### 1. Pin down the mod

For a new mod, settle with the user, in writing:

- the `id` and display name;
- each **action**: what it does, whether it takes `input`, and its entry points (rail button, palette, note menu, folder menu: [02 § Entry points at a glance](../../../help/documentation/mods/02-actions-and-entry-points.md#entry-points-at-a-glance));
- for a **passive** mod (a status bar chip, a hotkey, a save hook, a timer, a watch), each **trigger** instead: what fires it (which key chord, saves of which notes, which state change, which interval), what it shows or changes, and whether it also needs an action;
- the data it touches: which folders and notes it reads and writes, whether it edits a note that may be open, mod data, network hosts;
- the tier per need, using [Which API do I use](../../../help/documentation/mods/README.md#which-api-do-i-use) and the most stable tier that does the job ([Stability tiers](../../../help/documentation/mods/README.md#stability-tiers)).

Ask what the request leaves open, these above all:

- "a meeting note", "a person note": is that a type in the vault? A typed note is made with its type's template ([09 § createTypedNote](../../../help/documentation/mods/09-raw-app.md#createtypednote)), not with `ctx.vault.create`.
- which notes count: archived ones, subfolders, notes open in a tab, notes saved seconds ago (the index lags), and for tasks which statuses count as open;
- which folders it writes to, and whether they exist: `ctx.vault` cannot create an empty folder;
- whether the app already shows this value or does this job (the status bar already counts words);
- which entry points and triggers were asked for. Add only those.

Two kinds of request need more before any code:

- **It depends on another mod** (runs its action, reads its data): read that mod's `main.js` and take its action ids and data shape from there, never from memory or a doc example. List the dependency, with the ids used, in the handover.
- **The reference cannot do it** (a section on the Today screen, a navigator, anything the [task guide](../../../help/documentation/mods/README.md#task-guide) marks not possible from plain JS): say so to the user first, then offer the closest thing it can do. When the user cannot be asked, build that substitute, and open the handover with what was asked, why it is not possible, and what was built instead.

When the user cannot be asked (they are away, or the run is unattended), take the reading closest to the request, write each choice down as an assumption, and carry the list to the handover.

For an existing mod, read its `manifest.json` and `main.js` in full and run the checker to get a baseline. A `main.js` that is a bundle is generated: find its source project and change that instead ([12 § Keep the project outside the vault](../../../help/documentation/mods/12-types-build-and-test.md#keep-the-project-outside-the-vault)). For a bug, get the exact message (the Labs row, the toast, or the log) and find it in the [error message catalog](../../../help/documentation/mods/15-errors-and-debugging.md#error-message-catalog); when the cause is not visible in the code, follow the [debugging workflow](../../../help/documentation/mods/15-errors-and-debugging.md#debugging-workflow).

For a review, skip to step 4.

Done when every action has its entry points and input, every trigger its event, each with the paths and notes it touches and the tier of each member it needs, and every open question is answered or recorded as an assumption.

### 2. Read the reference for this mod

Match each capability from step 1 to its row in the [task guide](../../../help/documentation/mods/README.md#task-guide) and read the section that row points to. Look up each `ctx` member you will call in the [API reference](../../../help/documentation/mods/13-api-reference.md).

Done when every capability from step 1 has its section read, and every `ctx` member the mod will use has its signature, rejections and tier known.

### 3. Write `manifest.json` and `main.js`

Start from the closest match to the step 1 capabilities: a [cookbook recipe](../../../help/documentation/mods/14-cookbook.md#recipes) or an [example mod](../../../help/documentation/mods/README.md#example-mods), whichever covers more of them; `hello` only when nothing closer fits. Keep the mod's own files to `manifest.json` and `main.js`.

Write a line or paragraph separator in a string or regex as the escape `\u2028` / `\u2029`: write tools can turn the escape into the literal character, which breaks a regex. The checker flags a literal one.

For a mod written in TypeScript or using npm packages, follow [12 § Building a mod from TypeScript](../../../help/documentation/mods/12-types-build-and-test.md#building-a-mod-from-typescript), including its loader-rule guard, and check the built output folder (named as the id) in step 4.

Done when both files exist and every action and trigger from step 1 is registered.

### 4. Run the checker until it is green

Run the checker on the mod folder. Fix each error at its cause, run again, repeat. Then go through the warnings.

Done when the checker is green and every warning is fixed or written down with its reason for the handover.

### 5. Run each action body

Build a fixture vault under `/tmp` with the notes and folders each action expects (`mkdir` for an empty folder; seeded mod data goes in `<fixture>/.kokobrain/mods/<id>/data.json`), then run every action with `--run`: the main path, plus each branch that writes or refuses (the target already exists, a folder is missing, the user cancels at a dialog, `"STOP"` at the first dialog). Read the changes as the user would see them in their notes, and check that nothing changes after Stop.

- `--answers` holds one answer for every dialog, an `alert` included, in the order they open. A `loading` takes none: Stop during one with `--stop-at-loading <n>`.
- A branch that is meant to fail (a refusal that throws) runs with `--expect-fail`, which makes it green only when the run ends failed.
- A run that stops at `not modelled by --run` marks that path **app**.

A passive mod has no action to run: its triggers stay at **static** or **app**. For a mod that needs more, [12 § Testing in vitest](../../../help/documentation/mods/12-types-build-and-test.md#testing-in-vitest) builds a fake `ctx` for a test suite.

Done when every action body is **ran** on its main path and its writing branches, or marked **app** with the member that stopped it.

### 6. Walk the pre-flight checklist

Go through [16 § Pre-flight checklist](../../../help/documentation/mods/16-pitfalls-checklist.md#pre-flight-checklist) against the final `main.js` and `manifest.json`, action bodies and callbacks included. A section that does not apply is marked not applicable as a whole; in every other section mark each item pass, fixed or not applicable. Most items are one search through the file. Fix what fails, then run the checker and the step 5 runs again.

For a review, this list is the report: each failed item with its `main.js` line and the fix, plus the checker's errors and warnings and what each `--run` showed. Change the files only when the user asks.

Done when every section is marked not applicable or has each of its items marked, and the checker is still green.

### 7. Hand over

Tell the user:

- where the folder is, and the install steps from [01 § Installing a mod](../../../help/documentation/mods/01-anatomy-and-loading.md#installing-a-mod), from the copy into `_system/mods/` to the mod's Labs row showing **Loaded**;
- how to use each action: its rail button, palette entry or menu item, and what it asks; for a passive mod, what triggers it (the key chord, which saves, which state change) and how to switch it off (its switch in Labs);
- every change to user data beyond what was asked: files and folders it creates, notes it rewrites, frontmatter it re-serializes, line endings it changes;
- which unstable or raw members it uses, since those can break on an app update;
- the verification level of each action body and trigger, each warning left with its reason, every assumption from step 1, and each mod it depends on.

Done when the user can install and run the mod from the message alone, and knows which parts only the app can prove.
