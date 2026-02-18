import { Command } from 'commander';
import { getConfig } from '../config/store';
import { createClient } from '../api/client';
import { AzProject } from '../api/types';

function die(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(JSON.stringify({ error: message }) + '\n');
  process.exit(1);
}

function printProjectList(projects: AzProject[]): void {
  if (projects.length === 0) {
    console.log('No projects found.');
    return;
  }

  const wId = Math.max(2, ...projects.map((p) => p.id.length));
  const wName = Math.max(4, ...projects.map((p) => p.name.length));
  const wState = Math.max(5, ...projects.map((p) => (p.state ?? '').length));

  const pad = (s: string, n: number) => s.padEnd(n);
  const sep = (n: number) => '-'.repeat(n);

  console.log(`| ${pad('ID', wId)} | ${pad('Name', wName)} | ${pad('State', wState)} |`);
  console.log(`|${sep(wId + 2)}|${sep(wName + 2)}|${sep(wState + 2)}|`);
  for (const p of projects) {
    console.log(`| ${pad(p.id, wId)} | ${pad(p.name, wName)} | ${pad(p.state ?? '', wState)} |`);
  }
  console.log();
  console.log(`${projects.length} project(s).`);
}

export function registerProject(program: Command): void {
  const project = program
    .command('project')
    .description('Manage Azure DevOps projects');

  project
    .command('list')
    .description('List all accessible projects')
    .option('--top <n>', 'Maximum results to return')
    .option('--skip <n>', 'Number of results to skip')
    .option('--format <format>', 'Output format: text or json', 'json')
    .option('--pretty', 'Pretty-print JSON output')
    .action(async (opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      const client = createClient(config);

      try {
        const projects = await client.listProjects(
          opts.top ? parseInt(opts.top, 10) : undefined,
          opts.skip ? parseInt(opts.skip, 10) : undefined
        );

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(projects, null, 2) : JSON.stringify(projects));
        } else {
          printProjectList(projects);
        }
      } catch (err) {
        die(err);
      }
    });
}
