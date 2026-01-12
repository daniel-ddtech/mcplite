# Claude MCP Manager - Product Plan

## Vision

**One-liner:** Dynamic MCP management for Claude Code - load only what you need, when you need it.

**Problem:** Claude Code users accumulate many MCP servers, each consuming 500-7000+ tokens of context window. Most sessions only need 1-3 MCPs, but users pay the context cost for all of them.

**Solution:** An interactive CLI tool + Claude skill that lets users start with zero MCPs and dynamically enable/disable them based on current task needs.

---

## Competitive Landscape

### What Claude Code Already Offers (v2.0.10+)

| Feature | Status | Notes |
|---------|--------|-------|
| `/mcp` enable/disable | ✅ Built-in | Toggle servers during session |
| @mention MCPs | ✅ Built-in | Toggle via conversation |
| `disabledMcpServers` setting | ⚠️ **BUGGY** | [Issue #13311](https://github.com/anthropics/claude-code/issues/13311) - ignored at startup |
| Project-scoped MCPs | ✅ Built-in | `claude mcp add --scope project` |
| `/context` command | ✅ Built-in | Shows token usage breakdown |

### Existing Third-Party Tools

| Tool | Approach | Pros | Cons |
|------|----------|------|------|
| **[McPick](https://github.com/spences10/mcpick)** | CLI toggle before session | Profiles, backups, multi-scope | Requires restart, no startup integration |
| **[MCP Server Manager](https://github.com/KalinYorgov/mcp-server-manager)** | Python CLI | Auto-detect Desktop/Code | Requires restart |
| **[MCP Server Gateway](https://github.com/bzsasson/claude-mcp-server-gateway)** | On-demand via gateway | True lazy loading | Added latency, Python-only, complex setup |

### Key Gaps (Our Opportunity)

1. **No "Start Clean" Experience** - Users can't easily start a session with all MCPs off
2. **No Startup Hook Integration** - Existing tools require running CLI before `claude`
3. **No Token Dashboard** - `/context` exists but no per-MCP breakdown or recommendations
4. **No Project Auto-Detection** - Must manually select profile for each project
5. **`disabledMcpServers` Bug** - Native disable is broken, tools work around it
6. **No Unified Registry** - Each tool has its own config format

---

## Our Differentiated Value

### 1. Session Startup Experience (KILLER FEATURE)
```
$ claude

┌─────────────────────────────────────────────────────────┐
│  🔌 MCP Manager - Session Startup                       │
│                                                         │
│  Current context budget: 200k tokens                    │
│  System + tools baseline: ~19k tokens (9.5%)            │
│                                                         │
│  Select MCP profile:                                    │
│  [1] 🚀 minimal     exa (650t)           │
│  [2] 🗄️  database    supabase, pg (6.4k)               │
│  [3] 🕷️  scraping    apify, supabase, exa (13.7k)      │
│  [4] 🔬 research    exa, fetch (1.2k)                  │
│  [5] ⚪ empty       no MCPs - max context              │
│  [6] ⚙️  custom      choose individually                │
│                                                         │
│  Auto-detected: package.json has @supabase/supabase-js  │
│  Suggested: [2] database                                │
└─────────────────────────────────────────────────────────┘
```

### 2. True Startup Integration via Hooks
Uses Claude Code's native hook system - no separate CLI needed:
```json
// ~/.claude/settings.json
{
  "hooks": {
    "PreSession": [{
      "command": "mcp-manager prompt --interactive"
    }]
  }
}
```

### 3. Live Token Dashboard
```
/mcp-status

Active MCPs: 2/8
├── exa          650t   ████░░░░░░
├── supabase   5,800t   ████████████████████████████░░
Total MCP cost: 6,450t (3.2% of context)

💡 Tip: You haven't used supabase in 15 minutes.
   Disable to free 5,800 tokens? [y/n]
```

### 4. Project Memory
```
$ cd ~/projects/my-saas && claude

🔌 Remembered: Last time you used 'database' profile here.
   Load same profile? [Y/n]
```

---

## Target Users

1. **Power Users** - Multiple projects, many MCPs, want fine-grained control
2. **Context-Conscious Users** - Working with large codebases, need every token
3. **Project Switchers** - Different MCPs for different projects
4. **New Users** - Overwhelmed by MCP options, want guided setup

---

## Core User Experiences

### UX 1: Session Startup (Interactive Mode)

```
$ claude

🔌 MCP Manager: Starting with clean slate (0 MCPs loaded)

   Quick profiles:
   [1] minimal    - exa only (650 tokens)
   [2] database   - supabase, pg (6,400 tokens)
   [3] scraping   - apify, supabase, exa (13,650 tokens)
   [4] research   - exa, web-fetch (1,200 tokens)
   [5] custom     - choose individually
   [6] skip       - start with no MCPs

   Select (1-6):
```

### UX 2: In-Session Activation

During a Claude Code session:
```
You: I need to query the Supabase database

Claude: I don't have database tools loaded. Enable Supabase MCP?

        [Enable Supabase] [Enable Database Profile] [Skip]
```

Or explicit:
```
You: /mcp-enable supabase

✓ Enabled: supabase (5,800 tokens)
  Current load: 6,450 tokens from MCPs
  Run /mcp to reconnect
```

### UX 3: Context Dashboard

```
You: /mcp-status

┌─────────────────────────────────────────────────────────┐
│ MCP Status                                              │
├─────────────────────────────────────────────────────────┤
│ Active MCPs:                                            │
│   ✓ exa          650t   AI web search                  │
│   ✓ supabase   5,800t   Database operations            │
│                                                         │
│ Total MCP cost: 6,450 tokens (3.2% of context)         │
│                                                         │
│ Available MCPs:                                         │
│   ○ apify      7,200t   Web scraping                   │
│   ○ pg           600t   PostgreSQL docs                │
│   ○ github     1,200t   GitHub operations              │
│                                                         │
│ Potential savings: Disable supabase = 5,800 tokens     │
└─────────────────────────────────────────────────────────┘
```

### UX 4: Project-Based Auto-Detection

```
$ cd ~/projects/my-supabase-app
$ claude

🔌 MCP Manager detected:
   - package.json includes @supabase/supabase-js
   - .env contains SUPABASE_URL

   Suggested profile: database (supabase, pg)
   Load this profile? [Y/n]
```

---

## Architecture

### Components

```
┌──────────────────────────────────────────────────────────────┐
│                     Claude MCP Manager                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   CLI Tool  │  │ Claude Skill│  │  VS Code Extension  │  │
│  │  (primary)  │  │ (in-session)│  │     (optional)      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Core Library                        │  │
│  │  - Registry management                                 │  │
│  │  - Config file manipulation                           │  │
│  │  - Profile management                                  │  │
│  │  - Token cost calculation                              │  │
│  │  - Project detection                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Data Layer                          │  │
│  │                                                        │  │
│  │  ~/.claude/mcp-registry.json    (MCP definitions)     │  │
│  │  ~/.claude/mcp-profiles.json    (User profiles)       │  │
│  │  ~/.claude/settings.json        (Active config)       │  │
│  │  .claude/settings.json          (Project overrides)   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Data Models

#### MCP Registry (`~/.claude/mcp-registry.json`)

```json
{
  "$schema": "https://claude-mcp-manager.dev/schema/registry.json",
  "version": "1.0.0",
  "mcps": {
    "supabase": {
      "name": "Supabase",
      "description": "Database operations, auth, storage, edge functions",
      "source": "npm:@supabase/mcp-server-supabase",
      "tags": ["database", "postgres", "auth", "storage"],
      "tokenCost": 5800,
      "config": {
        "command": "npx",
        "args": ["-y", "@supabase/mcp-server-supabase@latest"],
        "env": {
          "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
        }
      },
      "detection": {
        "packages": ["@supabase/supabase-js", "@supabase/ssr"],
        "envVars": ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
        "files": ["supabase/config.toml"]
      }
    },
    "apify": {
      "name": "Apify",
      "description": "Web scraping, automation, and data extraction",
      "source": "npm:@apify/actors-mcp-server",
      "tags": ["scraping", "web", "automation", "data"],
      "tokenCost": 7200,
      "config": {
        "command": "npx",
        "args": ["-y", "@apify/actors-mcp-server"],
        "env": {
          "APIFY_TOKEN": "${APIFY_TOKEN}"
        }
      }
    },
    "exa": {
      "name": "Exa",
      "description": "AI-powered web search and content retrieval",
      "source": "npm:exa-mcp-server",
      "tags": ["search", "web", "research"],
      "tokenCost": 650,
      "config": {
        "command": "npx",
        "args": ["-y", "exa-mcp-server"],
        "env": {
          "EXA_API_KEY": "${EXA_API_KEY}"
        }
      }
    }
  }
}
```

#### Profiles (`~/.claude/mcp-profiles.json`)

```json
{
  "$schema": "https://claude-mcp-manager.dev/schema/profiles.json",
  "version": "1.0.0",
  "defaultProfile": "minimal",
  "startupBehavior": "prompt",
  "profiles": {
    "minimal": {
      "description": "Lightweight setup for general coding",
      "mcps": ["exa"],
      "estimatedTokens": 650
    },
    "database": {
      "description": "Full database tooling",
      "mcps": ["supabase", "pg"],
      "estimatedTokens": 6400
    },
    "scraping": {
      "description": "Web scraping and data collection",
      "mcps": ["apify", "supabase", "exa"],
      "estimatedTokens": 13650
    },
    "research": {
      "description": "Web research and documentation",
      "mcps": ["exa"],
      "estimatedTokens": 650
    },
    "empty": {
      "description": "No MCPs - maximum context available",
      "mcps": [],
      "estimatedTokens": 0
    }
  }
}
```

---

## CLI Command Reference

### Core Commands

```bash
# Initialize MCP Manager (first-time setup)
mcp-manager init
  --import              # Import existing MCPs from settings.json
  --interactive         # Guided setup wizard

# List all registered MCPs
mcp-manager list
  --active              # Show only active MCPs
  --available           # Show only inactive MCPs
  --json                # Output as JSON
  --tokens              # Sort by token cost

# Enable/disable MCPs
mcp-manager enable <mcp-name> [mcp-name...]
mcp-manager disable <mcp-name> [mcp-name...]
mcp-manager toggle <mcp-name>

# Profile management
mcp-manager profile list
mcp-manager profile apply <profile-name>
mcp-manager profile create <name> <mcp1> [mcp2...]
mcp-manager profile delete <name>
mcp-manager profile save <name>        # Save current state as profile

# Registry management
mcp-manager add <mcp-name>
  --source <npm-package>
  --config <json-string>
  --tokens <number>

mcp-manager remove <mcp-name>
mcp-manager update                     # Update token costs from live data

# Status and diagnostics
mcp-manager status                     # Current state overview
mcp-manager tokens                     # Token usage breakdown
mcp-manager detect                     # Auto-detect MCPs for current project

# Configuration
mcp-manager config set startup.behavior prompt|auto|skip
mcp-manager config set default.profile <profile-name>
```

### Interactive Mode

```bash
# Launch interactive TUI
mcp-manager interactive
mcp-manager i                          # Shorthand
```

Presents a terminal UI with:
- Current MCP status
- Quick profile switching
- Token budget visualization
- Enable/disable toggles

---

## Claude Skill Integration

### Skill Definition (`~/.claude/skills/mcp-manager.md`)

```markdown
---
name: mcp-manager
description: Manage MCP servers dynamically during sessions
triggers:
  - "/mcp-enable"
  - "/mcp-disable"
  - "/mcp-status"
  - "/mcp-profile"
  - "enable * mcp"
  - "load * profile"
---

# MCP Manager Skill

## Commands

### /mcp-status
Show current MCP status with token usage.

### /mcp-enable <name>
Enable an MCP server. Remind user to run /mcp to reconnect.

### /mcp-disable <name>
Disable an MCP server to free context tokens.

### /mcp-profile <name>
Load a predefined MCP profile.

### /mcp-suggest
Analyze current conversation and suggest useful MCPs.

## Behavior

When user mentions needing functionality that requires an inactive MCP:
1. Check if relevant MCP exists in registry
2. Suggest enabling it with token cost
3. Offer to enable if user confirms

Example:
User: "I need to scrape this website"
→ Detect: apify MCP would help
→ Suggest: "Enable Apify MCP? (+7,200 tokens)"
```

---

## Implementation Phases

### Phase 1: Core CLI (Week 1-2)
**Goal:** Working CLI with basic functionality

**Deliverables:**
- [ ] Project setup (TypeScript, npm package)
- [ ] Registry file format and validation
- [ ] `init` command - import existing MCPs
- [ ] `list` command - show all MCPs
- [ ] `enable` / `disable` commands
- [ ] `status` command - current state
- [ ] Settings.json manipulation (read/write)
- [ ] Basic documentation

**Tech Stack:**
- TypeScript
- Commander.js (CLI framework)
- Chalk (terminal colors)
- Inquirer.js (interactive prompts)
- Zod (schema validation)

### Phase 2: Profiles & Polish (Week 3)
**Goal:** Profile system and improved UX

**Deliverables:**
- [ ] Profile management commands
- [ ] Profile file format
- [ ] Interactive TUI mode
- [ ] Token cost calculation/display
- [ ] `--json` output for all commands
- [ ] Config management
- [ ] Shell completions (bash, zsh, fish)

### Phase 3: Intelligence (Week 4)
**Goal:** Smart suggestions and auto-detection

**Deliverables:**
- [ ] Project detection (package.json, env files)
- [ ] MCP suggestions based on project type
- [ ] Token budget recommendations
- [ ] `detect` command
- [ ] Integration with `claude` startup

### Phase 4: Claude Skill (Week 5)
**Goal:** In-session MCP management

**Deliverables:**
- [ ] Claude skill file
- [ ] Skill documentation
- [ ] Bash command integration
- [ ] Context-aware MCP suggestions
- [ ] Installation script for skill

### Phase 5: Community & Distribution (Week 6)
**Goal:** Public release

**Deliverables:**
- [ ] npm package published
- [ ] GitHub repository with CI/CD
- [ ] Community MCP registry (curated list)
- [ ] Contributing guidelines
- [ ] Video demo / tutorial
- [ ] Announcement post

---

## Community MCP Registry

### Public Registry Concept

Host a community-maintained list of MCP configurations:

```bash
# Browse community MCPs
mcp-manager registry search database
mcp-manager registry browse --category scraping

# Install from community registry
mcp-manager registry install supabase
mcp-manager registry install apify --save-to-profile scraping
```

### Registry Format (Community)

```json
{
  "mcps": {
    "supabase": {
      "maintainer": "supabase",
      "verified": true,
      "source": "npm:@supabase/mcp-server-supabase",
      "homepage": "https://supabase.com/docs/guides/getting-started/mcp",
      "tokenCost": 5800,
      "lastUpdated": "2026-01-10",
      "config": { ... }
    }
  }
}
```

Hosted at: `https://registry.claude-mcp-manager.dev/v1/registry.json`

---

## Technical Specifications

### File Locations

| File | Location | Purpose |
|------|----------|---------|
| MCP Registry | `~/.claude/mcp-registry.json` | All known MCPs |
| Profiles | `~/.claude/mcp-profiles.json` | User-defined profiles |
| Active Config | `~/.claude/settings.json` | Currently active MCPs |
| Project Override | `./.claude/settings.json` | Project-specific MCPs |
| Skill | `~/.claude/skills/mcp-manager.md` | In-session management |

### Settings.json Manipulation

The tool modifies `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    // Managed by mcp-manager
    "supabase": { ... },
    "exa": { ... }
  },
  // Other settings preserved
  "permissions": { ... }
}
```

**Rules:**
- Only modify `mcpServers` key
- Preserve all other settings
- Create backup before modifications
- Validate JSON before writing

### Token Cost Estimation

Token costs are estimated based on:
1. Number of tools exposed by MCP
2. Schema complexity of each tool
3. Description/documentation length

Initial costs are hard-coded, with option to calculate dynamically:

```bash
mcp-manager update --calculate-tokens
# Starts each MCP, counts actual tokens, updates registry
```

---

## Success Metrics

### Adoption
- npm weekly downloads
- GitHub stars
- Community registry contributions

### Impact
- Average context savings per user
- Number of active profiles created
- Session startup time improvement

### Community
- GitHub issues response time
- Contributor count
- MCP registry submissions

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Claude Code API changes | Version detection, graceful degradation |
| Settings.json corruption | Backup before modify, validation |
| Token costs become stale | Community updates, auto-calculation option |
| MCP server compatibility | Test suite, version pinning |

---

## Open Questions

1. **Startup Integration:** Can we hook into `claude` command startup, or must users run `mcp-manager` separately first?

2. **Live Reconnection:** Can MCPs be hot-swapped during a session, or is restart required?

3. **VS Code Extension:** Worth building a GUI for VS Code users?

4. **Token Calculation:** Should we build live token counting, or rely on community estimates?

5. **Project Name:**
   - `claude-mcp-manager`
   - `mcp-switch`
   - `mcpx`
   - `claude-context-manager`

---

## Next Steps

1. **Validate Approach:** Test settings.json manipulation manually
2. **Prototype CLI:** Build init, list, enable, disable
3. **User Testing:** Get feedback from 3-5 Claude Code users
4. **Iterate:** Refine based on feedback
5. **Launch:** npm publish + GitHub public

---

## Appendix: Example Session

```bash
# First time setup
$ npm install -g claude-mcp-manager
$ mcp-manager init --import

✓ Found 6 MCPs in ~/.claude/settings.json
✓ Imported: supabase, apify, exa, pg, github, ide
✓ Created registry at ~/.claude/mcp-registry.json
✓ Created default profiles

# Start clean session
$ mcp-manager profile apply empty
✓ Disabled all MCPs
  Settings updated. Run 'claude' to start fresh session.

$ claude

You: I need to work with the Supabase database today

Claude: I notice you might need database tools. Would you like me to
        enable the Supabase MCP? It will use ~5,800 tokens of context.

        Run: /mcp-enable supabase

You: /mcp-enable supabase

[Executing: mcp-manager enable supabase]
✓ Enabled: supabase
  Run /mcp to reconnect

You: /mcp

Connected to plugin:supabase:supabase.

You: Now query the profiles table...

Claude: [Uses Supabase MCP tools successfully]

You: Done with database work. Free up context.

Claude: /mcp-disable supabase

[Executing: mcp-manager disable supabase]
✓ Disabled: supabase
  Freed 5,800 tokens. Run /mcp to apply.
```
