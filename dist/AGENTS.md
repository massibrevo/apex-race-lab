# Browser application

Follow the root instructions and [replay UI skill](../.agents/skills/apex-replay-ui/SKILL.md).

- Keep the viewer buildless and dependencies vendored with their licenses. Do not edit vendored Three.js to patch application behavior.
- Keep replay sampling and time/tyre selection in `replay.js` testable independently of rendering. Preserve the five-second interpolation/staleness limit unless the data contract is deliberately changed and tested.
- Load one selected race at a time. Dispose scene geometry/materials when switching; avoid per-frame network requests or rebuilding the scene on every tick.
- Derive participants, circuit orientation and availability from the selected archive. Timing-only sessions must open usable analysis, disable unavailable controls and explain missing GPS.
- Check keyboard controls, selection semantics, readable labels, narrow-screen overflow, reduced motion and WebGL fallback when the change affects them.
- Do not manually rewrite generated data as a UI fix. See [data instructions](data/AGENTS.md).

The entry script URL carries a short SHA-256 revision of `app.js`; refresh that query value when changing the entry script so existing clients load the new code. The small session catalog bypasses browser storage and race archives revalidate on selection to avoid stale timing-only availability after a release.
