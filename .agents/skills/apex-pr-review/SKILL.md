---
name: apex-pr-review
description: Prepare, review and complete an authorized APEX pull request with concise descriptions, change-specific evidence and current-head CI checks.
---

Read [CONTRIBUTING](../../../CONTRIBUTING.md) and inspect working-tree changes, the base branch and repository merge requirements. Preserve unrelated work; use a focused branch and explicit staging.

Write the PR for a reviewer without chat history: concrete problem, final behavior, why the approach fits, actual validation and material data/release limits. Use the template as a prompt, removing irrelevant sections and conversational history. Never label planned checks as completed or invent independent approval.

Review the final diff for correctness, regression risk, missing-data semantics, credentials/runtime files and unintended generated churn. For meaningful findings, explain the trigger and consequence; resolve them before merging. Run checks proportional to the change and report unavailable checks honestly.

When merging is authorized, identify the exact current head SHA and verify `agent-guidance`, `validate`, `airflow-dag` and any additional repository-required checks are completed successfully. Refresh evidence after changes. If checks fail or the branch conflicts, fix the cause and repeat affected validation; do not bypass protections. Merge with an expected head SHA and verify the returned merged state. A changed head or unresolved requirement stops that merge attempt until inspected.

Attach the PR to the current chat when the tool is available. Synchronize the local checkout without discarding other changes. Publishing Sites is a separate authorized operation, not an automatic consequence of merging documentation.
