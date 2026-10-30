export const meta = {
  name: 'implement-brain-issue',
  description: 'Kokobrain: implement the next (or a given) .scratch Issue in a git worktree: build (discovery + implement) → review → fix & deliver',
  whenToUse: 'To work the next Issue of a .scratch feature. Args: { feature, issue?, delivery?, extraRules? } — feature is required; pass delivery ONLY when the user explicitly asks for it.',
  phases: [
    { title: 'Build', detail: '1 Opus, medium effort: worktree, short discovery.md, implement with one commit per task, targeted tests only', model: 'opus' },
    { title: 'Review', detail: '1 Opus, high effort: review the diff, no gate; review.md, commit', model: 'opus' },
    { title: 'Deliver', detail: '1 Opus, medium effort (low when the review is clean): fix findings, the one gate run (picked from the changed paths), close the Issue, merge+push or open PR', model: 'opus' },
  ],
}

// ---- Configuration ---------------------------------------------------------
// Port of agent-relay's .claude/workflows/implement-issue.js (owner, 2026-10-28) for Kokobrain.
// Kokobrain has no ledger: the Issue files are the state. An Issue is open while its file exists
// (its `Status:` line says where it stands) and done once its closing commit deletes the file.
//   'merge' — merge the worktree branch into the local base branch and push it to the remote
//   'pr'    — push the worktree branch and open a pull request; nothing is merged
// A single Issue may override this through args.delivery, but only when the user explicitly asks.
const DEFAULT_DELIVERY = 'merge'
const BASE_BRANCH = 'main'
const REMOTE = 'origin'
// Reasoning effort per step. Without it, agents inherit the session's effort (often max).
// Review stays high: it is the step that catches real bugs; the others follow its findings.
// deliverClean: the review approved with no findings, so deliver only runs the gate and merges.
const EFFORT = { build: 'medium', review: 'high', deliver: 'medium', deliverClean: 'low' }
// The gate rule (CLAUDE.md Quick Reference rule 6), the only place it lives: an awk program
// the deliver agent runs on `git diff --name-only <base>...HEAD`. The script itself has no shell,
// so the agent runs it. First match wins per path; a path no rule names gets the frontend gate,
// so a file that can change the Rust build (such as .tool-versions) must be named in a rust rule.
// Docs-only changes run just the tests that read them, found by their first two path segments
// (tests open `help/documentation/...`, `help/examples/...`), as one ready-to-run line: zsh does
// not word-split an unquoted $(...), so the agent must not build the file list itself.
// Root files such as CLAUDE.md get no search key: tests only mention them in comments.
// It must contain no single quote (it is passed as awk '...') and no `${` (template literal).
const GATE_CLASSIFIER = String.raw`
/^(src-tauri|\.cargo)\// { rust = 1; next }
/^\.tool-versions$/ { rust = 1; fe = 1; next }
/^(src|static|e2e|scripts)\// || /^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig\.json|vite\.config\.js|vitest\.config\.ts|components\.json)$/ { fe = 1; next }
/^(\.scratch|help|docs)\// || /\.md$/ {
  if ($0 ~ /^help\/examples\//) helpEx = 1
  n = split($0, p, "/")
  if (n > 1 && !((p[1] "/" p[2]) in keys)) { keys[p[1] "/" p[2]] = 1; grepArgs = grepArgs " -e " p[1] "/" p[2] }
  docs = 1; next
}
{ fe = 1; other = other " " $0 }
END {
  label = ""
  if (rust) label = "rust"
  if (fe) label = label (label != "" ? "+" : "") "frontend"
  if (docs && !fe) label = label (label != "" ? "+" : "") "docs"
  print "gate: " (label != "" ? label : "none")
  if (fe) print "run: pnpm check && pnpm vitest run && pnpm build"
  if (rust) print "run: cargo test --manifest-path src-tauri/Cargo.toml"
  if (other != "") print "frontend gate because no rule names:" other
  if (docs && !fe) {
    if (helpEx) print "run: { echo src/tests/help/; grep -rlF" grepArgs " src/tests; } | xargs pnpm vitest run"
    else if (grepArgs != "") print "run: grep -rlF" grepArgs " src/tests | xargs -r pnpm vitest run"
    if (!helpEx) print "docs: when the run line finds no test file, or there is none, the docs need no gate"
  }
}
`
// ----------------------------------------------------------------------------

const a = args || {}
if (!a.feature) throw new Error('args.feature is required (a folder name under .scratch/)')
const FEATURE = a.feature
const DELIVERY = a.delivery || DEFAULT_DELIVERY
if (DELIVERY !== 'merge' && DELIVERY !== 'pr') throw new Error(`delivery must be 'merge' or 'pr', got ${DELIVERY}`)

