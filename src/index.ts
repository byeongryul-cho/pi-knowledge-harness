import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import fs from "node:fs";
import path from "node:path";

/**
 * Supported Knowledge Base Domain Modes
 */
export type KnowledgeType = "development" | "research" | "writing" | "general";

export interface KnowledgeConfig {
  type: KnowledgeType;
  title: string;
}

const DOMAIN_TEMPLATES: Record<KnowledgeType, Record<string, string>> = {
  development: {
    "conventions.md": `# Coding Conventions & Standards

## Code Style
- Language & Framework:
- Naming Conventions: camelCase for variables/functions, PascalCase for classes/components.
- Formatting: 2 spaces indent, semicolons enabled.

## Commit & Branch Policy
- Commit format: \`feat:\`, \`fix:\`, \`docs:\`, \`refactor:\`
- Branching: \`main\` (stable), \`feature/*\` for new work.
`,
    "architecture.md": `# Architecture & System Design

## Tech Stack
- Frontend:
- Backend:
- Database / Storage:

## Module Boundaries
- Brief description of system components and data flow.
`,
    "troubleshooting.md": `# Troubleshooting & Issue Log

## Resolved Issues
- [YYYY-MM-DD] **Issue Title**: Root cause and resolution.
`,
  },

  research: {
    "findings.md": `# Key Research Findings & Insights

## Summary of Discoveries
- **Core Topic**:
- **Key Insight 1**:
- **Key Insight 2**:

## Comparative Analysis
| Category | Option A | Option B | Pros / Cons |
| :--- | :--- | :--- | :--- |
`,
    "sources.md": `# Reference Sources & Literature

## Evaluated Sources
- [Title / Link]: Key takeaways and validity assessment.
- [Article / Paper]: Relevant statistics or quotes.
`,
  },

  writing: {
    "style-guide.md": `# Content Style Guide

## Target Audience
- Primary readers:

## Tone of Voice
- Style: Professional, concise, evidence-based, approachable.
- Formatting rules: Active voice, clear section headings, bulleted lists for key facts.

## Terminology Rules
- Preferred terms vs forbidden jargon.
`,
    "glossary.md": `# Terminology & Glossary

- **Term A**: Definition and canonical usage.
- **Term B**: Preferred translation / alias.
`,
    "outline.md": `# Content Structure & Draft Outline

## Current Draft Outline
1. Introduction & Context
2. Key Points & Arguments
3. Conclusion & Next Steps
`,
  },

  general: {
    "decisions.md": `# Key Decisions (ADR)

## Decision History
- **[YYYY-MM-DD] Decision Title**:
  - Context:
  - Decision:
  - Impact:
`,
    "action-items.md": `# Action Items & To-Do Tracking

## Active Tasks
- [ ] Task 1 (Owner / Priority)
- [ ] Task 2

## Completed
- [x] Initial workspace setup
`,
  },
};

