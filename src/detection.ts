import * as fs from 'node:fs';
import * as path from 'node:path';
import { getRegistry, getProfiles } from './config.js';
import { DetectionResult } from './types.js';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPackageJson(dir: string): PackageJson | null {
  const packagePath = path.join(dir, 'package.json');
  if (fs.existsSync(packagePath)) {
    try {
      return JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

function readEnvFile(dir: string): string[] {
  const envVars: string[] = [];
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];

  for (const envFile of envFiles) {
    const envPath = path.join(dir, envFile);
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const match = line.match(/^([A-Z_][A-Z0-9_]*)=/);
          if (match) {
            envVars.push(match[1]);
          }
        }
      } catch {
        // Ignore errors
      }
    }
  }

  return envVars;
}

function checkFileExists(dir: string, filePath: string): boolean {
  const fullPath = path.join(dir, filePath);
  return fs.existsSync(fullPath);
}

export function detectProjectMcps(dir: string = process.cwd()): DetectionResult {
  const registry = getRegistry();
  const detectedPackages: string[] = [];
  const detectedEnvVars: string[] = [];
  const detectedFiles: string[] = [];
  const suggestedMcps: Set<string> = new Set();

  // Read package.json
  const packageJson = readPackageJson(dir);
  const allDependencies: string[] = [];

  if (packageJson) {
    if (packageJson.dependencies) {
      allDependencies.push(...Object.keys(packageJson.dependencies));
    }
    if (packageJson.devDependencies) {
      allDependencies.push(...Object.keys(packageJson.devDependencies));
    }
  }

  // Read env vars
  const envVars = readEnvFile(dir);

  // Check each MCP's detection rules
  for (const [mcpId, mcpEntry] of Object.entries(registry.mcps)) {
    const detection = mcpEntry.detection;
    if (!detection) continue;

    let matched = false;

    // Check packages
    if (detection.packages && detection.packages.length > 0) {
      for (const pkg of detection.packages) {
        if (allDependencies.includes(pkg)) {
          detectedPackages.push(pkg);
          matched = true;
        }
      }
    }

    // Check env vars
    if (detection.envVars && detection.envVars.length > 0) {
      for (const envVar of detection.envVars) {
        if (envVars.includes(envVar)) {
          detectedEnvVars.push(envVar);
          matched = true;
        }
      }
    }

    // Check files
    if (detection.files && detection.files.length > 0) {
      for (const file of detection.files) {
        if (checkFileExists(dir, file)) {
          detectedFiles.push(file);
          matched = true;
        }
      }
    }

    if (matched) {
      suggestedMcps.add(mcpId);
    }
  }

  // Find best matching profile
  const profiles = getProfiles();
  let suggestedProfile: string | undefined;
  let bestMatchScore = 0;

  for (const [profileId, profile] of Object.entries(profiles.profiles)) {
    if (profile.mcps.length === 0) continue;

    const matchScore = profile.mcps.filter(m => suggestedMcps.has(m)).length;
    const coverageScore = matchScore / profile.mcps.length;

    // Prefer profiles that match more suggested MCPs with good coverage
    if (matchScore > bestMatchScore && coverageScore >= 0.5) {
      bestMatchScore = matchScore;
      suggestedProfile = profileId;
    }
  }

  return {
    suggestedProfile,
    suggestedMcps: Array.from(suggestedMcps),
    detectedPackages: [...new Set(detectedPackages)],
    detectedEnvVars: [...new Set(detectedEnvVars)],
    detectedFiles: [...new Set(detectedFiles)],
  };
}

export function formatDetectionResult(result: DetectionResult): string {
  const lines: string[] = [];

  if (result.detectedPackages.length > 0) {
    lines.push(`  Detected packages: ${result.detectedPackages.join(', ')}`);
  }

  if (result.detectedEnvVars.length > 0) {
    lines.push(`  Detected env vars: ${result.detectedEnvVars.join(', ')}`);
  }

  if (result.detectedFiles.length > 0) {
    lines.push(`  Detected files: ${result.detectedFiles.join(', ')}`);
  }

  if (result.suggestedMcps.length > 0) {
    lines.push(`  Suggested MCPs: ${result.suggestedMcps.join(', ')}`);
  }

  if (result.suggestedProfile) {
    lines.push(`  Suggested profile: ${result.suggestedProfile}`);
  }

  return lines.join('\n');
}
