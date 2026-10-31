---
name: apex-sites-release
description: Publish authorized APEX application or archive changes to the existing Sites project with matching tested source and deployment provenance; excludes documentation-only PRs.
---

Read [root instructions](../../../AGENTS.md), the [verification matrix](../../../CONTRIBUTING.md), and the installed Sites skill when available. If Sites tools are unavailable, prepare verified source and report the deployment limit rather than claiming publication.

Read `.openai/hosting.json` for the existing project ID and fetch current Site access. Preserve identity, public audience and unrelated configuration. Keep source credentials in memory/stdin and machine-local/runtime data excluded from source and packaging. Do not create a replacement Site for an update.

Validate the candidate application and recorded read models before packaging. Use the provider's source helper to synchronize and package the exact source commit; pass its returned project ID, commit SHA and unchanged archive to the native version-save/deployment tools. For a public Site use the public/shared deployment path, not an owner-private shortcut.

Retain saved-version/deployment IDs across retries. Poll only pending/building/publishing results. Confirm a successful terminal deployment and its URL; inspect reported failures before retrying. A saved version, successful Git push or local preview is not proof of production publication.

Report actual timing/GPS availability and the eight-minute excerpt limit. If source scope changes during a release, revalidate affected inputs and rebuild matching provenance before publishing.
