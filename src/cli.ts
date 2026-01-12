#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  ensureDirectories,
  getActiveMcps,
  enableMcp,
  disableMcp,
  disableAllMcps,
  importExistingMcps,
  isInitialized,
  getRegistry,
  getLastUsedProfile,
  paths,
} from './config.js';
import {
  getAllMcpStatuses,
  getActiveTokenCost,
  getAllProfiles,
  resolveProfile,
  applyProfile,
  createProfile,
  deleteProfile,
  saveCurrentAsProfile,
  setDefaultProfile,
  getDefaultProfile,
  getStartupBehavior,
  setStartupBehavior,
} from './profiles.js';
import { detectProjectMcps, formatDetectionResult } from './detection.js';
import {
  formatStatusBox,
  formatSuccess,
  formatError,
  formatInfo,
  formatStartupPrompt,
  formatTokens,
  icon,
} from './ui.js';

const program = new Command();

program
  .name('mcplite')
  .description('Lighter context - load only the MCPs you need')
  .version('0.1.0');

// ============ INIT ============
program
  .command('init')
  .description('Initialize MCP Manager')
  .option('--import', 'Import existing MCPs from settings.json')
  .option('-i, --interactive', 'Run interactive setup wizard')
  .action(async (options) => {
    ensureDirectories();

    if (isInitialized()) {
      console.log(formatInfo('MCP Manager already initialized'));
      console.log(`  Registry: ${paths.USER_REGISTRY_FILE}`);
      console.log(`  Profiles: ${paths.USER_PROFILES_FILE}`);
      return;
    }

    console.log(chalk.cyan.bold(`${icon('plug')} MCP Manager Setup`));
    console.log('');

    if (options.import || options.interactive) {
      const result = importExistingMcps();
      if (result.imported.length > 0) {
        console.log(formatSuccess(`Imported ${result.imported.length} MCPs: ${result.imported.join(', ')}`));
      }
      if (result.skipped.length > 0) {
        console.log(formatInfo(`Skipped ${result.skipped.length} MCPs (already in registry): ${result.skipped.join(', ')}`));
      }
    }

    if (options.interactive) {
      const profiles = getAllProfiles();
      const { defaultProfile } = await inquirer.prompt([
        {
          type: 'list',
          name: 'defaultProfile',
          message: 'Select default profile:',
          choices: profiles.map(p => ({
            name: `${p.id} - ${p.description} (${formatTokens(p.totalTokens)}t)`,
            value: p.id,
          })),
          default: 'minimal',
        },
      ]);

      setDefaultProfile(defaultProfile);
      console.log(formatSuccess(`Default profile set to: ${defaultProfile}`));

      const { startupBehavior } = await inquirer.prompt([
        {
          type: 'list',
          name: 'startupBehavior',
          message: 'Startup behavior:',
          choices: [
            { name: 'Prompt - Ask which profile to load', value: 'prompt' },
            { name: 'Auto - Load default profile automatically', value: 'auto' },
            { name: 'Skip - Don\'t run at startup', value: 'skip' },
          ],
          default: 'prompt',
        },
      ]);

      setStartupBehavior(startupBehavior);
      console.log(formatSuccess(`Startup behavior set to: ${startupBehavior}`));
    }

    console.log('');
    console.log(formatSuccess('MCP Manager initialized!'));
    console.log(`  ${chalk.dim('Registry:')} ${paths.USER_REGISTRY_FILE}`);
    console.log(`  ${chalk.dim('Profiles:')} ${paths.USER_PROFILES_FILE}`);
    console.log('');
    console.log(chalk.dim('Run `mcp-manager status` to see current MCP state'));
  });

// ============ LIST ============
program
  .command('list')
  .description('List all registered MCPs')
  .option('-a, --active', 'Show only active MCPs')
  .option('-v, --available', 'Show only available (inactive) MCPs')
  .option('-t, --tokens', 'Sort by token cost')
  .option('--json', 'Output as JSON')
  .action((options) => {
    let statuses = getAllMcpStatuses();

    if (options.active) {
      statuses = statuses.filter(s => s.active);
    } else if (options.available) {
      statuses = statuses.filter(s => !s.active);
    }

    if (options.tokens) {
      statuses.sort((a, b) => b.tokenCost - a.tokenCost);
    }

    if (options.json) {
      console.log(JSON.stringify(statuses, null, 2));
      return;
    }

    const active = statuses.filter(s => s.active);
    const available = statuses.filter(s => !s.active);
    const totalTokens = active.reduce((sum, s) => sum + s.tokenCost, 0);

    console.log(formatStatusBox(active, available, totalTokens));
  });

// ============ STATUS ============
program
  .command('status')
  .description('Show current MCP status')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const statuses = getAllMcpStatuses();
    const active = statuses.filter(s => s.active);
    const available = statuses.filter(s => !s.active);
    const totalTokens = getActiveTokenCost();

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            active: active.map(s => s.id),
            available: available.map(s => s.id),
            totalTokens,
          },
          null,
          2
        )
      );
      return;
    }

    console.log(formatStatusBox(active, available, totalTokens));
  });