export default function piKnowledgeHarness(pi: ExtensionAPI) {
  const sessionActivities: string[] = [];

  pi.setLabel("Pi Knowledge Harness");

  /**
   * Reads .knowledge/config.yml mode or defaults to general
   */
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
        pi.logger.warn("Failed to parse .knowledge/config.yml, falling back to default.", e);
      }
    }

    return { type, title };
  }

  /**
   * Initializes .knowledge/ structure according to domain mode
   */
  async function initKnowledgeBase(cwd: string): Promise<KnowledgeConfig> {
    const knowledgeDir = path.join(cwd, ".knowledge");
    const historyDir = path.join(knowledgeDir, "history");

    if (!fs.existsSync(knowledgeDir)) {
      await fs.promises.mkdir(historyDir, { recursive: true });

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

    // Populate missing domain templates
    const templates = DOMAIN_TEMPLATES[config.type] || {};
    for (const [filename, content] of Object.entries(templates)) {
      const filePath = path.join(knowledgeDir, filename);
      if (!fs.existsSync(filePath)) {
        await fs.promises.writeFile(filePath, content);
      }
    }

    return config;
  }

  // 1. Session Start: Ensure .knowledge/ structure exists
  pi.on("session_start", async (_event, ctx) => {
    try {
      const config = await initKnowledgeBase(ctx.cwd);
      ctx.ui?.notify(`Pi Knowledge Harness Active [Mode: ${config.type.toUpperCase()}]`, "info");
    } catch (err) {
      pi.logger.error("Failed to initialize Knowledge Base", err);
    }
  });

  // 2. Before Provider Request: Inject .knowledge/ documents into System Prompt
  pi.on("before_provider_request", async (event) => {
    const knowledgeDir = path.join(process.cwd(), ".knowledge");
    if (!fs.existsSync(knowledgeDir)) return;

    try {
      const config = await loadConfig(knowledgeDir);
      const files = await fs.promises.readdir(knowledgeDir);
      let aggregatedDocs = "";

      for (const file of files) {
        if (file.endsWith(".md") && file !== "README.md") {
          const content = await fs.promises.readFile(path.join(knowledgeDir, file), "utf-8");
          aggregatedDocs += `\n--- [FILE: .knowledge/${file}] ---\n${content.slice(0, 2000)}\n`;
        }
      }

      event.systemPrompt += `\n\n[PERSISTENT KNOWLEDGE BASE - Mode: ${config.type.toUpperCase()}]
You are backed by a persistent .knowledge/ base across sessions.
- Always check and respect existing principles/data in .knowledge/ files.
- When new insights, decisions, or conventions emerge during this session, explicitly note them so they can be persisted.

Active Knowledge Files:
${aggregatedDocs}
`;
    } catch (err) {
      pi.logger.warn("Failed to inject knowledge context", err);
    }
  });

  // 3. Track Session Tools Activity
  pi.on("tool_result", async (event) => {
    const tool = event.toolName;
    if (["write", "edit", "ast_edit"].includes(tool)) {
      const pathArg = event.input?.path || (event.input?.paths ? event.input.paths.join(", ") : "file");
      if (typeof pathArg === "string" && !pathArg.includes(".knowledge")) {
        sessionActivities.push(`Modified file: \`${pathArg}\``);
      }
    } else if (tool === "web_search") {
      sessionActivities.push(`Web Search: "${event.input?.query || "query"}"`);
    } else if (tool === "read") {
      const pathArg = event.input?.path;
      if (typeof pathArg === "string" && !pathArg.includes(".knowledge")) {
        sessionActivities.push(`Read: \`${pathArg}\``);
      }
    }
  });

  // 4. Session Stop: Automatically write session summary to .knowledge/history/
  pi.on("session_stop", async (_event, ctx) => {
    if (sessionActivities.length === 0) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const historyDir = path.join(ctx.cwd, ".knowledge", "history");
    const historyFile = path.join(historyDir, `session-${timestamp}.md`);

    const logContent = `# Session Activity Log (${new Date().toLocaleString()})

## Actions Executed
${sessionActivities.map((act) => `- ${act}`).join("\n")}
`;

    try {
      await fs.promises.mkdir(historyDir, { recursive: true });
      await fs.promises.writeFile(historyFile, logContent);
      ctx.ui?.notify(`Persisted session activity to .knowledge/history/`, "info");
    } catch (err) {
      pi.logger.error("Failed to write session history log", err);
    }
  });

  // 5. Slash Command: /knowledge-sync
  pi.registerCommand("knowledge-sync", {
    description: "Sync current session activities and check .knowledge status",
    handler: async (_args, ctx) => {
      const knowledgeDir = path.join(ctx.cwd, ".knowledge");
      const config = await loadConfig(knowledgeDir);
      ctx.ui?.notify(
        `Knowledge Mode: ${config.type.toUpperCase()} | Tracked Activities: ${sessionActivities.length}`,
        "info"
      );
    },
  });

  // 6. Slash Command: /knowledge-mode <mode>
  pi.registerCommand("knowledge-mode", {
    description: "Switch .knowledge domain mode (development | research | writing | general)",
    handler: async (args, ctx) => {
      const targetMode = args.trim().toLowerCase() as KnowledgeType;
      const validModes: KnowledgeType[] = ["development", "research", "writing", "general"];

      if (!validModes.includes(targetMode)) {
        ctx.ui?.notify(`Invalid mode. Allowed: ${validModes.join(", ")}`, "error");
        return;
      }

      const knowledgeDir = path.join(ctx.cwd, ".knowledge");
      const configPath = path.join(knowledgeDir, "config.yml");

      await fs.promises.mkdir(knowledgeDir, { recursive: true });
      await fs.promises.writeFile(configPath, `type: ${targetMode}\ntitle: ${targetMode.toUpperCase()} Knowledge Base\n`);

      await initKnowledgeBase(ctx.cwd);
      ctx.ui?.notify(`Switched Knowledge Harness Mode to [${targetMode.toUpperCase()}]`, "info");
    },
  });
}
