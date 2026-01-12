import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  ClaudeSettings,
  ClaudeSettingsSchema,
  Registry,
  RegistrySchema,
  ProfilesFile,
  ProfilesFileSchema,
  McpEntry,
} from './types.js';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const CLAUDE_CONFIG_FILE = path.join(os.homedir(), '.claude.json');
const PLUGIN_DATA_DIR = path.join(CLAUDE_DIR, 'mcplite');
const USER_REGISTRY_FILE = path.join(PLUGIN_DATA_DIR, 'registry.json');
const USER_PROFILES_FILE = path.join(PLUGIN_DATA_DIR, 'profiles.json');

// Get the plugin root directory (for accessing bundled data files)
function getPluginRoot(): string {
  // Check if CLAUDE_PLUGIN_ROOT is set (when running as a plugin)
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return process.env.CLAUDE_PLUGIN_ROOT;
  }
  // Fall back to the package directory
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
}

export function ensureDirectories(): void {
  if (!fs.existsSync(CLAUDE_DIR)) {
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  }
  if (!fs.existsSync(PLUGIN_DATA_DIR)) {
    fs.mkdirSync(PLUGIN_DATA_DIR, { recursive: true });
  }
}

export function readClaudeSettings(): ClaudeSettings {
  if (!fs.existsSync(CLAUDE_CONFIG_FILE)) {
    return { mcpServers: {} };
  }

  const content = fs.readFileSync(CLAUDE_CONFIG_FILE, 'utf-8');
  const parsed = JSON.parse(content);
  return ClaudeSettingsSchema.parse(parsed);
}

export function writeClaudeSettings(settings: ClaudeSettings): void {
  ensureDirectories();

  // Create backup before writing
  if (fs.existsSync(CLAUDE_CONFIG_FILE)) {
    const backupPath = path.join(PLUGIN_DATA_DIR, `claude-config.backup.${Date.now()}.json`);
    fs.copyFileSync(CLAUDE_CONFIG_FILE, backupPath);

    // Keep only last 5 backups
    const backups = fs.readdirSync(PLUGIN_DATA_DIR)
      .filter(f => f.startsWith('claude-config.backup.'))
      .sort()
      .reverse();

    backups.slice(5).forEach(f => {
      fs.unlinkSync(path.join(PLUGIN_DATA_DIR, f));
    });
  }

  fs.writeFileSync(CLAUDE_CONFIG_FILE, JSON.stringify(settings, null, 2));
}

export function getRegistry(): Registry {
  // First try user's registry, then fall back to bundled
  if (fs.existsSync(USER_REGISTRY_FILE)) {
    const content = fs.readFileSync(USER_REGISTRY_FILE, 'utf-8');
    return RegistrySchema.parse(JSON.parse(content));
  }

  // Load bundled registry
  const bundledPath = path.join(getPluginRoot(), 'data', 'registry.json');
  if (fs.existsSync(bundledPath)) {
    const content = fs.readFileSync(bundledPath, 'utf-8');
    return RegistrySchema.parse(JSON.parse(content));
  }

  // Return empty registry if nothing found
  return { version: '1.0.0', mcps: {} };
}

