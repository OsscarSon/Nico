# P2 implementation plan and inventory

Base main: `0aa1b1c0aea2fd0df8135f6ba7e092112f967d2e`; branch `codex/nico-p2-ui-ux`.

1. Unify route presentation from the existing Academy curriculum and legacy lesson registry; expose A21/A22 as non-learnable planned nodes in A3, with four collapsible A units and real per-unit counts.
2. Add independently versioned local preferences; retain the existing progress v1 import/merge/export/clear functions. Implement actual theme/system, font, density, motion, landing, planned display, home continuation, nickname/path and AI shortcut settings.
3. Refine responsive tokens/layouts at 1440/1280/1024/768/390/360; keep narrow reading measure, widen safe illustrations/simulations, build a real-data profile and settings center. Preserve original branding and mobile proportions.
4. Install independent kit assets without overwrites; run all checks and applicable browser suites, inspect before/after screenshots and verify protected bytes, document every requirement and submit one PR without merge/deployment.

## Inventory / decisions

- Home, PathsCatalog, CoursesCatalog, TrackPage/PathMap, LessonPlayer, Lab/Prompt/Tutor, Projects, Me and Settings are the existing surfaces. Academy `curriculum.json` (212 entries) provides stage/availability; legacy catalog/content supplies actual lesson IDs, units and quality; progress v1 supplies completion/resume/days; badges derive from real completion.
- Main already contains a10 art, F/M track art and local import/export Settings. Keep these user changes. Baseline typecheck/lint/build and 605 unit tests pass.
- Kit SHA256 manifest verified. All 86 existing public/art files hashed before edits; no kit filename conflicts. A16 old illustration compared visually: matches TLS but subject is right-shifted. User explicitly approved the centered kit A16 option on 2026-11-17; old `lesson-a16-https-lock.png` stays unchanged.
- Use all 14 independent PNGs and retain matching SVG originals; no contact-sheet crop, new illustrations, dependencies or font downloads. Keep the existing/system font stacks with offline fallbacks.
- New route view model does not register A21/A22 lesson content or change prerequisites, scores, completed records or quality. Draft, availability, current/next and completion remain separate.
- New preference key `nico-preferences` v1; migrate appearance from `nico-theme`/`nico-settings`, retain old storage and protect malformed preferences before a user writes changes. No account/cloud/private uploads or invented XP/hours/ranks.
