---
description: Disable all MCPs for a clean session
---

# MCP Clean

Disable all MCPs to maximize available context for the current session.

Run this command:
```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/cli.js clean
```

## When to Use

- Starting a new task that doesn't need external tools
- Working with large codebases where context is precious
- Debugging MCP-related issues
- When you want maximum context for code review or analysis

After disabling all MCPs, remind the user to run `/mcp` to apply changes.

To re-enable MCPs later:
- `/mcplite:mcp-profile <name>` - Load a profile
- `/mcplite:mcp-add <mcp>` - Enable specific MCP
