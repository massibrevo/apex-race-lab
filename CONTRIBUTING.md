# Contributing to APEX

Read [AGENTS.md](AGENTS.md) for architecture and [engineering.md](docs/engineering.md) for data contracts. Project-specific workflows live in [.agents/skills](.agents/skills). They are versioned instructions, not a guarantee of defect-free changes or permission to merge/deploy.

## Local verification

Use Node 22 and Python 3.12. `make setup` installs the pinned pipeline environment. Airflow has a separate constrained environment as described in the engineering guide.

| Change | Verification |
|---|---|
| Instructions, skills or PR templates | `make guidance` and `git diff --check`; skill frontmatter and local links must validate |
| Replay logic or application JS | `npm run check`, `npm test`; add a regression test for substantive behavior changes |
| Viewer interactions or layout | Above plus browser QA for affected playback, cameras, drivers, season changes, exports and a narrow viewport; inspect console errors |
| JSON archives, extraction, warehouse or SQL | `make test`, rebuild warehouse, `make transform`, then archive tests again; inspect coverage/provenance and JSON diffs |
| Airflow | Parse in the isolated Airflow environment and verify catalog parameters/dependency chain; safely execute changed runtime behavior when feasible |
| Deployment | Follow the Sites release skill; verify the deployment result and preserve public access |

`make transform` writes gold enrichment into tracked read models. For a docs-only validation of the entire pipeline, use a disposable checkout rather than creating unrelated JSON changes. Do not run multiple warehouse writers or a full ingestion/backfill merely to check a documentation edit.

## Pull requests

Use a focused branch and the [PR template](.github/pull_request_template.md). Lead with the problem and resulting behavior. Include exact checks/results, data availability or schema implications, and any checks you could not run. Keep details proportional to the change; remove unused template sections. Do not mark planned checks as passed.

Before requesting an authorized merge:

1. Inspect the final diff, including generated files, dependencies and secrets/runtime state exclusions.
2. Resolve actionable findings. If the head changes, update the description and verify CI on the new head.
3. Require successful, completed checks for the current PR head: `agent-guidance`, `validate`, and `airflow-dag`. Inspect failures rather than bypassing them. Honor any additional repository checks or review requirements.
4. Confirm the PR remains mergeable and the base has not introduced an unresolved conflict. Merge using an expected head SHA; do not use an administrator bypass.
5. Verify GitHub reports the PR merged, synchronize the local checkout without overwriting other work, and report the PR link, merge result and validation limits.

These are project workflow requirements. They do not change GitHub branch protection or manufacture an independent approval. Merge and publication still require authorization from the user/task.

## Data and release evidence

Describe recorded coverage separately from the 48-race calendar. Retain the eight-minute GPS excerpt disclosure and explicit timing-only behavior. Do not imply all lap records are complete just because a session endpoint was queried. A release needs tested inputs, matching source/archive provenance and a successful production deployment; a GitHub merge alone does not publish Sites.
