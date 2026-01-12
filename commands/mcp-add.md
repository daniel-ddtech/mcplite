---
description: Enable a specific MCP
---

# MCP Add

Enable one or more MCP servers by name.

The user provides MCP name(s) as "$ARGUMENTS". Run:
```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/cli.js enable $ARGUMENTS
```

## Available MCPs

| MCP | Description | Tokens |
|-----|-------------|--------|
| supabase | Database, auth, storage, edge functions | ~5,800 |
| apify | Web scraping and automation | ~7,200 |
| exa | AI-powered web search | ~650 |
| pg | PostgreSQL documentation | ~600 |
| github | GitHub repository operations | ~1,200 |
| posthog | Product analytics, feature flags | ~4,500 |
| fetch | Web page fetching | ~400 |
| filesystem | Extended file operations | ~350 |

## Examples

- `/mcplite:mcp-add supabase` - Enable Supabase
- `/mcplite:mcp-add supabase pg` - Enable multiple MCPs

After enabling, remind the user to run `/mcp` to reconnect.
