# Development Plans & Milestones

## 1. Active Goal
- Steer Turn Interception Architecture & Unified Knowledge Base Naming Schema

## 2. In Progress
- [ ] Multi-session context compression and summarization enhancements

## 3. Backlog / Todo
- [ ] Support custom domain template overrides per project
- [ ] Add CLI flag for disabling knowledge harness per-session

## 4. Completed
- [x] Initial extension scaffold and event hooks
- [x] Auto-domain detection for `development`, `research`, `writing`, and `general` modes
- [x] Purge raw file-list dumping from `autoSyncKnowledgeBase`
- [x] Refactor to Steer Turn Interception architecture (`turn_end` + `deliverAs: "steer"`)
- [x] Enforce TypeScript strictness and rule compliance (`ts-no-local-is-record`, `ts-no-tiny-functions`)
- [x] Unified document naming schema (`01-plans.md`, `02-changelog.md`) across all domain modes
- [x] Replaced ambiguous `Current Phase 2` headings with `1. Active Goal`
- [x] Automatic AGENTS.md template generation on initial workspace setup
- [x] Refactor AGENTS.md structure to use progressive context loading protocol and markdown links to .knowledge/ files
- [x] Simplify AGENTS.md format to a single unified list combining knowledge links and usage context
- [x] Change AGENTS.md document title heading from '# Agent Guidelines (AGENTS.md)' to '# AGENTS.md'
- [x] Add 04-architecture.md template for development domain and link in AGENTS.md
- [x] Order AGENTS.md document links as a numbered priority list (Conventions -> Architecture -> Plans -> Changelog -> Troubleshooting)
- [x] Purge obsolete /knowledge-sync slash command and references across codebase and documentation
- [x] Remove file modification safety net from session_stop event handler to prevent comment clutter in plans
- [x] Complete codebase review and purge dead code (`recentActivities`), fix path boundary checks for `.knowledge`

