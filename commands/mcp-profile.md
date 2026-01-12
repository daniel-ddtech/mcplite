---
description: Switch MCP profile or list available profiles
---

# MCP Profile

Manage MCP profiles to quickly switch between different tool configurations.

If a profile name is provided as "$ARGUMENTS", apply that profile:
```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/cli.js profile apply $ARGUMENTS
```

If no arguments provided, list all available profiles:
```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/cli.js profile list
```

## Available Profiles

| Profile | MCPs | Tokens |
|---------|------|--------|
| minimal | exa | ~650 |
| database | supabase, pg | ~6,400 |
| scraping | apify, exa, fetch | ~8,250 |
| research | exa, fetch | ~1,050 |
| analytics | posthog, supabase | ~10,300 |
| full | all MCPs | ~20,700 |
| empty | none | 0 |

After applying a profile, remind the user to run `/mcp` to reconnect.
