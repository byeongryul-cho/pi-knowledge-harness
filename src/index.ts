import type {
  BeforeProviderRequestEvent,
  ExtensionAPI,
  ExtensionContext,
  SessionStartEvent,
  SessionStopEvent,
  ToolResultEvent,
  TurnEndEvent,
} from "@oh-my-pi/pi-coding-agent";
import fs from "node:fs";
import path from "node:path";

function getProjectMetadata(cwd: string): { name: string; description: string } {
  let name = path.basename(cwd);
  let description = "Workspace project managed by Pi Knowledge Harness.";

  try {
    const pkgPath = path.join(cwd, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.name) name = pkg.name;
      if (pkg.description) description = pkg.description;
      return { name, description };
    }

    const pyPath = path.join(cwd, "pyproject.toml");
    if (fs.existsSync(pyPath)) {
      const content = fs.readFileSync(pyPath, "utf-8");
      const nameMatch = content.match(/name\s*=\s*["']([^"']+)["']/);
      const descMatch = content.match(/description\s*=\s*["']([^"']+)["']/);
      if (nameMatch) name = nameMatch[1];
      if (descMatch) description = descMatch[1];
      return { name, description };
    }

    const cargoPath = path.join(cwd, "Cargo.toml");
    if (fs.existsSync(cargoPath)) {
      const content = fs.readFileSync(cargoPath, "utf-8");
      const nameMatch = content.match(/name\s*=\s*["']([^"']+)["']/);
      const descMatch = content.match(/description\s*=\s*["']([^"']+)["']/);
      if (nameMatch) name = nameMatch[1];
      if (descMatch) description = descMatch[1];
      return { name, description };
    }
  } catch (e) {
    // Fallback on parse error
  }

  return { name, description };
}

const KNOWLEDGE_TEMPLATES: Record<string, string> = {
  "overview.md": `# Project Overview & Index

## Summary
- **Project Name**: {{NAME}}
- **Description**: {{DESCRIPTION}}

## Core Purpose & Scope
<!-- High-level project purpose, objectives, and domain boundaries -->

## Key Stack & Concepts
<!-- Key technologies, modules, or core domain concepts -->
`,
  "conventions.md": `# Development Conventions

## General Principles
- **NO EMOJI**: Do not use emojis in commit messages, code, comments, or documentation.

## Git Commit Convention
- Format: \`<type>(<scope>): <subject>\`
- Types: \`feat\`, \`fix\`, \`docs\`, \`style\`, \`refactor\`, \`test\`, \`chore\`

## Code Style & Architecture
- Maintain clean module separation, type safety, and robust error handling.
`,
  "plans.md": `# Development Plans & Tasks

## Active Goal
<!-- Active feature or milestone goal -->

## In Progress
- [ ] Active Development Task

## Backlog / Todo
- [ ] Future backlog item

## Completed
- [x] Initial workspace setup
`,
  "changelog.md": `# Changelog & Architecture Decisions

## [Unreleased]

### Added
- Workspace initialization

### Changed

### Fixed
`,
  "troubleshooting.md": `# Troubleshooting Log

<!-- Document resolved bugs and issues -->
`,
  "architecture.md": `# Project Architecture & System Design

## System Overview
<!-- High-level description of system architecture and responsibilities -->

## Directory & Module Layout
<!-- Module organization, folder structure, and entry points -->

## Core Technical Patterns & Data Flow
<!-- Design patterns, key data flows, and subsystem integrations -->
`,
};

const AGENTS_TEMPLATE = `# AGENTS.md

This project uses a persistent knowledge base in \`.knowledge/\`. Load context progressively in the recommended priority order below:

- **Project Overview & Index**: [.knowledge/overview.md](.knowledge/overview.md) — Read first for project overview, core purpose, and key stack.
- **Conventions & Code Style**: [.knowledge/conventions.md](.knowledge/conventions.md) — Read for coding standards, git conventions, and core principles.
- **Architecture & System Design**: [.knowledge/architecture.md](.knowledge/architecture.md) — Read to understand module boundaries, directory layout, and data flow.
- **Active Plans & Tasks**: [.knowledge/plans.md](.knowledge/plans.md) — Read for active goals and backlog; update tasks upon completion.
- **Changelog & History**: [.knowledge/changelog.md](.knowledge/changelog.md) — Consult for historical decisions and architectural changes.
- **Troubleshooting & Known Issues**: [.knowledge/troubleshooting.md](.knowledge/troubleshooting.md) — Consult when investigating or resolving complex bugs.
`;

