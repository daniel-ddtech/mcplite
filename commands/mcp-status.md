---
description: Show active MCPs with token usage
---

# MCP Status

Show the current state of MCP servers and their context token costs.

Run this command to display MCP status:
```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/cli.js status
```

The output shows:
- Active MCPs with their token costs
- Available (inactive) MCPs
- Total token usage as percentage of context
- Optimization suggestions

After viewing status, you can:
- Use `/mcplite:mcp-profile <name>` to switch profiles
- Use `/mcplite:mcp-clean` to disable all MCPs
- Run `/mcp` to reconnect after any changes
