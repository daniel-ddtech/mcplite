# mcplite

**Lighter context for Claude Code** - Load only the MCPs you need.

Each MCP server consumes context tokens (350-7,200+ tokens). With multiple MCPs enabled, you can lose 20,000+ tokens before writing a single prompt. mcplite lets you dynamically manage which MCPs are active, preserving your context window for what matters.

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
| **research** | exa, fetch | 1,050 | Web research and documentation |
| **database** | supabase, pg | 6,400 | Database-heavy projects |
| **scraping** | apify, exa, fetch | 8,250 | Web scraping and data collection |
| **analytics** | posthog, supabase | 10,300 | Product analytics work |
| **full** | all 8 MCPs | 20,700 | Everything enabled |
| **empty** | none | 0 | Maximum context available |

## Supported MCPs

| MCP | Tokens | Description |
|-----|--------|-------------|
| **Supabase** | 5,800 | Database, auth, storage, edge functions |
| **Apify** | 7,200 | Web scraping and automation |
| **PostHog** | 4,500 | Product analytics and experiments |
| **GitHub** | 1,200 | Repository operations, issues, PRs |
| **Exa** | 650 | AI-powered web search |
| **PostgreSQL** | 600 | PostgreSQL documentation |
| **Fetch** | 400 | Web page fetching |
| **Filesystem** | 350 | Extended file operations |

## Auto-Detection

mcplite automatically detects your project dependencies and suggests the optimal profile:

- Detects `package.json` dependencies (e.g., `@supabase/supabase-js`)
- Reads `.env` files for API keys (e.g., `SUPABASE_URL`)
- Checks for marker files (e.g., `supabase/config.toml`, `prisma/schema.prisma`)

## CLI Usage

```bash
# Show status
mcplite status

# Apply a profile
mcplite profile apply database

# Enable specific MCPs
mcplite enable supabase pg

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

Set these in your shell or `.env` file for MCPs that require authentication:

```bash
SUPABASE_ACCESS_TOKEN=your_token
APIFY_TOKEN=your_token
EXA_API_KEY=your_key
GITHUB_TOKEN=your_token
POSTHOG_API_KEY=your_key
```

## Requirements

- Node.js >= 18.0.0
- Claude Code >= 1.0.33

## License

MIT
