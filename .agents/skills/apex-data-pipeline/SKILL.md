---
name: apex-data-pipeline
description: Change or investigate APEX ingestion, recorded archives, DuckDB, dbt or Airflow while preserving provenance and measured-data contracts.
---

Read [engineering contracts](../../../docs/engineering.md) and the affected directory's `AGENTS.md`; inspect the catalog and actual files before asserting coverage.

Trace the change through extraction/cache → compact export → transactional warehouse → dbt build/tests → gold enrichment → archive validation. Change only the stages the request requires. Use the pinned pipeline environment, with a separate constrained Airflow environment for orchestration.

For new or changed inputs, check participant membership, unique session/driver/lap keys, finite sensor ranges, monotonic timestamps, UTC excerpt bounds and reference-lap continuity. Keep absent timings null and empty GPS explicit. A 401/403 should preserve an honest timing-only result and remain resumable; do not fabricate data or work around upstream access controls.

Keep one warehouse writer and bounded HTTP retries. Reuse bronze caches; avoid an unnecessary full backfill. Do not publish gold based on stale warehouse/dbt evidence. `pipeline/publish.py` rewrites tracked JSON, so use an isolated validation checkout when regeneration is outside scope.

Run the data checks in [CONTRIBUTING](../../../CONTRIBUTING.md), inspect generated diffs and report calendar, timing and GPS coverage separately. Record unexecuted Airflow or browser checks as limits, not successes. Use the release skill only when deployment is within scope and authorized.
