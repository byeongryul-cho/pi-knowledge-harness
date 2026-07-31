# Changelog & Architecture Decisions

## [1.1.0] - 2026-07-31

### 🏛️ Key Decisions (ADR)
- **Steer Turn Interception Architecture**: Hard turn interception on `turn_end` via `pi.sendUserMessage(..., { deliverAs: "steer" })` instead of passive prompt injection.
- **Human-Readable Knowledge Principle**: Never write raw file paths or tool command lists into `.knowledge/`; document high-level concepts, architectural decisions, and completed goals in natural prose.
- **Unified Document Naming Schema**: Standardized all domain modes to use `01-plans.md` (tasks & goals) and `02-changelog.md` (decisions & history) to eliminate document duplication (`action-items.md`, `findings.md`, `outline.md` merged).
- **Smart Domain Auto-Detection**: Dynamic workspace scanning for project markers (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.) to automatically assign domain mode (`development`).
- **Loop Prevention Latch**: Latch threshold (`syncAttemptCount < 3`) to prevent infinite steering loops if an agent fails to update `.knowledge/`.
- **Removal of `.knowledge/README.md`**: Removed static `README.md` creation inside `.knowledge/` directory during workspace setup, as `AGENTS.md` and `.knowledge/config.yml` already serve as entry points and static READMEs do not update when switching domain modes.
- **Universal `00-overview.md` Index**: Added `00-overview.md` as the primary index document across all domain modes (`development`, `research`, `writing`, `general`). Auto-populates project name and description from project manifests (`package.json`, `pyproject.toml`, `Cargo.toml`).
- **Un-numbered Knowledge Document Filenames & Headings**: Removed all numeric prefixes (`00-`, `01-`, `02-`, `03-`, `04-`) and heading numbers from all Knowledge documents (`overview.md`, `conventions.md`, `plans.md`, `changelog.md`, `troubleshooting.md`, `architecture.md`).

### Added
- Standardized document templates across all domain modes (`development`, `research`, `writing`, `general`).
- `detectDomainType` workspace analysis.
- Automatic AGENTS.md template generation at project root based on detected domain mode during initial workspace setup.
- Added '04-architecture.md' template for development mode and linked it in AGENTS.md for system architecture context.
- Added `00-overview.md` index template across all domain modes and set it as step 1 in `AGENTS.md`.
- Added `getProjectMetadata` workspace scanner to automatically populate project name and description in `00-overview.md`.
- Automatic `CLAUDE.md` creation containing `@AGENTS.md` at project root on workspace initialization.

### Changed
- Replaced ambiguous `Current Phase 2` headings with `1. Active Goal`.
- Unified `action-items.md` into `01-plans.md`.
- Refactored AGENTS.md template format to use markdown links to .knowledge/ documents and progressive context loading protocols instead of inline instructions.
- Consolidated AGENTS.md template into a single, concise list integrating document links and usage triggers.
- Updated AGENTS.md title heading to '# AGENTS.md'.
- Reordered AGENTS.md document links as a numbered priority list to guide sequential context loading.
- Removed obsolete /knowledge-sync command superseded by automatic steer turn interception.
- Removed `.knowledge/README.md` boilerplate file creation from `initKnowledgeBase`.
- Updated steer turn interception instruction to explicitly prompt AI agents to enrich `.knowledge/00-overview.md` along with plans and changelogs.
- Renamed all Knowledge template filenames (`overview.md`, `conventions.md`, `plans.md`, `changelog.md`, `troubleshooting.md`, `architecture.md`) and removed numeric heading prefixes across all domain modes.

### Fixed
- Fixed issue where agent yielded response without updating `.knowledge/` documents.
- Fixed cluttered `.knowledge/` files filled with useless tool execution logs.
- Fixed `session_stop` safety net appending HTML comment clutter to `01-plans.md` on session close.
- Fixed potential path segment false-positives for .knowledge/ detection and removed dead code ('recentActivities').