// ============ ENABLE ============
program
  .command('enable <mcp...>')
  .description('Enable one or more MCPs')
  .action((mcps: string[]) => {
    for (const mcpId of mcps) {
      try {
        enableMcp(mcpId);
        const registry = getRegistry();
        const entry = registry.mcps[mcpId];
        console.log(formatSuccess(`Enabled: ${mcpId} (${formatTokens(entry?.tokenCost || 0)}t)`));
      } catch (err) {
        console.log(formatError(`Failed to enable ${mcpId}: ${(err as Error).message}`));
      }
    }
    console.log(chalk.dim('\nRun /mcp in Claude to reconnect'));
  });

// ============ DISABLE ============
program
  .command('disable <mcp...>')
  .description('Disable one or more MCPs')
  .action((mcps: string[]) => {
    for (const mcpId of mcps) {
      try {
        disableMcp(mcpId);
        const registry = getRegistry();
        const entry = registry.mcps[mcpId];
        console.log(formatSuccess(`Disabled: ${mcpId} (freed ${formatTokens(entry?.tokenCost || 0)}t)`));
      } catch (err) {
        console.log(formatError(`Failed to disable ${mcpId}: ${(err as Error).message}`));
      }
    }
    console.log(chalk.dim('\nRun /mcp in Claude to apply'));
  });

// ============ TOGGLE ============
program
  .command('toggle <mcp>')
  .description('Toggle an MCP on/off')
  .action((mcp: string) => {
    const activeMcps = getActiveMcps();
    if (activeMcps.includes(mcp)) {
      disableMcp(mcp);
      console.log(formatSuccess(`Disabled: ${mcp}`));
    } else {
      enableMcp(mcp);
      console.log(formatSuccess(`Enabled: ${mcp}`));
    }
    console.log(chalk.dim('\nRun /mcp in Claude to apply'));
  });

// ============ PROFILE ============
const profileCmd = program.command('profile').description('Profile management');

profileCmd
  .command('list')
  .description('List all profiles')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const profiles = getAllProfiles();

    if (options.json) {
      console.log(JSON.stringify(profiles, null, 2));
      return;
    }

    console.log(chalk.cyan.bold('Available Profiles'));
    console.log('');

    const defaultProfile = getDefaultProfile();

    for (const profile of profiles) {
      const isDefault = profile.id === defaultProfile;
      const defaultBadge = isDefault ? chalk.green(' (default)') : '';
      const mcpList = profile.mcps.map(m => m.id).join(', ') || 'none';

      console.log(
        `  ${icon(profile.icon || 'layers')} ${chalk.white.bold(profile.id)}${defaultBadge}`
      );
      console.log(`    ${chalk.dim(profile.description)}`);
      console.log(
        `    MCPs: ${chalk.yellow(mcpList)} (${formatTokens(profile.totalTokens)}t)`
      );
      console.log('');
    }
  });

profileCmd
  .command('apply <name>')
  .description('Apply a profile')
  .action((name: string) => {
    const result = applyProfile(name);
    if (result.success) {
      const profile = resolveProfile(name);
      console.log(formatSuccess(`Applied profile: ${name}`));
      if (profile) {
        console.log(`  MCPs: ${profile.mcps.map(m => m.id).join(', ') || 'none'}`);
        console.log(`  Token cost: ${formatTokens(profile.totalTokens)}`);
      }
      console.log(chalk.dim('\nRun /mcp in Claude to reconnect'));
    } else {
      console.log(formatError(result.error || 'Failed to apply profile'));
    }
  });

profileCmd
  .command('create <name>')
  .description('Create a new profile')
  .argument('<mcps...>', 'MCPs to include')
  .option('-d, --description <desc>', 'Profile description')
  .action((name: string, mcps: string[], options) => {
    const description = options.description || `Custom profile: ${mcps.join(', ')}`;
    const result = createProfile(name, description, mcps);

    if (result.success) {
      console.log(formatSuccess(`Created profile: ${name}`));
    } else {
      console.log(formatError(result.error || 'Failed to create profile'));
    }
  });

profileCmd
  .command('delete <name>')
  .description('Delete a profile')
  .action((name: string) => {
    const result = deleteProfile(name);
    if (result.success) {
      console.log(formatSuccess(`Deleted profile: ${name}`));
    } else {
      console.log(formatError(result.error || 'Failed to delete profile'));
    }
  });

profileCmd
  .command('save <name>')
  .description('Save current MCP state as a profile')
  .option('-d, --description <desc>', 'Profile description')
  .action((name: string, options) => {
    const description = options.description || `Saved profile`;
    const result = saveCurrentAsProfile(name, description);

    if (result.success) {
      console.log(formatSuccess(`Saved current state as profile: ${name}`));
    } else {
      console.log(formatError(result.error || 'Failed to save profile'));
    }
  });

profileCmd
  .command('default <name>')
  .description('Set the default profile')
  .action((name: string) => {
    const result = setDefaultProfile(name);
    if (result.success) {
      console.log(formatSuccess(`Default profile set to: ${name}`));
    } else {
      console.log(formatError(result.error || 'Failed to set default'));
    }
  });