const REPO = '/Users/diegorv/Dev/pet-projects/koko/brain'
const FDIR = `.scratch/${FEATURE}`
// Worktrees live under .claude/worktrees/ (ignored through .git/info/exclude), next to the others.
const WT = `${REPO}/.claude/worktrees`
// Full-gate logs live outside every worktree, so `git add` never commits them.
const LOGS = `${WT}/test-logs`

const BASE_RULES = `Repository: ${REPO} (git root). Kokobrain: Tauri 2 app, SvelteKit frontend in src/, Rust in src-tauri/, pnpm.
Process rules (also in CLAUDE.md "Implementation process"):
- All work for this Issue happens in its git worktree, never in the main checkout (except the final merge in 'merge' delivery). Paths in this prompt are relative to the worktree root unless absolute.
- Read CLAUDE.md, docs/TESTING.md, docs/COMMITS.md and docs/agents/issue-tracker.md, plus ${FDIR}/PRD.md or the feature's plan-*.md when present. CONTEXT.md and docs/adr/ may not exist; proceed silently if so. Everything you write (code, comments, docs, commits) is in English. Code uses tabs.
- Setup: a fresh worktree has no node_modules, so run \`pnpm install --frozen-lockfile\` at the worktree root first.
- Targeted checks while working: \`pnpm check\`, \`pnpm vitest run <file> ...\`, and for Rust \`cargo test --manifest-path src-tauri/Cargo.toml <filter>\`.
- The gate (CLAUDE.md rule 6) follows what the branch changed against ${BASE_BRANCH}: \`pnpm check\` + \`pnpm vitest run\` + \`pnpm build\` for the frontend, \`cargo test --manifest-path src-tauri/Cargo.toml\` for src-tauri/, both when both changed, and for docs-only changes just the tests that read them (or none); the deliver step picks it with a classifier. Run it only where your step says so (only deliver runs it), in the foreground, with nothing else running. Always save all of its output and read the result from that file: \`mkdir -p ${LOGS} && { git rev-parse --short HEAD; <each command>; echo exit=$?; } > ${LOGS}/${FEATURE}-<NN>-<step>.log 2>&1\` (stop at the first failing command and keep its exit code). Read the summary and failures with grep on the log. Never pipe the gate into \`tail\`, \`head\` or \`grep\`, and never run it again to see what failed or to double-check a pass. To check a fix, re-run only what failed.
- Never edit files outside the worktree. Never run \`git add -A\` or \`git add .\`: stage the files by name and check \`git diff --cached --stat\` before each commit.
- Progress notes go in the Issue file under "## Comments" (\`- YYYY-MM-DD HH:MM — <phase> — <one-line outcome> — <short sha>\`; get the time with \`date '+%Y-%m-%d %H:%M'\`), committed with your work.
- Commits follow docs/COMMITS.md (Conventional Commits with Context, Problem, Solution, Behavior, Files with line ranges), one per completed task, ending with "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".`
// Extra rules for one run (for example an environment note), appended as one more bullet; never stored here.
const RULES = a.extraRules ? `${BASE_RULES}\n- ${a.extraRules}` : BASE_RULES
// Progress-tree titles carry the feature and the Issue (meta.name must stay a literal).
const TAG = `${FEATURE} ${a.issue || 'next'}`
log(`Issue: ${TAG} (${DELIVERY})`)

const INFO = {
  type: 'object',
  properties: {
    issue: { type: 'string', description: 'two-digit Issue number' },
    issueFile: { type: 'string' },
    title: { type: 'string' },
    branch: { type: 'string' },
    worktree: { type: 'string', description: 'absolute path of the worktree root' },
    blocked: { type: 'boolean', description: 'true if no Issue could be started' },
    reason: { type: 'string' },
    report: { type: 'string', description: 'commits made, the checks run with their pass/fail counts, and anything left undone' },
  },
  required: ['issue', 'issueFile', 'title', 'branch', 'worktree', 'blocked', 'report'],
}

const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['APPROVED', 'CHANGES_REQUESTED'] },
    findings: { type: 'array', items: { type: 'string' }, description: 'one line per numbered finding in review.md: severity, file:line, fix' },
  },
  required: ['verdict', 'findings'],
}

