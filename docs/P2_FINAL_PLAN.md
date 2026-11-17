# P2 final incremental plan

Base main `2ec1628` already contains merged P2 PR #8; branch `codex/nico-p2-final-visual-ai`.

1. Read the latest one-shot brief and reference; verify upload checksums, preserve all 114 art files, compare every reference file and Git blob history before changing AI behavior.
2. Apply the two supplied Hero backgrounds, retain the original pale illustration in a separate left-aligned preview, and build a small-size SVG brand mark from the supplied candidate shape as explicitly allowed; preserve old assets.
3. Remove Settings About/diagnostics/profile modules, retain functional preferences and data tools, and keep profile editing/clearing exclusively under My without changing preference/progress schemas.
4. Verify 1440/1280/390/360 Hero layouts and 24/32/48 logo usage, old AI assertions plus disabled/mock/failure browser paths, existing checks and smoke suites; deliver one report and PR without merge/deployment.

Comparison: 22 of 23 reference files exactly match current main, including promptScore, model prompts, feedback, client/config/protocol, prompt/tutor UI, server/quota and existing samples/tests. Only Settings differs (P2 presentation/preferences/data-tool changes). Git history contains matching blobs: core `8e169338`, PromptLab `23198d35`, art mapping `0aa1b1c0`, reference Settings `f8fab7a2`. This identifies content provenance, not independent proof of Claude authorship. Keep identical logic rather than inventing a rollback.
