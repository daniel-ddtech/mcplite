import {
  getRegistry,
  getProfiles,
  saveProfiles,
  enableOnlyMcps,
  getActiveMcps,
  setLastUsedProfile,
} from './config.js';
import { McpStatus, ResolvedProfile, Profile } from './types.js';

export function getMcpStatus(mcpId: string, activeMcps: string[]): McpStatus | null {
  const registry = getRegistry();
  const entry = registry.mcps[mcpId];

  if (!entry) {
    return null;
  }

  return {
    id: mcpId,
    name: entry.name,
    description: entry.description,
    tokenCost: entry.tokenCost,
    active: activeMcps.includes(mcpId),
    tags: entry.tags,
  };
}

export function getAllMcpStatuses(): McpStatus[] {
  const registry = getRegistry();
  const activeMcps = getActiveMcps();

  return Object.entries(registry.mcps).map(([id, entry]) => ({
    id,
    name: entry.name,
    description: entry.description,
    tokenCost: entry.tokenCost,
    active: activeMcps.includes(id),
    tags: entry.tags,
  }));
}

export function getActiveTokenCost(): number {
  const statuses = getAllMcpStatuses();
  return statuses
    .filter(s => s.active)
    .reduce((sum, s) => sum + s.tokenCost, 0);
}

export function resolveProfile(profileId: string): ResolvedProfile | null {
  const profiles = getProfiles();
  const profile = profiles.profiles[profileId];

  if (!profile) {
    return null;
  }

  const registry = getRegistry();
  const activeMcps = getActiveMcps();

  const mcps: McpStatus[] = profile.mcps
    .map(mcpId => {
      const entry = registry.mcps[mcpId];
      if (!entry) {
        return null;
      }
      return {
        id: mcpId,
        name: entry.name,
        description: entry.description,
        tokenCost: entry.tokenCost,
        active: activeMcps.includes(mcpId),
        tags: entry.tags,
      };
    })
    .filter((m): m is McpStatus => m !== null);

  return {
    id: profileId,
    description: profile.description,
    icon: profile.icon,
    mcps,
    totalTokens: mcps.reduce((sum, m) => sum + m.tokenCost, 0),
  };
}

export function getAllProfiles(): ResolvedProfile[] {
  const profiles = getProfiles();

  return Object.keys(profiles.profiles)
    .map(id => resolveProfile(id))
    .filter((p): p is ResolvedProfile => p !== null);
}

export function applyProfile(profileId: string): { success: boolean; error?: string } {
  const profiles = getProfiles();
  const profile = profiles.profiles[profileId];

  if (!profile) {
    return { success: false, error: `Profile "${profileId}" not found` };
  }

  enableOnlyMcps(profile.mcps);
  setLastUsedProfile(profileId);

  return { success: true };
}

export function createProfile(
  id: string,
  description: string,
  mcpIds: string[]
): { success: boolean; error?: string } {
  const profiles = getProfiles();
  const registry = getRegistry();

  // Validate MCPs exist
  for (const mcpId of mcpIds) {
    if (!registry.mcps[mcpId]) {
      return { success: false, error: `MCP "${mcpId}" not found in registry` };
    }
  }

  // Calculate token cost
  const estimatedTokens = mcpIds.reduce((sum, mcpId) => {
    return sum + (registry.mcps[mcpId]?.tokenCost || 0);
  }, 0);

  profiles.profiles[id] = {
    description,
    mcps: mcpIds,
    estimatedTokens,
  };

  saveProfiles(profiles);
  return { success: true };
}

export function deleteProfile(id: string): { success: boolean; error?: string } {
  const profiles = getProfiles();

  if (!profiles.profiles[id]) {
    return { success: false, error: `Profile "${id}" not found` };
  }

  // Don't allow deleting the empty profile
  if (id === 'empty') {
    return { success: false, error: 'Cannot delete the "empty" profile' };
  }

  delete profiles.profiles[id];

  // Update default if we deleted it
  if (profiles.defaultProfile === id) {
    profiles.defaultProfile = 'empty';
  }

  saveProfiles(profiles);
  return { success: true };
}

export function saveCurrentAsProfile(
  id: string,
  description: string
): { success: boolean; error?: string } {
  const activeMcps = getActiveMcps();
  return createProfile(id, description, activeMcps);
}

export function setDefaultProfile(id: string): { success: boolean; error?: string } {
  const profiles = getProfiles();

  if (!profiles.profiles[id]) {
    return { success: false, error: `Profile "${id}" not found` };
  }

  profiles.defaultProfile = id;
  saveProfiles(profiles);
  return { success: true };
}

export function getDefaultProfile(): string {
  const profiles = getProfiles();
  return profiles.defaultProfile;
}

export function getStartupBehavior(): 'prompt' | 'auto' | 'skip' {
  const profiles = getProfiles();
  return profiles.startupBehavior;
}

export function setStartupBehavior(behavior: 'prompt' | 'auto' | 'skip'): void {
  const profiles = getProfiles();
  profiles.startupBehavior = behavior;
  saveProfiles(profiles);
}
