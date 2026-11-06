# Tasks view: spec

The spec for this feature is `.scratch/tasks-view/PRD.md`. Read it before building or reviewing any Issue: it holds the owner decisions (blocking B1 to B7, later L1 to L4), the assumptions the owner can veto, the shared query model, the Todoist identity strategy and what is out of scope.

The owner answered every decision on 2026-11-06 (PRD "Owner answers"); an Issue's `Answered:` line names the one it follows. An Issue with `Status: needs-triage` waits on another Issue named in its `Waits on:` line. Do not pick an unanswered decision yourself.

`research/` holds the evidence the PRD was built from. Scout notes came from cheaper models and are leads, not proof: check the code before relying on one.

Relay-lite hands every agent this file, not `PRD.md`; this file only points there so the decisions live in one place.
