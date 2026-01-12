import chalk from 'chalk';
import { McpStatus, ResolvedProfile } from './types.js';

const ICONS: Record<string, string> = {
  rocket: '\u{1F680}',
  database: '\u{1F5C4}',
  spider: '\u{1F577}',
  magnify: '\u{1F50D}',
  chart: '\u{1F4CA}',
  layers: '\u{1F4DA}',
  empty: '\u{26AA}',
  plug: '\u{1F50C}',
  check: '\u{2713}',
  cross: '\u{2717}',
  circle: '\u{25CB}',
  filled: '\u{25CF}',
  lightning: '\u{26A1}',
  tip: '\u{1F4A1}',
};

export function icon(name: string): string {
  return ICONS[name] || '';
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

export function formatTokenBar(tokens: number, maxTokens: number = 200000): string {
  const percentage = Math.min(tokens / maxTokens, 1);
  const barLength = 20;
  const filled = Math.round(percentage * barLength);
  const empty = barLength - filled;

  const bar = chalk.green('\u{2588}'.repeat(filled)) + chalk.gray('\u{2591}'.repeat(empty));
  return `${bar} ${formatTokens(tokens)}`;
}

export function formatPercentage(tokens: number, maxTokens: number = 200000): string {
  const percentage = (tokens / maxTokens) * 100;
  return `${percentage.toFixed(1)}%`;
}

export function formatMcpStatus(mcp: McpStatus): string {
  const statusIcon = mcp.active ? chalk.green(icon('check')) : chalk.gray(icon('circle'));
  const name = mcp.active ? chalk.white(mcp.name) : chalk.gray(mcp.name);
  const tokens = chalk.yellow(formatTokens(mcp.tokenCost) + 't');
  const desc = chalk.dim(mcp.description);

  return `  ${statusIcon} ${name.padEnd(14)} ${tokens.padStart(8)}   ${desc}`;
}

export function formatProfileOption(
  profile: ResolvedProfile,
  index: number,
  isSelected: boolean = false
): string {
  const profileIcon = icon(profile.icon || 'layers');
  const prefix = isSelected ? chalk.cyan('> ') : '  ';
  const name = isSelected ? chalk.cyan.bold(profile.id) : chalk.white(profile.id);
  const mcpList = profile.mcps.map(m => m.id).join(', ') || 'none';
  const tokens = chalk.yellow(`(${formatTokens(profile.totalTokens)}t)`);

  return `${prefix}[${index}] ${profileIcon} ${name.padEnd(12)} - ${chalk.dim(mcpList)} ${tokens}`;
}

export function formatStatusBox(
  activeMcps: McpStatus[],
  availableMcps: McpStatus[],
  totalTokens: number
): string {
  const lines: string[] = [];
  const maxContext = 200000;
  const baselineTokens = 19000; // Approximate system + tools baseline

  lines.push(chalk.cyan.bold('MCP Status'));
  lines.push(chalk.dim('\u{2500}'.repeat(50)));
  lines.push('');

  // Active MCPs
  lines.push(chalk.white.bold('Active MCPs:'));
  if (activeMcps.length === 0) {
    lines.push(chalk.dim('  No MCPs active'));
  } else {
    for (const mcp of activeMcps) {
      lines.push(formatMcpStatus(mcp));
    }
  }

  lines.push('');
  lines.push(
    `Total MCP cost: ${chalk.yellow(formatTokens(totalTokens))} tokens ` +
      chalk.dim(`(${formatPercentage(totalTokens, maxContext)} of context)`)
  );

  // Available MCPs
  if (availableMcps.length > 0) {
    lines.push('');
    lines.push(chalk.white.bold('Available MCPs:'));
    for (const mcp of availableMcps) {
      lines.push(formatMcpStatus(mcp));
    }
  }

  // Potential savings tip
  if (activeMcps.length > 0) {
    const largestMcp = activeMcps.reduce((a, b) => (a.tokenCost > b.tokenCost ? a : b));
    if (largestMcp.tokenCost > 1000) {
      lines.push('');
      lines.push(
        `${icon('tip')} Tip: Disable ${chalk.white(largestMcp.name)} to free ${chalk.yellow(formatTokens(largestMcp.tokenCost))} tokens`
      );
    }
  }

  return lines.join('\n');
}

export function formatStartupPrompt(
  profiles: ResolvedProfile[],
  suggestedProfile?: string,
  detectionInfo?: string
): string {
  const lines: string[] = [];
  const maxContext = 200000;
  const baselineTokens = 19000;

  lines.push('');
  lines.push(chalk.cyan.bold(`${icon('plug')} MCP Manager - Session Startup`));
  lines.push('');
  lines.push(`  Context budget: ${chalk.white('200k')} tokens`);
  lines.push(`  Baseline (system + tools): ~${chalk.yellow(formatTokens(baselineTokens))} (${formatPercentage(baselineTokens, maxContext)})`);
  lines.push('');

  lines.push(chalk.white('  Select MCP profile:'));

  profiles.forEach((profile, index) => {
    const isSuggested = profile.id === suggestedProfile;
    lines.push(formatProfileOption(profile, index + 1, isSuggested));
  });

  if (detectionInfo) {
    lines.push('');
    lines.push(chalk.dim(detectionInfo));
  }

  if (suggestedProfile) {
    lines.push('');
    lines.push(chalk.green(`  Suggested: ${suggestedProfile}`));
  }

  lines.push('');

  return lines.join('\n');
}

export function formatSuccess(message: string): string {
  return chalk.green(`${icon('check')} ${message}`);
}

export function formatError(message: string): string {
  return chalk.red(`${icon('cross')} ${message}`);
}

export function formatInfo(message: string): string {
  return chalk.cyan(`${icon('lightning')} ${message}`);
}
