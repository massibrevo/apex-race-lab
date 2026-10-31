# Python ingestion and warehouse

Use the [data pipeline skill](../.agents/skills/apex-data-pipeline/SKILL.md) and [engineering contracts](../docs/engineering.md).

Keep extraction bounded, rate-limited, resumable and cache-aware. Do not convert an authentication failure into silent synthetic success. Validate numeric domains, participant membership, timestamps and complete reference-lap GPS before declaring replay availability.

Keep file writes atomic where readers consume them. Preserve the transactional bulk warehouse load and single-writer assumption. The desktop DuckDB UI uses a separate snapshot; do not attach the live warehouse in a long-lived UI session that blocks pipeline writers.

`publish.py` enriches exported files and changes provenance timestamps. Run it in a disposable checkout for validation when the task does not intentionally regenerate archives. A successful old dbt result alone does not prove newly changed inputs were tested; build the warehouse and dbt models from the inputs being published.
