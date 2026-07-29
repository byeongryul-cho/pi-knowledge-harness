# pi-knowledge-harness

> Universal Knowledge Base Harness Extension for OMP (Oh My Pi).
> Enables persistent cross-session knowledge accumulation across **Development**, **Research**, **Writing**, and **General Work Management** workflows.

## Features

- 🧠 **Cross-Session Knowledge Persistence**: Automatically maintains project context in a `.knowledge/` directory.
- 🔀 **4 Domain Modes**:
  - `development`: Coding conventions (`conventions.md`), architecture (`architecture.md`), troubleshooting (`troubleshooting.md`).
  - `research`: Key findings (`findings.md`), reference sources (`sources.md`).
  - `writing`: Tone & style guide (`style-guide.md`), glossary (`glossary.md`), outline (`outline.md`).
  - `general`: Key decisions (`decisions.md`), action items (`action-items.md`).
- ⚡ **Auto Context Injection**: Inject `.knowledge/` documents into the LLM system prompt before every request.
- 📝 **Automatic Activity Logging**: Tracks modified files, searches, and reads, appending session summaries to `.knowledge/history/`.
- 🛡️ **Non-Destructive Mode Switching**: Switching modes adds new missing templates without overwriting existing data.

## Installation

### Local Project Mode
To use `pi-knowledge-harness` in a specific project, place this repo or link it under `.omp/extensions/`:

```bash
mkdir -p .omp/extensions
cp -r /path/to/pi-knowledge-harness .omp/extensions/
```

### Global Mode
To enable `pi-knowledge-harness` across all your OMP sessions globally:

```bash
mkdir -p ~/.omp/agent/extensions
cp /path/to/pi-knowledge-harness/src/index.ts ~/.omp/agent/extensions/pi-knowledge-harness.ts
```

## Usage & Slash Commands

- `/knowledge-sync`: View current knowledge mode and tracked session activities.
- `/knowledge-mode <mode>`: Switch domain mode on the fly (`development`, `research`, `writing`, `general`).

## License

MIT
