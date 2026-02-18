import { Command } from 'commander';
import { getConfig, resolveProject } from '../config/store';
import { createClient } from '../api/client';
import { AzRepository } from '../api/types';

function die(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(JSON.stringify({ error: message }) + '\n');
  process.exit(1);
}

function printRepoList(repos: AzRepository[]): void {
  if (repos.length === 0) {
    console.log('No repositories found.');
    return;
  }

  const wName = Math.max(4, ...repos.map((r) => r.name.length));
  const wBranch = Math.max(14, ...repos.map((r) => (r.defaultBranch ?? '').length));
  const wId = Math.max(2, ...repos.map((r) => r.id.length));

  const pad = (s: string, n: number) => s.padEnd(n);
  const sep = (n: number) => '-'.repeat(n);

  console.log(`| ${pad('Name', wName)} | ${pad('Default Branch', wBranch)} | ${pad('ID', wId)} |`);
  console.log(`|${sep(wName + 2)}|${sep(wBranch + 2)}|${sep(wId + 2)}|`);
  for (const r of repos) {
    console.log(`| ${pad(r.name, wName)} | ${pad(r.defaultBranch ?? '', wBranch)} | ${pad(r.id, wId)} |`);
  }
  console.log();
  console.log(`${repos.length} repository(ies).`);
}

export function registerRepo(program: Command): void {
  const repo = program
    .command('repo')
    .description('Manage Azure DevOps repositories');

  repo
    .command('list')
    .description('List repositories in a project')
    .option('--project <project>', 'Project name (or set default with setup)')
    .option('--format <format>', 'Output format: text or json', 'json')
    .option('--pretty', 'Pretty-print JSON output')
    .action(async (opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }

      let project;
      try { project = resolveProject(opts, config); } catch (err) { die(err); }

      const client = createClient(config);
      try {
        const repos = await client.listRepositories(project);

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(repos, null, 2) : JSON.stringify(repos));
        } else {
          printRepoList(repos);
        }
      } catch (err) {
        die(err);
      }
    });
}
