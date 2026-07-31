# Development Conventions & Principles

## General Principles
- **NO EMOJI**: Do not use emojis in commit messages, code, comments, or documentation.
- **Terse & Grounded**: Every sentence carries a fact, decision, or constraint.
- **Spec & Plan First**: Architectural decisions must be reflected in `.knowledge/` before finishing turns.

## Knowledge Base & Decisions Rules
- **Decision Log Standard**: Record ONLY architectural decisions (ADRs), key design choices, and major milestone shifts in `.knowledge/decisions.md`.
- **No File-Level Logs**: Do NOT list individual file creations, edits, function additions, or tool execution history in `decisions.md` (Git tracks code diffs and commit logs).

## Code Style & Architecture
- **TypeScript**: Strictly typed, no redundant type guards (`ts-no-local-is-record`), no trivial single-expression wrapper functions (`ts-no-tiny-functions`).
- **Extension API**: Event-driven hooks using `@oh-my-pi/pi-coding-agent`.
- **Steer Interception**: Intercept `turn_end` events to enforce mandatory `.knowledge/` updates via `pi.sendUserMessage(..., { deliverAs: "steer" })`.
