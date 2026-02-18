import { Command } from 'commander';
import { getConfig, resolveProject } from '../config/store';
import { createClient } from '../api/client';
import { AzRef } from '../api/types';

function die(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(JSON.stringify({ error: message }) + '\n');
  process.exit(1);
}

function printBranchList(branches: AzRef[]): void {
  if (branches.length === 0) {
    console.log('No branches found.');
    return;
  }

  const displayName = (name: string) => name.replace(/^refs\/heads\//, '');
  const shortSha = (sha: string) => sha.substring(0, 8);

  const wName = Math.max(4, ...branches.map((b) => displayName(b.name).length));

  const pad = (s: string, n: number) => s.padEnd(n);
  const sep = (n: number) => '-'.repeat(n);

  console.log(`| ${pad('Name', wName)} | Commit   |`);
  console.log(`|${sep(wName + 2)}|----------|`);
  for (const b of branches) {
    console.log(`| ${pad(displayName(b.name), wName)} | ${shortSha(b.objectId)} |`);
  }
  console.log();
  console.log(`${branches.length} branch(es).`);
}

export function registerBranch(program: Command): void {
  const branch = program
    .command('branch')
    .description('Manage Azure DevOps branches');

  branch
    .command('list')
    .description('List branches in a repository')
    .requiredOption('--repo <repo>', 'Repository name or ID')
    .option('--project <project>', 'Project name (or set default with setup)')
    .option('--filter <prefix>', 'Filter branches by prefix (e.g. feature/)')
    .option('--format <format>', 'Output format: text or json', 'json')
    .option('--pretty', 'Pretty-print JSON output')
    .action(async (opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }

      let project;
      try { project = resolveProject(opts, config); } catch (err) { die(err); }

      const client = createClient(config);
      try {
        const filter = opts.filter ? `heads/${opts.filter}` : 'heads/';
        const branches = await client.listBranches(project, opts.repo, filter);

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(branches, null, 2) : JSON.stringify(branches));
        } else {
          printBranchList(branches);
        }
      } catch (err) {
        die(err);
      }
    });
}