phase(`Build ${TAG}`)
const info = await agent(`${RULES}

You are step 1 of 3 (build: discovery and implement) for feature "${FEATURE}".
1. Pick the Issue: ${a.issue ? `Issue ${a.issue} in ${FDIR}/issues/.` : `in ${FDIR}/issues/, take the lowest-numbered Issue whose \`Status:\` is \`ready-for-agent\` and whose "Blocked by" Issues are all done (their files no longer exist in ${FDIR}/issues/ on ${BASE_BRANCH}). An Issue in another status (needs-triage, needs-info, ready-for-human, wontfix) is never started. Every change of an Issue is committed on its branch and reaches ${BASE_BRANCH} only when that branch is merged, so list \`git -C ${REPO} branch --list 'issue/${FEATURE}-*'\` and \`git -C ${REPO} worktree list\`, and skip every Issue whose \`issue/${FEATURE}-<NN>-*\` branch or worktree exists; name each one you skipped in \`report\`, and in \`reason\` when that leaves none to start.`} If none can start, return blocked=true with the reason (and empty strings for the other fields) and stop.
2. Make sure the main checkout at ${REPO} is on ${BASE_BRANCH} and clean (if not, return blocked=true). Create the worktree: \`git -C ${REPO} worktree add -b issue/${FEATURE}-<NN>-<slug> ${WT}/${FEATURE}-<NN>-<slug> ${BASE_BRANCH}\` (reuse it if it already exists for this Issue). cd there; never edit ${REPO} directly. Run \`pnpm install --frozen-lockfile\`.
3. Discovery: in the worktree, read the Issue file and the feature's PRD or plan. Then read only the code the Issue changes: enough to plan, not a full inventory. Write a short ${FDIR}/work/<NN>/discovery.md (aim for under 40 lines): the files that change with file:line, the plan (smallest change that meets every acceptance criterion), the prior-art tests to copy, risks, and the defaults you took for open questions. When the Issue repeats a pattern from an earlier Issue's work folder, name that template and list only what differs. Issue file: leave \`Status: ready-for-agent\` (the branch and worktree mark it in flight) and add a "discovery" comment. Commit discovery.md + Issue file.
4. Implement the Issue so every acceptance criterion holds. Work test-first where there is a seam; every changed source file gets its test updated or created (CLAUDE.md rule 11). One commit per logical task. Run the targeted checks as you go; do not run the gate (deliver runs the only one). Before your last commit, run \`pnpm check\` (frontend) or the cargo tests of the touched modules (Rust), the test files of everything you touched, and every test that asserts a name or message you changed. Do not close the Issue. Add an "implement" comment with the last sha. Commit.
Return the structured result; \`report\` lists the commits made, the checks you ran with their pass/fail counts, and anything left undone.`, { label: `build:${a.issue || 'next'}`, phase: `Build ${TAG}`, model: 'opus', effort: EFFORT.build, schema: INFO })

if (!info || info.blocked) {
  log(`Stopped: ${info ? info.reason : 'build agent returned nothing'}`)
  return { stopped: true, reason: info ? info.reason : 'no result' }
}
const CTX = `Issue ${info.issue} — ${info.title}
Issue file: ${info.issueFile}
Worktree: ${info.worktree} (branch ${info.branch}). cd there for checks; never edit ${REPO} directly.
Discovery: ${FDIR}/work/${info.issue}/discovery.md`

phase(`Review ${info.issue}`)
const review = await agent(`${RULES}

You are step 2 of 3 (review). Be adversarial.
${CTX}
Build report: ${info.report}
Review \`git diff ${BASE_BRANCH}...HEAD\` in the worktree against: every acceptance criterion in the Issue (check each one, cite evidence), the PRD/plan's decisions, CLAUDE.md rules (layer rules, error handling, performance guidelines, tests for every changed source file), correctness bugs, missing tests, and scope creep. Run \`pnpm check\` when the diff touches the frontend. Do not run the gate (deliver runs the only one) and do not take test results from the build report: run the test files the diff adds or changes and the tests of the code it changes yourself, plus any probe you need. In review.md, say which test files your test verdict rests on.
Write ${FDIR}/work/${info.issue}/review.md: a verdict line \`VERDICT: APPROVED\` or \`VERDICT: CHANGES_REQUESTED\`, a checklist of acceptance criteria (met / not met + evidence), and numbered findings (severity, file:line, fix). Do not change source code. Add a "review" comment with the verdict to the Issue file. Commit review.md + Issue file. Return the verdict and one line per finding.`, { label: `review:${info.issue}`, phase: `Review ${info.issue}`, model: 'opus', effort: EFFORT.review, schema: VERDICT })

