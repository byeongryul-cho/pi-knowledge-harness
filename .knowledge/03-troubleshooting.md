# Troubleshooting & Issue Log

## Resolved Issues

### Issue 1: Agent ignores .knowledge/ update instructions in prompt
- **Symptom**: Agent completed code changes and immediately yielded response to user without updating `.knowledge/` files.
- **Root Cause**: Passive system prompt additions (soft prompt injection) were treated as optional by LLMs focused on the primary user query.
- **Resolution**: Replaced passive prompt injection with hard turn interception (`turn_end` event + `pi.sendUserMessage(..., { deliverAs: "steer" })`).

### Issue 2: .knowledge/ files cluttered with raw file path lists
- **Symptom**: `.knowledge/action-items.md` contained appended `- [x] Modified file: ...` lists instead of human-readable feature summaries.
- **Root Cause**: `autoSyncKnowledgeBase` was mechanically formatting `sessionActivities` into file list blocks on session stop.
- **Resolution**: Completely removed file/command dumping logic. Enforced human-readable conceptual documentation written directly by the LLM agent during its turn.
