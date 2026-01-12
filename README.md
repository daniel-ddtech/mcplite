# mcplite

**Lighter context for Claude Code** - Load only the MCPs you need.

Each MCP server consumes context tokens (450-7,200+ tokens). With multiple MCPs enabled, you can lose 16,000+ tokens before writing a single prompt. mcplite lets you dynamically manage which MCPs are active, preserving your context window for what matters.

## Installation

### Via Claude Code Plugin Manager

```bash
/plugin marketplace add ddtech/mcplite
/plugin install mcplite@mcplite
```

### Manual Installation

```bash
git clone https://github.com/ddtech/mcplite ~/.claude/plugins/mcplite
cd ~/.claude/plugins/mcplite
npm install && npm run build
```

## Commands

| Command | Description |
|---------|-------------|
| `/mcplite:mcp-status` | Show active MCPs and token usage |
| `/mcplite:mcp-profile` | Switch between preset profiles |
| `/mcplite:mcp-add` | Enable specific MCPs |
| `/mcplite:mcp-clean` | Disable all MCPs (maximum context) |

## Profiles

Pre-configured MCP combinations for common workflows:

| Profile | MCPs | Tokens | Use Case |
|---------|------|--------|----------|
| **minimal** | exa | 650 | General coding with web search |
| **research** | exa, notion | 1,450 | Web research and documentation |
| **devops** | sentry, filesystem | 1,050 | Error tracking and file ops |
| **communication** | slack, notion | 1,300 | Team communication |
| **database** | supabase | 5,800 | Database-heavy projects |
| **scraping** | apify, exa | 7,850 | Web scraping and data collection |
| **full** | all 7 MCPs | 16,000 | Everything enabled |
| **empty** | none | 0 | Maximum context available |

## Supported MCPs

All packages verified on npm as of January 2025:

| MCP | Package | Tokens | Description |
|-----|---------|--------|-------------|
| **Supabase** | `@supabase/mcp-server-supabase` | 5,800 | Database, auth, storage, edge functions |
| **Apify** | `@apify/actors-mcp-server` | 7,200 | Web scraping and automation |
| **Exa** | `exa-mcp-server` | 650 | AI-powered web search |
| **Notion** | `@notionhq/notion-mcp-server` | 800 | Pages, databases, blocks |
| **Sentry** | `@sentry/mcp-server` | 600 | Error tracking and monitoring |
| **Slack** | `@modelcontextprotocol/server-slack` | 500 | Messaging and channels |
| **Filesystem** | `@modelcontextprotocol/server-filesystem` | 450 | File operations |

## Auto-Detection

mcplite automatically detects your project dependencies and suggests the optimal profile:

- Detects `package.json` dependencies (e.g., `@supabase/supabase-js`)
- Reads `.env` files for API keys (e.g., `SUPABASE_URL`)
- Checks for marker files (e.g., `supabase/config.toml`, `sentry.client.config.ts`)

## CLI Usage

```bash
# Show status
mcplite status

# Apply a profile
mcplite profile apply database

# Enable specific MCPs
mcplite enable supabase exa

# Disable MCPs
mcplite disable apify

# Disable all MCPs
mcplite clean

# Interactive startup prompt
mcplite prompt
```

## Configuration

User configuration is stored in `~/.claude/mcplite/`:

- `registry.json` - MCP definitions and token costs
- `profiles.json` - Profile configurations

Settings are applied to `~/.claude/settings.json`.

## Environment Variables

Set these for MCPs that require authentication:

```bash
# Supabase
SUPABASE_ACCESS_TOKEN=your_token

# Apify
APIFY_TOKEN=your_token

# Exa
EXA_API_KEY=your_key

# Notion
NOTION_API_KEY=your_key

# Sentry
SENTRY_AUTH_TOKEN=your_token

# Slack
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_TEAM_ID=T0123456789
```

## Requirements

- Node.js >= 18.0.0
- Claude Code >= 1.0.33

## License

MIT
