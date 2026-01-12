import { z } from 'zod';

// MCP Configuration schema
export const McpConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

export type McpConfig = z.infer<typeof McpConfigSchema>;

// Detection rules for auto-detecting relevant MCPs
export const DetectionSchema = z.object({
  packages: z.array(z.string()).optional(),
  envVars: z.array(z.string()).optional(),
  files: z.array(z.string()).optional(),
});

export type Detection = z.infer<typeof DetectionSchema>;

// Individual MCP entry in registry
export const McpEntrySchema = z.object({
  name: z.string(),
  description: z.string(),
  source: z.string(),
  tags: z.array(z.string()),
  tokenCost: z.number(),
  config: McpConfigSchema,
  detection: DetectionSchema.optional(),
});

export type McpEntry = z.infer<typeof McpEntrySchema>;

// Full registry file
export const RegistrySchema = z.object({
  $schema: z.string().optional(),
  version: z.string(),
  mcps: z.record(McpEntrySchema),
});

export type Registry = z.infer<typeof RegistrySchema>;

// Profile definition
export const ProfileSchema = z.object({
  description: z.string(),
  icon: z.string().optional(),
  mcps: z.array(z.string()),
  estimatedTokens: z.number(),
});

export type Profile = z.infer<typeof ProfileSchema>;

// Profiles file
export const ProfilesFileSchema = z.object({
  $schema: z.string().optional(),
  version: z.string(),
  defaultProfile: z.string(),
  startupBehavior: z.enum(['prompt', 'auto', 'skip']),
  profiles: z.record(ProfileSchema),
});

export type ProfilesFile = z.infer<typeof ProfilesFileSchema>;

// Claude settings.json MCP server entry (permissive - various formats exist)
export const ClaudeServerConfigSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  // Some MCPs use different config formats
  url: z.string().optional(),
  type: z.string().optional(),
}).passthrough(); // Allow additional fields

export type ClaudeServerConfig = z.infer<typeof ClaudeServerConfigSchema>;

// Claude settings.json structure (partial - only what we care about)
export const ClaudeSettingsSchema = z.object({
  mcpServers: z.record(ClaudeServerConfigSchema).optional(),
  disabledMcpServers: z.array(z.string()).optional(),
}).passthrough(); // Allow other keys to pass through

export type ClaudeSettings = z.infer<typeof ClaudeSettingsSchema>;

// MCP status for display
export interface McpStatus {
  id: string;
  name: string;
  description: string;
  tokenCost: number;
  active: boolean;
  tags: string[];
}

// Profile with resolved MCP info
export interface ResolvedProfile {
  id: string;
  description: string;
  icon?: string;
  mcps: McpStatus[];
  totalTokens: number;
}

// Project detection result
export interface DetectionResult {
  suggestedProfile?: string;
  suggestedMcps: string[];
  detectedPackages: string[];
  detectedEnvVars: string[];
  detectedFiles: string[];
}
