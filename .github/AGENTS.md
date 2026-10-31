# Pull requests and CI

Use the [PR review skill](../.agents/skills/apex-pr-review/SKILL.md). Keep workflow permissions minimal and changes scoped. CI should validate bundled data offline; never download paid/live F1 data or expose local credentials to pull requests.

Keep named checks stable so branch rules can target them. Add bounded timeouts for new jobs. Do not enable auto-merge, change repository access or branch protection without authorization for that configuration change. A template or passing check does not enforce branch protection by itself; report that distinction honestly.
