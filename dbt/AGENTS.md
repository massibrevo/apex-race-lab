# Analytical transformations

Follow the [data pipeline skill](../.agents/skills/apex-data-pipeline/SKILL.md).

Preserve session-scoped driver/lap keys and null timing semantics. State exclusions and limits in model descriptions; pace means are not fuel-, traffic- or weather-adjusted predictions. Use `source()` and `ref()` for lineage. Add contract tests for material model changes, including uniqueness, required fields, ranges or relationships as applicable.

Run `dbt build --profiles-dir .` from this directory after rebuilding the warehouse with the candidate read models. Do not remove failing tests or loosen tolerances to accommodate corrupt data. Investigate source incompleteness separately from transformation defects. Keep `target/`, `logs/` and database binaries untracked.
