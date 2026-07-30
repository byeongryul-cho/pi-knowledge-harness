import type {
  BeforeProviderRequestEvent,
  ExtensionAPI,
  ExtensionContext,
  SessionStartEvent,
  SessionStopEvent,
  ToolResultEvent,
} from "@oh-my-pi/pi-coding-agent";
import fs from "node:fs";
import path from "node:path";

export type KnowledgeType = "development" | "research" | "writing" | "general";

export interface KnowledgeConfig {
  type: KnowledgeType;
  title: string;
}

interface ActivityEntry {
  timestamp: string;
  type: "tool" | "input" | "decision";
  description: string;
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

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

## 1. Current Phase
<!-- Active feature or milestone goal -->

## 2. In Progress
- [ ] Task 1

## 3. Backlog / Todo
- [ ] Future improvement 1

## 4. Completed
- [x] Initial setup
`,
    "02-changelog.md": `# Changelog & Architecture Decisions

## [Unreleased]

### Added
- Initial workspace structure

### Changed

### Fixed
`,
    "03-troubleshooting.md": `# Troubleshooting Log

<!-- Document resolved bugs and issues -->
`,
  },

  research: {
    "findings.md": `# Research Findings & Insights

## Key Takeaways
- Insight 1

## Literature & Resources
- Resource 1
`,
    "hypotheses.md": `# Research Hypotheses & Experiments

## Open Questions
- Question 1

## Experiments
- [ ] Experiment 1
`,
  },

  writing: {
    "outline.md": `# Document Outline & Structure

## Section 1: Overview
- Key point

## Section 2: Main Content
`,
    "drafts.md": `# Working Drafts & Working Notes
`,
  },

  general: {
    "decisions.md": `# Key Decisions (ADR)

## Decision Log
- Initial architecture established.
`,
    "action-items.md": `# Action Items & To-Do Tracking

## Active Tasks
- [ ] Task 1

## Completed
- [x] Initial workspace setup
`,
  },
};

export default function piKnowledgeHarness(pi: ExtensionAPI) {
  const sessionActivities: ActivityEntry[] = [];

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
      const defaultConfig = `type: general\ntitle: Universal Knowledge Base\n`;
      await fs.promises.writeFile(path.join(knowledgeDir, "config.yml"), defaultConfig);

      const defaultReadme = `# Universal Knowledge Base

- **Created**: ${new Date().toISOString()}
- **Mode**: General

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

  // 2. Before Provider Request: Inject .knowledge/ documents into System Prompt
  function getDomainGuideline(type: KnowledgeType): string {
    switch (type) {
      case "development":
        return "Every time you create skills, write code, make architectural decisions, or modify task status, continuously update .knowledge/ files (e.g., 01-plans.md, 02-changelog.md, 00-conventions.md, 03-troubleshooting.md).";
      case "research":
        return "Every time you uncover key insights, analyze sources, or test hypotheses, continuously update .knowledge/ files (e.g., findings.md, hypotheses.md, action-items.md).";
      case "writing":
        return "Every time you outline structures, refine drafts, or establish terminology, continuously update .knowledge/ files (e.g., outline.md, drafts.md).";
      case "general":
      default:
        return "Every time you reach key decisions, define action items, or update task progress, continuously update .knowledge/ files (e.g., decisions.md, action-items.md).";
    }
  }

