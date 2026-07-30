# Project Overview & Index

## 1. Summary
- **Project Name**: pi-knowledge-harness
- **Description**: Universal Knowledge Base Harness Extension for OMP (Oh My Pi) and Pi across Development, Research, Writing, and General workflows.

## 2. Core Purpose & Scope
- **Persistent Knowledge Management**: Automatically initializes and maintains structured project knowledge in `.knowledge/` across CLI sessions.
- **Multi-Domain Workflows**: Supports `development`, `research`, `writing`, and `general` domain modes with tailored document templates.
- **Steer Turn Interception**: Intercepts `turn_end` events when project files are edited without `.knowledge/` updates, delivering hard steer messages to compel documentation.
- **Context Injection**: Passively injects aggregated `.knowledge/*.md` contents into LLM system prompts before requests are dispatched.

## 3. Key Stack & Architecture
- **Runtime & Language**: TypeScript, Node.js, Bun.
- **Extension API**: `@oh-my-pi/pi-coding-agent` event-driven hooks (`session_start`, `before_provider_request`, `tool_result`, `turn_end`).
- **Core Files**: `src/index.ts` (monolithic extension handler), `AGENTS.md` (root context loader), `.knowledge/` (structured markdown storage).
