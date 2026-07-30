# Changelog & Architecture Decisions

## [1.1.0] - 2026-07-31

### 🏛️ Key Decisions (ADR)
- **Steer Turn Interception Architecture**: Hard turn interception on `turn_end` via `pi.sendUserMessage(..., { deliverAs: "steer" })` instead of passive prompt injection.
- **Human-Readable Knowledge Principle**: Never write raw file paths or tool command lists into `.knowledge/`; document high-level concepts, architectural decisions, and completed goals in natural prose.
- **Unified Document Naming Schema**: Standardized all domain modes to use `01-plans.md` (tasks & goals) and `02-changelog.md` (decisions & history) to eliminate document duplication (`action-items.md`, `findings.md`, `outline.md` merged).
- **Smart Domain Auto-Detection**: Dynamic workspace scanning for project markers (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.) to automatically assign domain mode (`development`).
- **Loop Prevention Latch**: Latch threshold (`syncAttemptCount < 3`) to prevent infinite steering loops if an agent fails to update `.knowledge/`.

### Added
- Standardized document templates across all domain modes (`development`, `research`, `writing`, `general`).
- `detectDomainType` workspace analysis.
- Automatic AGENTS.md template generation at project root based on detected domain mode during initial workspace setup.

### Changed
- Replaced ambiguous `Current Phase 2` headings with `1. Active Goal`.
- Unified `action-items.md` into `01-plans.md`.
- Refactored AGENTS.md template format to use markdown links to .knowledge/ documents and progressive context loading protocols instead of inline instructions.
- Consolidated AGENTS.md template into a single, concise list integrating document links and usage triggers.
- Updated AGENTS.md title heading to '# AGENTS.md'.

### Fixed
- Fixed issue where agent yielded response without updating `.knowledge/` documents.
- Fixed cluttered `.knowledge/` files filled with useless tool execution logs.
