# pi-knowledge-harness

> Universal Knowledge Base Harness Extension for OMP (Oh My Pi) and Pi.
> Enables persistent cross-session knowledge accumulation across Development, Research, Writing, and General Work Management workflows.

## Features

- Cross-Session Knowledge Persistence: Automatically maintains project context in a `.knowledge/` directory.
- 4 Domain Modes:
  - `development`: Coding conventions (`conventions.md`), architecture (`architecture.md`), troubleshooting (`troubleshooting.md`).
  - `research`: Key findings (`findings.md`), reference sources (`sources.md`).
  - `writing`: Tone & style guide (`style-guide.md`), glossary (`glossary.md`), outline (`outline.md`).
  - `general`: Key decisions (`decisions.md`), action items (`action-items.md`).
- Auto Context Injection: Inject `.knowledge/` documents into the LLM system prompt before every request.
- Automatic Activity Logging: Tracks modified files, searches, and reads, appending session summaries to `.knowledge/history/`.
- Non-Destructive Mode Switching: Switching modes adds new missing templates without overwriting existing data.

## Installation

### For OMP (Oh My Pi)

Install directly using OMP's built-in plugin manager:

```bash
omp plugin install github:byeongryul-cho/pi-knowledge-harness
```

Or via full Git URL:

```bash
omp plugin install https://github.com/byeongryul-cho/pi-knowledge-harness
```

---

### For Pi

Install directly using Pi's plugin manager:

```bash
pi plugin install github:byeongryul-cho/pi-knowledge-harness
```

Or via full Git URL:

```bash
pi plugin install https://github.com/byeongryul-cho/pi-knowledge-harness
```

---

## Usage & Slash Commands

Once installed, the extension automatically activates on session startup and creates `.knowledge/` in your workspace.

- `/knowledge-sync`: View current knowledge mode and tracked session activities.
- `/knowledge-mode <mode>`: Switch domain mode on the fly (`development`, `research`, `writing`, `general`).

```text
/knowledge-mode research     # Switch to Research mode
/knowledge-mode writing      # Switch to Writing mode
/knowledge-mode development  # Switch to Software Development mode
/knowledge-mode general      # Switch to General Management mode
```

## Management Commands

- View installed plugins: `omp plugin list` / `pi plugin list`
- Uninstall plugin: `omp plugin uninstall pi-knowledge-harness` / `pi plugin uninstall pi-knowledge-harness`

## License

MIT
