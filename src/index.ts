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

export type KnowledgeType = "development" | "research" | "writing" | "general";

export interface KnowledgeConfig {
  type: KnowledgeType;
  title: string;
}


function detectDomainType(cwd: string): KnowledgeType {
  try {
    const files = fs.readdirSync(cwd);
    const hasCodeIndicator = files.some(f => 
      ["package.json", "tsconfig.json", "cargo.toml", "go.mod", "pyproject.toml"].includes(f.toLowerCase()) ||
      f.endsWith(".tf") ||
      f === "src" ||
      f === "shared"
    );
    if (hasCodeIndicator) return "development";

    const hasResearchIndicator = files.some(f =>
      ["paper", "thesis", "data", "notebooks"].includes(f.toLowerCase()) || f.endsWith(".ipynb")
    );
    if (hasResearchIndicator) return "research";

    const hasWritingIndicator = files.some(f =>
      ["drafts", "manuscript", "chapters", "articles"].includes(f.toLowerCase())
    );
    if (hasWritingIndicator) return "writing";
  } catch (e) {
    // Fallback to general on error
  }
  return "general";
}

// Unified Core Templates across all domains:
// 01-plans.md: Tasks, Goals, and Completed Milestones
// 02-changelog.md: Decisions, Findings, Draft Notes, and History
const DOMAIN_TEMPLATES: Record<KnowledgeType, Record<string, string>> = {
  development: {
    "00-conventions.md": `# Development Conventions

## 1. General Principles
- **NO EMOJI**: Do not use emojis in commit messages, code, comments, or documentation.

## 2. Git Commit Convention
- Format: \`<type>(<scope>): <subject>\`
- Types: \`feat\`, \`fix\`, \`docs\`, \`style\`, \`refactor\`, \`test\`, \`chore\`

## 3. Code Style & Architecture
- Maintain clean module separation, type safety, and robust error handling.
`,
    "01-plans.md": `# Development Plans & Tasks

## 1. Active Goal
<!-- Active feature or milestone goal -->

## 2. In Progress
- [ ] Active Development Task

## 3. Backlog / Todo
- [ ] Future backlog item

## 4. Completed
- [x] Initial workspace setup
`,
    "02-changelog.md": `# Changelog & Architecture Decisions

## [Unreleased]

### Added
- Workspace initialization

### Changed

### Fixed
`,
    "03-troubleshooting.md": `# Troubleshooting Log

<!-- Document resolved bugs and issues -->
`,
    "04-architecture.md": `# Project Architecture & System Design

## 1. System Overview
<!-- High-level description of system architecture and responsibilities -->

## 2. Directory & Module Layout
<!-- Module organization, folder structure, and entry points -->

## 3. Core Technical Patterns & Data Flow
<!-- Design patterns, key data flows, and subsystem integrations -->
`,
  },

  research: {
    "00-conventions.md": `# Research Methodology & Guidelines

## 1. Principles
- Maintain source citations and evidence-backed notes.
`,
    "01-plans.md": `# Research Plans & Hypotheses

## 1. Active Goal
<!-- Primary research objective -->

## 2. In Progress
- [ ] Active Hypothesis Test

## 3. Backlog / Todo
- [ ] Future experiment

## 4. Completed
- [x] Initial research setup
`,
    "02-changelog.md": `# Research Findings & Insights Log

## Key Takeaways
- Initial findings established.
`,
  },

  writing: {
    "00-conventions.md": `# Writing Style & Guidelines

## 1. Tone & Voice
- Clear, concise, and structured prose.
`,
    "01-plans.md": `# Writing Structure & Tasks

## 1. Active Goal
<!-- Document or article objective -->

## 2. In Progress
- [ ] Active Section Drafting

## 3. Backlog / Todo
- [ ] Future section

## 4. Completed
- [x] Initial outline created
`,
    "02-changelog.md": `# Working Drafts & Notes Log

## Draft History
- Initial structure created.
`,
  },

  general: {
    "01-plans.md": `# Project Plans & Tasks

## 1. Active Goal
<!-- Main project objective -->

## 2. In Progress
- [ ] Active Task

## 3. Backlog / Todo
- [ ] Future task

## 4. Completed
- [x] Initial workspace setup
`,
    "02-changelog.md": `# Decisions & Change Log

## Decision Log
- Initial architecture & conventions established.
`,
  },
};
const AGENTS_TEMPLATES: Record<KnowledgeType, string> = {
  development: `# AGENTS.md

This project uses a persistent knowledge base in \`.knowledge/\`. Load context progressively in the recommended priority order below:

1. **Conventions & Code Style**: [.knowledge/00-conventions.md](.knowledge/00-conventions.md) — Read first for coding standards, git conventions, and core principles.
2. **Architecture & System Design**: [.knowledge/04-architecture.md](.knowledge/04-architecture.md) — Read to understand module boundaries, directory layout, and data flow.
3. **Active Plans & Tasks**: [.knowledge/01-plans.md](.knowledge/01-plans.md) — Read for active goals and backlog; update tasks upon completion.
4. **Changelog & History**: [.knowledge/02-changelog.md](.knowledge/02-changelog.md) — Consult for historical decisions and architectural changes.
5. **Troubleshooting & Known Issues**: [.knowledge/03-troubleshooting.md](.knowledge/03-troubleshooting.md) — Consult when investigating or resolving complex bugs.
`,
  research: `# AGENTS.md

This project uses a persistent knowledge base in \`.knowledge/\`. Load context progressively in the recommended priority order below:

1. **Research Methodology & Guidelines**: [.knowledge/00-conventions.md](.knowledge/00-conventions.md) — Read first for research standards and citation rules.
2. **Research Plans & Hypotheses**: [.knowledge/01-plans.md](.knowledge/01-plans.md) — Read for active research goals; update tasks upon completion.
3. **Findings & Insights Log**: [.knowledge/02-changelog.md](.knowledge/02-changelog.md) — Consult and update when documenting new findings and conclusions.
`,
  writing: `# AGENTS.md

This project uses a persistent knowledge base in \`.knowledge/\`. Load context progressively in the recommended priority order below:

1. **Writing Style & Guidelines**: [.knowledge/00-conventions.md](.knowledge/00-conventions.md) — Read first for tone, style, and structure guidelines.
2. **Writing Structure & Tasks**: [.knowledge/01-plans.md](.knowledge/01-plans.md) — Read for outline and draft milestones; update as sections complete.
3. **Working Drafts & Notes Log**: [.knowledge/02-changelog.md](.knowledge/02-changelog.md) — Consult and update when making draft notes and version changes.
`,
  general: `# AGENTS.md

This project uses a persistent knowledge base in \`.knowledge/\`. Load context progressively in the recommended priority order below:

1. **Project Plans & Tasks**: [.knowledge/01-plans.md](.knowledge/01-plans.md) — Read first for active goals; update tasks upon completion.
2. **Decisions & Change Log**: [.knowledge/02-changelog.md](.knowledge/02-changelog.md) — Consult for key project decisions; update when recording change logs.
`,
};