// ============ DETECT ============
program
  .command('detect')
  .description('Auto-detect MCPs for current project')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const result = detectProjectMcps();

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (
      result.detectedPackages.length === 0 &&
      result.detectedEnvVars.length === 0 &&
      result.detectedFiles.length === 0
    ) {
      console.log(formatInfo('No project-specific MCPs detected'));
      return;
    }

    console.log(chalk.cyan.bold('Project Detection'));
    console.log('');
    console.log(formatDetectionResult(result));
  });

// ============ CLEAN ============
program
  .command('clean')
  .description('Disable all MCPs for a clean session')
  .action(() => {
    disableAllMcps();
    console.log(formatSuccess('All MCPs disabled'));
    console.log(chalk.dim('Run /mcp in Claude to apply'));
  });

// ============ TOKENS ============
program
  .command('tokens')
  .description('Show token usage breakdown')
  .action(() => {
    const statuses = getAllMcpStatuses();
    const active = statuses.filter(s => s.active).sort((a, b) => b.tokenCost - a.tokenCost);
    const totalTokens = active.reduce((sum, s) => sum + s.tokenCost, 0);
    const maxContext = 200000;

    console.log(chalk.cyan.bold('Token Usage'));
    console.log('');

    if (active.length === 0) {
      console.log(chalk.dim('  No active MCPs'));
    } else {
      for (const mcp of active) {
        const percentage = ((mcp.tokenCost / maxContext) * 100).toFixed(1);
        const bar = '\u{2588}'.repeat(Math.round(mcp.tokenCost / 1000));
        console.log(
          `  ${mcp.name.padEnd(14)} ${chalk.yellow(formatTokens(mcp.tokenCost).padStart(6))}t  ${chalk.green(bar)}  ${chalk.dim(percentage + '%')}`
        );
      }
    }

    console.log('');
    console.log(
      `  ${'Total'.padEnd(14)} ${chalk.yellow.bold(formatTokens(totalTokens).padStart(6))}t  ${chalk.dim(`(${((totalTokens / maxContext) * 100).toFixed(1)}% of context)`)}`
    );
  });

// ============ INTERACTIVE / PROMPT ============
program
  .command('interactive')
  .alias('i')
  .alias('prompt')
  .description('Interactive profile selection')
  .option('--startup', 'Running at session startup (internal)')
  .action(async (options) => {
    const profiles = getAllProfiles();
    const detection = detectProjectMcps();
    const lastUsed = getLastUsedProfile();
    const defaultProfile = getDefaultProfile();

    // Determine suggested profile
    let suggested = detection.suggestedProfile || lastUsed || defaultProfile;

    console.log(formatStartupPrompt(profiles, suggested, formatDetectionResult(detection)));

    const choices = profiles.map((p, i) => ({
      name: `[${i + 1}] ${icon(p.icon || 'layers')} ${p.id} - ${p.mcps.map(m => m.id).join(', ') || 'none'} (${formatTokens(p.totalTokens)}t)`,
      value: p.id,
    }));

    const { selectedProfile } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedProfile',
        message: 'Select profile:',
        choices,
        default: suggested,
      },
    ]);

    const result = applyProfile(selectedProfile);

    if (result.success) {
      const profile = resolveProfile(selectedProfile);
      console.log('');
      console.log(formatSuccess(`Loaded profile: ${selectedProfile}`));
      if (profile && profile.mcps.length > 0) {
        console.log(`  MCPs: ${profile.mcps.map(m => m.id).join(', ')}`);
        console.log(`  Token cost: ${formatTokens(profile.totalTokens)}`);
      } else {
        console.log('  No MCPs loaded - maximum context available');
      }
    } else {
      console.log(formatError(result.error || 'Failed to apply profile'));
    }
  });

// ============ CONFIG ============
const configCmd = program.command('config').description('Configuration management');

configCmd
  .command('get <key>')
  .description('Get a configuration value')
  .action((key: string) => {
    switch (key) {
      case 'startup.behavior':
        console.log(getStartupBehavior());
        break;
      case 'default.profile':
        console.log(getDefaultProfile());
        break;
      default:
        console.log(formatError(`Unknown config key: ${key}`));
    }
  });

configCmd
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action((key: string, value: string) => {
    switch (key) {
      case 'startup.behavior':
        if (!['prompt', 'auto', 'skip'].includes(value)) {
          console.log(formatError('startup.behavior must be: prompt, auto, or skip'));
          return;
        }
        setStartupBehavior(value as 'prompt' | 'auto' | 'skip');
        console.log(formatSuccess(`Set startup.behavior = ${value}`));
        break;
      case 'default.profile':
        const result = setDefaultProfile(value);
        if (result.success) {
          console.log(formatSuccess(`Set default.profile = ${value}`));
        } else {
          console.log(formatError(result.error || 'Failed to set default profile'));
        }
        break;
      default:
        console.log(formatError(`Unknown config key: ${key}`));
    }
  });

program.parse();
