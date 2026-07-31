# Project Architecture & System Design

## System Overview
`pi-knowledge-harness` is a Universal Knowledge Base Harness Extension for OMP (Oh My Pi) and Pi coding agents.
It maintains persistent project context in `.knowledge/` and enforces active knowledge reflection through event hooks and hard steering.

## Directory & Module Layout
- `src/index.ts`: Core extension entry point containing domain auto-detection, config parsing, template instantiation, prompt injection, tool activity tracking, steer interception, slash commands, and safety-net logging.
- `AGENTS.md`: Project-root guideline file created during initialization. Directs agents to load context progressively using markdown links to `.knowledge/` documents.
- `.knowledge/`: Persistent workspace directory holding overview (`overview.md`), guidelines (`conventions.md`), active goals (`plans.md`), architecture decisions (`decisions.md`), troubleshooting notes (`troubleshooting.md`), and system architecture (`architecture.md`).

## Core Technical Patterns & Hooks
- **Domain Auto-Detection (`detectDomainType`)**: Scans workspace indicators (`package.json`, `Cargo.toml`, `notebooks`, `chapters`, etc.) to classify workspace mode as `development`, `research`, `writing`, or `general`.
- **Knowledge Base Setup (`initKnowledgeBase`)**: Instantiates missing `.knowledge/` structure, configuration files, domain templates, and the project-root `AGENTS.md` file.
- **Context Injection (`before_provider_request`)**: Reads `.knowledge/*.md` files and passively injects aggregated context into system prompt payloads before sending requests to LLM providers.
- **Activity Tracking (`tool_result`)**: Tracks workspace modifications (`write`, `edit`, `ast_edit`, `bash`, `web_search`). Reset when `.knowledge/` edits are detected; otherwise flags unreflected changes.
- **Hard Steer Interception (`turn_end`)**: Intercepts turn completion when workspace edits remain unreflected, sending a steering message via `pi.sendUserMessage(..., { deliverAs: "steer" })` up to a latch limit (3 retries) to prevent loops.
- **Slash Commands**:
  - `/knowledge-mode <mode>`: Dynamically switches domain modes and provisions new domain templates.