export default function piKnowledgeHarness(pi: ExtensionAPI) {
  let hasUnreflectedChanges = false;
  let syncAttemptCount = 0;

  pi.setLabel("Pi Knowledge Harness");

  function getWorkspaceDir(ctx?: ExtensionContext): string {
    return ctx?.cwd || process.cwd();
  }

  async function initKnowledgeBase(cwd: string): Promise<void> {
    const knowledgeDir = path.join(cwd, ".knowledge");

    if (!fs.existsSync(knowledgeDir)) {
      await fs.promises.mkdir(knowledgeDir, { recursive: true });
    }

    const metadata = getProjectMetadata(cwd);
    for (const [filename, rawContent] of Object.entries(KNOWLEDGE_TEMPLATES)) {
      const filePath = path.join(knowledgeDir, filename);
      if (!fs.existsSync(filePath)) {
        const content = rawContent
          .replace("{{NAME}}", metadata.name)
          .replace("{{DESCRIPTION}}", metadata.description);
        await fs.promises.writeFile(filePath, content);
      }
    }

    // Ensure AGENTS.md exists at project root
    const agentsPath = path.join(cwd, "AGENTS.md");
    if (!fs.existsSync(agentsPath)) {
      await fs.promises.writeFile(agentsPath, AGENTS_TEMPLATE);
    }

    // Ensure CLAUDE.md exists at project root referencing AGENTS.md
    const claudePath = path.join(cwd, "CLAUDE.md");
    if (!fs.existsSync(claudePath)) {
      await fs.promises.writeFile(claudePath, "@AGENTS.md\n");
    }
  }

  async function readKnowledgeFiles(knowledgeDir: string): Promise<string> {
    let result = "";

    async function scanDir(dir: string, relPath: string) {
      if (!fs.existsSync(dir)) return;
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const fileRel = path.join(relPath, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith(".")) {
            await scanDir(fullPath, fileRel);
          }
        } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
          try {
            const content = await fs.promises.readFile(fullPath, "utf-8");
            const truncatedContent = content.length > 16000 ? `${content.slice(0, 16000)}\n\n[... truncated for prompt length ...]` : content;
            result += `\n--- [FILE: .knowledge/${fileRel}] ---\n${truncatedContent}\n`;
          } catch (e) {
            pi.logger.warn(`Failed to read knowledge file ${fileRel}`, { error: String(e) });
          }
        }
      }
    }

    await scanDir(knowledgeDir, "");
    return result;
  }

  // 1. Session Start: Ensure .knowledge/ structure exists
  pi.on("session_start", async (_event: SessionStartEvent, ctx: ExtensionContext) => {
    try {
      const cwd = getWorkspaceDir(ctx);
      await initKnowledgeBase(cwd);
      ctx.ui?.notify("Pi Knowledge Harness Active", "info");
    } catch (err) {
      pi.logger.error("Failed to initialize Knowledge Base", { error: String(err) });
    }
  });

  // 2. Before Provider Request: Passively provide .knowledge/ context only
  pi.on("before_provider_request", async (event: BeforeProviderRequestEvent, ctx: ExtensionContext) => {
    const cwd = getWorkspaceDir(ctx);
    const knowledgeDir = path.join(cwd, ".knowledge");
    if (!fs.existsSync(knowledgeDir)) return;

    try {
      const aggregatedDocs = await readKnowledgeFiles(knowledgeDir);

      if (typeof event.payload === "object" && event.payload !== null) {
        const payload = event.payload as Record<string, unknown>;
        const knowledgeContext = `\n\n[PERSISTENT KNOWLEDGE BASE]
Active Knowledge Base Documents:
${aggregatedDocs}
`;

        if (typeof payload.systemPrompt === "string") {
          payload.systemPrompt += knowledgeContext;
        } else if (typeof payload.system === "string") {
          payload.system += knowledgeContext;
        } else if (Array.isArray(payload.messages)) {
          payload.messages.push({
            role: "system",
            content: knowledgeContext,
          });
        }
      }
    } catch (err) {
      pi.logger.warn("Failed to inject knowledge context", { error: String(err) });
    }

    return event.payload;
  });

  // 3. Track Session Tools Activity
  pi.on("tool_result", async (event: ToolResultEvent) => {
    const tool = event.toolName;

    if (["write", "edit", "ast_edit"].includes(tool)) {
      let pathArg = "";
      if (typeof event.input === "object" && event.input !== null) {
        const inputObj = event.input as Record<string, unknown>;
        if (typeof inputObj.path === "string") {
          pathArg = inputObj.path;
        } else if (Array.isArray(inputObj.paths)) {
          pathArg = inputObj.paths.join(", ");
        }
      }

      const isKnowledgeEdit = pathArg.split(/[/\\]/).some(segment => segment === ".knowledge" || segment.startsWith(".knowledge"));

      if (isKnowledgeEdit) {
        // Agent updated .knowledge -> Reset sync flags
        hasUnreflectedChanges = false;
        syncAttemptCount = 0;
      } else {
        hasUnreflectedChanges = true;
      }
    } else if (["bash", "web_search"].includes(tool)) {
      hasUnreflectedChanges = true;
    }
  });

  // 4. Turn End Interception: Hard Gate via Steer Turn
  pi.on("turn_end", async (_event: TurnEndEvent, ctx: ExtensionContext) => {
    if (!hasUnreflectedChanges) return;

    if (syncAttemptCount >= 3) {
      pi.logger.warn("Knowledge sync steer threshold reached (3 attempts). Bypassing to avoid infinite loop.");
      return;
    }

    const cwd = getWorkspaceDir(ctx);
    const knowledgeDir = path.join(cwd, ".knowledge");
    if (!fs.existsSync(knowledgeDir)) return;

    syncAttemptCount++;

    const steerInstruction = `MANDATORY KNOWLEDGE UPDATE REQUIRED:
You edited project files in this turn, but you have NOT updated .knowledge/ yet.

BEFORE YIELDING TO THE USER:
1. Execute an 'edit' or 'write' tool call on .knowledge/ (e.g. overview.md, plans.md, or changelog.md).
2. Document high-level completed goals, architectural decisions, or status updates in human-readable terms.
3. DO NOT list file paths or raw tool commands! Summarize the conceptual work and mark completed tasks [x].
Execute the .knowledge/ edit tool NOW!`;

    try {
      pi.sendUserMessage(steerInstruction, { deliverAs: "steer" });
    } catch (err) {
      pi.logger.error("Failed to deliver knowledge sync steer message", { error: String(err) });
    }
  });

  // 5. Session Stop: Safety net logging if unreflected changes remain
  pi.on("session_stop", async (_event: SessionStopEvent) => {
    if (hasUnreflectedChanges) {
      pi.logger.warn("Session stopped with unreflected project changes in .knowledge/.");
    }
  });
}
