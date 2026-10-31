# Airflow orchestration

Follow the [data pipeline skill](../.agents/skills/apex-data-pipeline/SKILL.md).

Use the isolated Airflow environment and `APEX_ROOT`; do not hardcode a developer's checkout. Keep DAG import free of network requests and data mutations. Derive allowed sessions from the catalog. Pass user parameters through typed validation and quoted environment variables rather than interpolating unchecked shell fragments.

Preserve the dependency order: export → warehouse → dbt tests → gold publication → archive validation. Keep the manual schedule and one active writer unless scheduling/concurrency changes are explicitly in scope. Validate parsing and dependencies after changes; execute a safe test run when execution behavior changes and distinguish it from parsing in the PR evidence.
