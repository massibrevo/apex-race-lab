# Recorded read models

Use the [data pipeline skill](../../.agents/skills/apex-data-pipeline/SKILL.md). These JSON files are generated product inputs, not fixtures to alter until tests pass.

Rebuild through the pipeline, inspect provenance and measured coverage, then validate the catalog and every affected archive. Keep `session.replay_available`, catalog flags, GPS/telemetry/track contents and availability reasons consistent. Exclude non-participant streams and invalid sensor values; do not clamp them into plausible observations.

Source restrictions must remain explicit. Timing-only records are valid degraded data, not evidence of a complete GPS replay. Review the JSON diff for unexpected deletion, scope changes and unrelated timestamp-only churn before committing.