export default function piKnowledgeHarness(pi: ExtensionAPI) {
  let hasUnreflectedChanges = false;
  let syncAttemptCount = 0;

  pi.setLabel("Pi Knowledge Harness");

  function getWorkspaceDir(ctx?: ExtensionContext): string {
    return ctx?.cwd || process.cwd();
  }

  async function loadConfig(knowledgeDir: string): Promise<KnowledgeConfig> {
    const configPath = path.join(knowledgeDir, "config.yml");
    let type: KnowledgeType = "general";
    let title = "Universal Knowledge Base";

    if (fs.existsSync(configPath)) {
      try {
        const raw = await fs.promises.readFile(configPath, "utf-8");
        if (raw.includes("type: development")) type = "development";
        else if (raw.includes("type: research")) type = "research";
        else if (raw.includes("type: writing")) type = "writing";
        else if (raw.includes("type: general")) type = "general";

        const titleMatch = raw.match(/title:\s*["']?([^"'\n]+)["']?/);
        if (titleMatch) title = titleMatch[1].trim();
      } catch (e) {
        pi.logger.warn("Failed to parse .knowledge/config.yml, falling back to default.", { error: String(e) });
      }
    }

    return { type, title };
  }

  async function initKnowledgeBase(cwd: string): Promise<KnowledgeConfig> {
    const knowledgeDir = path.join(cwd, ".knowledge");

    if (!fs.existsSync(knowledgeDir)) {
      await fs.promises.mkdir(knowledgeDir, { recursive: true });
      const detectedType = detectDomainType(cwd);
      const defaultConfig = `type: ${detectedType}\ntitle: ${detectedType.toUpperCase()} Knowledge Base\n`;
      await fs.promises.writeFile(path.join(knowledgeDir, "config.yml"), defaultConfig);

      const defaultReadme = `# ${detectedType.toUpperCase()} Knowledge Base

- **Created**: ${new Date().toISOString()}
- **Mode**: ${detectedType}

This directory stores persistent project knowledge across all OMP sessions.
`;
      await fs.promises.writeFile(path.join(knowledgeDir, "README.md"), defaultReadme);
    }

    const config = await loadConfig(knowledgeDir);

    const templates = DOMAIN_TEMPLATES[config.type] || {};
    for (const [filename, content] of Object.entries(templates)) {
      const filePath = path.join(knowledgeDir, filename);
      if (!fs.existsSync(filePath)) {
        await fs.promises.writeFile(filePath, content);
      }
    }

    // Ensure AGENTS.md exists at project root
    const agentsPath = path.join(cwd, "AGENTS.md");
    if (!fs.existsSync(agentsPath)) {
      const agentsTemplate = AGENTS_TEMPLATES[config.type] || AGENTS_TEMPLATES.general;
      await fs.promises.writeFile(agentsPath, agentsTemplate);
    }
    return config;
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
      const config = await initKnowledgeBase(cwd);
      ctx.ui?.notify(`Pi Knowledge Harness Active [Mode: ${config.type.toUpperCase()}]`, "info");
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
      const config = await loadConfig(knowledgeDir);
      const aggregatedDocs = await readKnowledgeFiles(knowledgeDir);

      if (typeof event.payload === "object" && event.payload !== null) {
        const payload = event.payload as Record<string, unknown>;
        const knowledgeContext = `\n\n[PERSISTENT KNOWLEDGE BASE - Mode: ${config.type.toUpperCase()}]
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
1. Execute an 'edit' or 'write' tool call on .knowledge/01-plans.md or .knowledge/02-changelog.md.
2. Document high-level completed goals, architectural decisions, or status updates in human-readable terms.
3. DO NOT list file paths or raw tool commands! Summarize the conceptual work and mark completed tasks [x].
Execute the .knowledge/ edit tool NOW!`;

    try {
      pi.sendUserMessage(steerInstruction, { deliverAs: "steer" });
    } catch (err) {
      pi.logger.error("Failed to deliver knowledge sync steer message", { error: String(err) });
    }
  });


  // 5. Slash Command: /knowledge-mode <mode>
  pi.registerCommand("knowledge-mode", {
    description: "Switch .knowledge domain mode (development | research | writing | general)",
    handler: async (args: string, ctx: ExtensionContext) => {
      const targetMode = args.trim().toLowerCase() as KnowledgeType;
      const validModes: KnowledgeType[] = ["development", "research", "writing", "general"];

      if (!validModes.includes(targetMode)) {
        ctx.ui?.notify(`Invalid mode. Allowed: ${validModes.join(", ")}`, "error");
        return;
      }

      const cwd = getWorkspaceDir(ctx);
      const knowledgeDir = path.join(cwd, ".knowledge");
      const configPath = path.join(knowledgeDir, "config.yml");

      await fs.promises.mkdir(knowledgeDir, { recursive: true });
      await fs.promises.writeFile(configPath, `type: ${targetMode}\ntitle: ${targetMode.toUpperCase()} Knowledge Base\n`);

      await initKnowledgeBase(cwd);
      ctx.ui?.notify(`Switched Knowledge Harness Mode to [${targetMode.toUpperCase()}]`, "info");
    },
  });

  // 6. Session Stop: Safety net logging if unreflected changes remain
  pi.on("session_stop", async (_event: SessionStopEvent) => {
    if (hasUnreflectedChanges) {
      pi.logger.warn("Session stopped with unreflected project changes in .knowledge/.");
    }
  });
}