export function saveRegistry(registry: Registry): void {
  ensureDirectories();
  fs.writeFileSync(USER_REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

export function getProfiles(): ProfilesFile {
  // First try user's profiles, then fall back to bundled
  if (fs.existsSync(USER_PROFILES_FILE)) {
    const content = fs.readFileSync(USER_PROFILES_FILE, 'utf-8');
    return ProfilesFileSchema.parse(JSON.parse(content));
  }

  // Load bundled profiles
  const bundledPath = path.join(getPluginRoot(), 'data', 'profiles.json');
  if (fs.existsSync(bundledPath)) {
    const content = fs.readFileSync(bundledPath, 'utf-8');
    return ProfilesFileSchema.parse(JSON.parse(content));
  }

  // Return default profiles if nothing found
  return {
    version: '1.0.0',
    defaultProfile: 'empty',
    startupBehavior: 'prompt',
    profiles: {
      empty: {
        description: 'No MCPs loaded',
        mcps: [],
        estimatedTokens: 0,
      },
    },
  };
}

export function saveProfiles(profiles: ProfilesFile): void {
  ensureDirectories();
  fs.writeFileSync(USER_PROFILES_FILE, JSON.stringify(profiles, null, 2));
}

export function getActiveMcps(): string[] {
  const settings = readClaudeSettings();
  const disabled = settings.disabledMcpServers || [];
  const servers = Object.keys(settings.mcpServers || {});

  return servers.filter(s => !disabled.includes(s));
}

export function getAllConfiguredMcps(): string[] {
  const settings = readClaudeSettings();
  return Object.keys(settings.mcpServers || {});
}

export function enableMcp(mcpId: string): void {
  const registry = getRegistry();
  const mcpEntry = registry.mcps[mcpId];

  if (!mcpEntry) {
    throw new Error(`MCP "${mcpId}" not found in registry`);
  }

  const settings = readClaudeSettings();

  // Add to mcpServers if not present
  if (!settings.mcpServers) {
    settings.mcpServers = {};
  }

  if (!settings.mcpServers[mcpId]) {
    settings.mcpServers[mcpId] = {
      command: mcpEntry.config.command,
      args: mcpEntry.config.args,
      env: mcpEntry.config.env,
    };
  }

  // Remove from disabled list
  if (settings.disabledMcpServers) {
    settings.disabledMcpServers = settings.disabledMcpServers.filter(s => s !== mcpId);
  }

  writeClaudeSettings(settings);
}

export function disableMcp(mcpId: string): void {
  const settings = readClaudeSettings();

  // Add to disabled list
  if (!settings.disabledMcpServers) {
    settings.disabledMcpServers = [];
  }

  if (!settings.disabledMcpServers.includes(mcpId)) {
    settings.disabledMcpServers.push(mcpId);
  }

  writeClaudeSettings(settings);
}

export function disableAllMcps(): void {
  const settings = readClaudeSettings();
  const allMcps = Object.keys(settings.mcpServers || {});

  settings.disabledMcpServers = allMcps;
  writeClaudeSettings(settings);
}

export function enableOnlyMcps(mcpIds: string[]): void {
  const registry = getRegistry();
  const settings = readClaudeSettings();

  if (!settings.mcpServers) {
    settings.mcpServers = {};
  }

  // Add any missing MCPs from registry
  for (const mcpId of mcpIds) {
    const mcpEntry = registry.mcps[mcpId];
    if (mcpEntry && !settings.mcpServers[mcpId]) {
      settings.mcpServers[mcpId] = {
        command: mcpEntry.config.command,
        args: mcpEntry.config.args,
        env: mcpEntry.config.env,
      };
    }
  }

  // Disable all except the specified ones
  const allMcps = Object.keys(settings.mcpServers);
  settings.disabledMcpServers = allMcps.filter(m => !mcpIds.includes(m));

  writeClaudeSettings(settings);
}

export function importExistingMcps(): { imported: string[]; skipped: string[] } {
  const settings = readClaudeSettings();
  const registry = getRegistry();
  const imported: string[] = [];
  const skipped: string[] = [];

  const existingMcps = settings.mcpServers || {};

  for (const [mcpId, config] of Object.entries(existingMcps)) {
    if (registry.mcps[mcpId]) {
      // Already in registry
      skipped.push(mcpId);
    } else {
      // Add to registry with estimated token cost
      registry.mcps[mcpId] = {
        name: mcpId,
        description: `Imported from settings.json`,
        source: `manual:${mcpId}`,
        tags: ['imported'],
        tokenCost: 1000, // Default estimate
        config: {
          command: config.command || 'npx',
          args: config.args,
          env: config.env,
        },
      };
      imported.push(mcpId);
    }
  }

  if (imported.length > 0) {
    saveRegistry(registry);
  }

  return { imported, skipped };
}

export function isInitialized(): boolean {
  return fs.existsSync(USER_REGISTRY_FILE) || fs.existsSync(USER_PROFILES_FILE);
}

export function getLastUsedProfile(): string | null {
  const stateFile = path.join(PLUGIN_DATA_DIR, 'state.json');
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    return state.lastProfile || null;
  }
  return null;
}

export function setLastUsedProfile(profileId: string): void {
  ensureDirectories();
  const stateFile = path.join(PLUGIN_DATA_DIR, 'state.json');
  const state = fs.existsSync(stateFile)
    ? JSON.parse(fs.readFileSync(stateFile, 'utf-8'))
    : {};

  state.lastProfile = profileId;
  state.lastUsed = new Date().toISOString();

  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

export const paths = {
  CLAUDE_DIR,
  CLAUDE_CONFIG_FILE,
  PLUGIN_DATA_DIR,
  USER_REGISTRY_FILE,
  USER_PROFILES_FILE,
};
