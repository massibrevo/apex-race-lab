# APEX engineering instructions

## Scope and architecture

APEX is a static browser replay and a separate Python/DuckDB/dbt learning pipeline. Read [CONTRIBUTING.md](CONTRIBUTING.md) for checks and [docs/engineering.md](docs/engineering.md) for data contracts. More specific `AGENTS.md` files apply within their directories.

- `dist/`: deployable HTML/CSS/JS, vendored Three.js and recorded read models. There is no frontend build step.
- `pipeline/`, `dbt/`, `dags/`: extraction/export, analytical transformations and manual Airflow orchestration.
- `dist/data/session-catalog.json`: authoritative application calendar and replay availability. Derive counts and availability from files; do not hardcode the current release's coverage in new behavior.
- `local/`, virtual environments, bronze caches, DuckDB files and credentials are machine-local. Keep them out of commits and deployment archives. Preserve unrelated local work and running services.

## Engineering decisions

Keep changes proportional to the request. Inspect the working tree before editing; stage explicit paths. Preserve the existing static architecture unless the task requires a change. Fix causes and add behavioral regression tests for substantive defects; avoid tests that simply repeat implementation or documentation wording.

Never fabricate GPS, timing, telemetry, availability or successful checks. Keep missing observations explicit. Preserve recorded lap numbers, participant identities, source attribution and the eight-minute excerpt disclosure. Do not conflate a complete calendar with complete GPS or lap coverage.

Use process environment variables for API credentials. Never commit tokens, passwords, raw logs containing credentials, private runtime state or absolute personal machine paths. Respect upstream authentication and rate limits; a restriction is not permission to bypass access controls or purchase a subscription.

## Workflow routing

Load only the skill relevant to the current work:

- [Data pipeline](.agents/skills/apex-data-pipeline/SKILL.md): ingestion, archives, DuckDB, dbt or Airflow changes.
- [Replay UI](.agents/skills/apex-replay-ui/SKILL.md): viewer behavior, rendering, accessibility or responsive layout.
- [PR review](.agents/skills/apex-pr-review/SKILL.md): preparing, reviewing or merging a change.
- [Sites release](.agents/skills/apex-sites-release/SKILL.md): publishing an application or archive update.

## Completion and authorization

Use the change-specific checks in CONTRIBUTING. Report what passed, what was not run and material limits. A parsed DAG is not an executed DAG; a passing unit suite is not browser QA; a saved Site version is not a deployed version.

Opening a PR, merging, publishing and changing Site access must stay within the user's authorization. Existing explicit authorization applies; do not ask repeatedly. These instructions do not grant new authorization. Before an authorized merge, review the final diff, resolve actionable findings and verify successful CI for the current PR head. Never bypass a failed check or branch protection to finish faster.
