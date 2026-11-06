# Tasks view: spec

The spec for this feature is `.scratch/tasks-view/PRD.md`. Read it before building or reviewing any Issue: it holds the owner decisions (blocking B1 to B7, later L1 to L4), the assumptions the owner can veto, the shared query model, the Todoist identity strategy and what is out of scope.

An Issue with `Status: needs-info` waits on the owner decision named in its `Waits on:` line. Do not pick that decision yourself.

`research/` holds the evidence the PRD was built from. Scout notes came from cheaper models and are leads, not proof: check the code before relying on one.

Relay-lite hands every agent this file, not `PRD.md`; this file only points there so the decisions live in one place.