  // 2. Before Provider Request: Inject .knowledge/ documents into System Prompt
  pi.on("before_provider_request", async (event: BeforeProviderRequestEvent, ctx: ExtensionContext) => {
    const cwd = getWorkspaceDir(ctx);
    const knowledgeDir = path.join(cwd, ".knowledge");
    if (!fs.existsSync(knowledgeDir)) return;

    try {
      const config = await loadConfig(knowledgeDir);
      const aggregatedDocs = await readKnowledgeFiles(knowledgeDir);

      const unreflectedChanges = sessionActivities.filter(a => a.type === "tool");
      const domainGuideline = getDomainGuideline(config.type);

      if (isRecord(event.payload)) {
        let knowledgePrompt = `\n\n[PERSISTENT KNOWLEDGE BASE - Mode: ${config.type.toUpperCase()}]
You are backed by a persistent .knowledge/ base across sessions.
- MANDATORY PRINCIPLE: ${domainGuideline}
- CONTINUOUS WORKFLOW: NEVER yield or finish your turn without ensuring the active .knowledge/ base reflects all findings, decisions, outlines, or progress from this session.

Active Knowledge Files:
${aggregatedDocs}
`;

        if (unreflectedChanges.length > 0) {
          knowledgePrompt += `\n[UNREFLECTED SESSION ACTIVITIES DETECTED]
You have performed ${unreflectedChanges.length} tool activities in this session:
${unreflectedChanges.slice(-5).map(a => `- [${a.timestamp}] ${a.description}`).join("\n")}

CRITICAL INSTRUCTION: Before completing your turn, YOU MUST IMMEDIATELY UPDATE the active .knowledge/ files so cross-session context is preserved regardless of domain (development, research, writing, general)!
`;
        }

        if (typeof event.payload.systemPrompt === "string") {
          event.payload.systemPrompt += knowledgePrompt;
        } else if (typeof event.payload.system === "string") {
          event.payload.system += knowledgePrompt;
        } else if (Array.isArray(event.payload.messages)) {
          event.payload.messages.push({
            role: "system",
            content: knowledgePrompt,
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
    const timestamp = new Date().toLocaleTimeString();

    if (["write", "edit", "ast_edit"].includes(tool)) {
      let pathArg = "file";
      if (isRecord(event.input)) {
        if (typeof event.input.path === "string") {
          pathArg = event.input.path;
        } else if (Array.isArray(event.input.paths)) {
          pathArg = event.input.paths.join(", ");
        }
      }

      if (!pathArg.includes(".knowledge")) {
        sessionActivities.push({
          timestamp,
          type: "tool",
          description: `Modified file: \`${pathArg}\` using tool \`${tool}\``,
        });
      } else {
        // Clear pending unreflected activity warnings once agent updates .knowledge
        sessionActivities.length = 0;
      }
    } else if (tool === "bash") {
      const cmd = isRecord(event.input) && typeof event.input.command === "string" ? event.input.command : "bash";
      sessionActivities.push({
        timestamp,
        type: "tool",
        description: `Executed command: \`${cmd}\``,
      });
    } else if (tool === "web_search") {
      const query = isRecord(event.input) && typeof event.input.query === "string" ? event.input.query : "";
      sessionActivities.push({
        timestamp,
        type: "tool",
        description: `Web Search: "${query}"`,
      });
    }
  });


  async function autoSyncKnowledgeBase(cwd: string) {
    if (sessionActivities.length === 0) return;

    const knowledgeDir = path.join(cwd, ".knowledge");
    if (!fs.existsSync(knowledgeDir)) return;

    try {
      const config = await loadConfig(knowledgeDir);
      const activitiesToSync = [...sessionActivities];
      
      let targetFile = "action-items.md";
      if (config.type === "development") targetFile = "01-plans.md";
      else if (config.type === "research") targetFile = "findings.md";
      else if (config.type === "writing") targetFile = "drafts.md";

      const filePath = path.join(knowledgeDir, targetFile);
      if (fs.existsSync(filePath)) {
        let content = await fs.promises.readFile(filePath, "utf-8");
        const timestamp = new Date().toLocaleDateString();
        
        let appendContent = `\n\n### Auto-Synced Activities (${timestamp})\n`;
        for (const act of activitiesToSync) {
          appendContent += `- [x] ${act.description}\n`;
        }

        content += appendContent;
        await fs.promises.writeFile(filePath, content, "utf-8");
        sessionActivities.length = 0;
      }
    } catch (err) {
      pi.logger.warn("Failed to auto-sync knowledge base", { error: String(err) });
    }
  }

  // 5. Slash Command: /knowledge-sync
  pi.registerCommand("knowledge-sync", {
    description: "Sync current session activities and update .knowledge files",
    handler: async (_args: string, ctx: ExtensionContext) => {
      const cwd = getWorkspaceDir(ctx);
      const knowledgeDir = path.join(cwd, ".knowledge");
      const config = await loadConfig(knowledgeDir);
      const count = sessionActivities.length;
      
      await autoSyncKnowledgeBase(cwd);

      ctx.ui?.notify(
        `Knowledge Mode: ${config.type.toUpperCase()} | Synced ${count} Session Activities to .knowledge/`,
        "info"
      );
    },
  });

  // 6. Slash Command: /knowledge-mode <mode>
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

  // 7. Session Stop: Automatically safety-net sync any unreflected session activities
  pi.on("session_stop", async (_event: SessionStopEvent, ctx: ExtensionContext) => {
    try {
      const cwd = getWorkspaceDir(ctx);
      await autoSyncKnowledgeBase(cwd);
    } catch (err) {
      pi.logger.error("Failed to auto-sync Knowledge Base on session stop", { error: String(err) });
    }
  });
}