// No verdict, no delivery: an Issue never merges without an independent review.
if (!review) {
  const blocked = await agent(`${RULES}

The review agent of this Issue returned nothing, so it must not be delivered.
${CTX}
In the worktree, set the Issue's \`Status:\` to \`ready-for-human\` and add the comment "review — blocked: the review agent returned no verdict; rerun the review or ask the owner". Commit only the Issue file. Change nothing else; do not merge, push or remove the worktree.`, { label: `blocked:${info.issue}`, phase: `Review ${info.issue}`, model: 'opus', effort: 'low' })
  if (!blocked) {
    log(`Stopped: the review agent of ${info.issue} returned nothing, and so did the agent that hands it to a human; set its Status to ready-for-human by hand`)
    return { stopped: true, issue: info.issue, reason: 'the review agent returned nothing; the Issue still says ready-for-agent: set it to ready-for-human by hand' }
  }
  log(`Stopped: the review agent of ${info.issue} returned nothing; Issue set to ready-for-human`)
  return { stopped: true, issue: info.issue, reason: 'the review agent returned nothing' }
}
const clean = review.verdict === 'APPROVED' && review.findings.length === 0
const reviewText = `VERDICT: ${review.verdict}\n${review.findings.map((f, i) => `${i + 1}. ${f}`).join('\n') || '(no findings)'}`

phase(`Deliver ${info.issue}`)
const deliverSteps = DELIVERY === 'merge'
  ? `5. Deliver (merge): in the worktree, check \`git merge-base --is-ancestor ${BASE_BRANCH} HEAD\`; if ${BASE_BRANCH} moved, rebase onto it and repeat step 2 before merging. In the main checkout ${REPO}: \`git checkout ${BASE_BRANCH}\`, \`git merge --ff-only ${info.branch}\`, \`git push ${REMOTE} ${BASE_BRANCH}\`. Then \`git worktree remove\` the worktree and delete the local branch. If the push fails, keep the local merge and report it.`
  : `5. Deliver (pr): \`git push -u ${REMOTE} ${info.branch}\` and \`gh pr create --base ${BASE_BRANCH} --head ${info.branch}\` with the Issue title and a body summarising discovery, changes, review verdict and test results. Do not merge. Remove the worktree but keep the branch.`
const done = await agent(`${RULES}

You are step 3 of 3 (fix and deliver). Delivery mode: ${DELIVERY}.
${CTX}
Review result: ${reviewText}
1. ${clean ? 'The review approved with no findings: nothing to fix, go to step 2.' : `Fix every finding in ${FDIR}/work/${info.issue}/review.md that is correct (note any you reject and why in review.md under "## Resolution"). Read the diff and the files the findings name, not the whole codebase. Commit.`}
2. ${clean ? '' : 'Run the targeted checks for what you changed. Then, '}after your last source or test change, pick the gate: run \`git diff --name-only ${BASE_BRANCH}...HEAD | awk '${GATE_CLASSIFIER}'\` in the worktree. It prints a \`gate:\` line and each \`run:\` command, ready to run as printed; when it prints no \`run:\` line, or a docs \`run:\` line finds no test file, there is no gate and no log. If the Issue file has a **Gate:** line that asks for more than that (more commands or more tests), run the union: the stricter one wins, a looser Gate line never removes a command. Run the chosen gate once, saved to ${LOGS}/${FEATURE}-${info.issue}-deliver.log; it must pass before delivering. If it fails, read the failures from that log, fix them, re-run what failed, then run the same gate one more time (to ${LOGS}/${FEATURE}-${info.issue}-deliver-2.log). If it cannot pass, stop: set the Issue's \`Status:\` to \`ready-for-human\`, add a comment saying why, commit, and do not deliver.
3. ${DELIVERY === 'merge'
    ? `Close the Issue the Kokobrain way: in its own commit \`docs(scratch): close issue ${info.issue}: <title>\`, delete the Issue file; the commit body records what changed, the gate that ran and why (the classifier's \`gate:\` line and any reason it printed, and the Issue's Gate line when it added to it, or "no gate: docs only, no test reads them"), its results, and the review verdict. Keep ${FDIR}/work/${info.issue}/.`
    : `Leave \`Status: ready-for-agent\` (the open PR marks it in flight) and add a comment with the gate that ran and why (as the merge closing commit would name it), its results, and the review verdict. Commit. The Issue file is deleted only after the PR merges.`}
${deliverSteps}
Return: final status, merged sha or PR URL, gate results, and anything the user must do.`, { label: `deliver:${info.issue}`, phase: `Deliver ${info.issue}`, model: 'opus', effort: clean ? EFFORT.deliverClean : EFFORT.deliver })

return { issue: info.issue, title: info.title, delivery: DELIVERY, review: review.verdict, result: done }
