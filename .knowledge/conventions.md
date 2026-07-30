# Development Conventions & Principles

## General Principles
- **NO EMOJI**: Do not use emojis in commit messages, code, comments, or documentation.
- **Terse & Grounded**: Every sentence carries a fact, decision, or constraint.
- **Spec & Plan First**: Architectural decisions must be reflected in `.knowledge/` before finishing turns.

## Code Style & Architecture
- **TypeScript**: Strictly typed, no redundant type guards (`ts-no-local-is-record`), no trivial single-expression wrapper functions (`ts-no-tiny-functions`).
- **Extension API**: Event-driven hooks using `@oh-my-pi/pi-coding-agent`.
- **Steer Interception**: Intercept `turn_end` events to enforce mandatory `.knowledge/` updates via `pi.sendUserMessage(..., { deliverAs: "steer" })`.
