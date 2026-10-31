---
name: apex-replay-ui
description: Implement or verify APEX browser replay, telemetry analysis, 3D rendering, accessibility and responsive interactions; excludes unrelated pipeline-only work.
---

Read [browser instructions](../../../dist/AGENTS.md) and inspect `dist/app.js`, `dist/replay.js` and representative available/timing-only archives.

Preserve the buildless deployment, lazy per-race loading, measured sampling semantics and scene cleanup. Keep time-indexing logic testable outside Three.js. Treat a sparse source as missing data, not an invitation to simulate plausible values. Season changes must use actual participants and venue metadata.

Run JS syntax and replay behavior tests. For changed interactions, serve `dist/` locally and exercise affected controls, a GPS replay, a timing-only race, driver comparison, timeline boundaries and exports. Check a narrow viewport, keyboard interaction and browser errors. Inspect fallback/reduced-motion behavior if touched; do not claim those were tested solely because the normal WebGL view loaded.

Record observable results and any unavailable browser infrastructure in the PR. Do not expand a bounded UI change into a framework migration, dependency update or data backfill without a concrete need.
