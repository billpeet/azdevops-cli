import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig, resolveProject } from '../config/store';
import { createClient, JsonPatchOp } from '../api/client';
import { AzWorkItem } from '../api/types';

function die(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(JSON.stringify({ error: message }) + '\n');
  process.exit(1);
}

function printWorkItem(wi: AzWorkItem): void {
  const f = wi.fields;
  console.log(`## Work Item #${wi.id}`);
  console.log();
  console.log(`Type:        ${f['System.WorkItemType'] ?? 'N/A'}`);
  console.log(`Title:       ${f['System.Title'] ?? 'N/A'}`);
  console.log(`State:       ${f['System.State'] ?? 'N/A'}`);
  const assignedTo = f['System.AssignedTo'] as { displayName?: string } | undefined;
  console.log(`Assigned to: ${assignedTo?.displayName ?? 'Unassigned'}`);
  if (f['System.Description']) {
    console.log();
    console.log('Description:');
    console.log(String(f['System.Description']));
  }
}

function printWorkItemList(items: AzWorkItem[]): void {
  if (items.length === 0) {
    console.log('No work items found.');
    return;
  }

  const wId = Math.max(2, ...items.map((i) => String(i.id).length));
  const wType = Math.max(4, ...items.map((i) => String(i.fields['System.WorkItemType'] ?? '').length));
  const wTitle = Math.max(5, ...items.map((i) => String(i.fields['System.Title'] ?? '').substring(0, 60).length));
  const wState = Math.max(5, ...items.map((i) => String(i.fields['System.State'] ?? '').length));

  const pad = (s: string, n: number) => s.padEnd(n);
  const sep = (n: number) => '-'.repeat(n);

  console.log(`| ${pad('ID', wId)} | ${pad('Type', wType)} | ${pad('Title', wTitle)} | ${pad('State', wState)} |`);
  console.log(`|${sep(wId + 2)}|${sep(wType + 2)}|${sep(wTitle + 2)}|${sep(wState + 2)}|`);
  for (const i of items) {
    console.log(`| ${pad(String(i.id), wId)} | ${pad(String(i.fields['System.WorkItemType'] ?? ''), wType)} | ${pad(String(i.fields['System.Title'] ?? '').substring(0, 60), wTitle)} | ${pad(String(i.fields['System.State'] ?? ''), wState)} |`);
  }
  console.log();
  console.log(`${items.length} work item(s).`);
}

export function registerWorkItem(program: Command): void {
  const workItem = program
    .command('work-item')
    .description('Manage Azure DevOps work items');

  workItem
    .command('get')
    .description('Get a work item by ID')
    .requiredOption('--id <id>', 'Work item ID')
    .option('--project <project>', 'Project name (or set default with setup)')
    .option('--expand <expand>', 'Expand options: none, relations, fields, links, all')
    .option('--format <format>', 'Output format: text or json', 'json')
    .option('--pretty', 'Pretty-print JSON output')
    .action(async (opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      let project;
      try { project = resolveProject(opts, config); } catch (err) { die(err); }

      const client = createClient(config);
      try {
        const wi = await client.getWorkItem(project, parseInt(opts.id, 10), opts.expand);

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(wi, null, 2) : JSON.stringify(wi));
        } else {
          printWorkItem(wi);
        }
      } catch (err) {
        die(err);
      }
    });

  workItem
    .command('create')
    .description('Create a new work item')
    .requiredOption('--type <type>', 'Work item type (e.g. Bug, Task, User Story)')
    .requiredOption('--title <title>', 'Work item title')
    .option('--description <text>', 'Work item description')
    .option('--assigned-to <name>', 'Assign to user')
    .option('--project <project>', 'Project name (or set default with setup)')
    .option('--format <format>', 'Output format: text or json', 'json')
    .option('--pretty', 'Pretty-print JSON output')
    .action(async (opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      let project;
      try { project = resolveProject(opts, config); } catch (err) { die(err); }

      const ops: JsonPatchOp[] = [
        { op: 'add', path: '/fields/System.Title', value: opts.title },
      ];
      if (opts.description) {
        ops.push({ op: 'add', path: '/fields/System.Description', value: opts.description });
      }
      if (opts.assignedTo) {
        ops.push({ op: 'add', path: '/fields/System.AssignedTo', value: opts.assignedTo });
      }

      const client = createClient(config);
      try {
        const wi = await client.createWorkItem(project, opts.type, ops);

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(wi, null, 2) : JSON.stringify(wi));
        } else {
          console.log(chalk.green(`✓ Created work item #${wi.id}`));
          console.log();
          printWorkItem(wi);
        }
      } catch (err) {
        die(err);
      }
    });

  workItem
    .command('update')
    .description('Update an existing work item')
    .requiredOption('--id <id>', 'Work item ID')
    .option('--title <title>', 'New title')
    .option('--state <state>', 'New state')
    .option('--assigned-to <name>', 'Assign to user')
    .option('--description <text>', 'New description')
    .option('--project <project>', 'Project name (or set default with setup)')
    .option('--format <format>', 'Output format: text or json', 'json')
    .option('--pretty', 'Pretty-print JSON output')
    .action(async (opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      let project;
      try { project = resolveProject(opts, config); } catch (err) { die(err); }

      const ops: JsonPatchOp[] = [];
      if (opts.title) {
        ops.push({ op: 'replace', path: '/fields/System.Title', value: opts.title });
      }
      if (opts.state) {
        ops.push({ op: 'replace', path: '/fields/System.State', value: opts.state });
      }
      if (opts.assignedTo) {
        ops.push({ op: 'replace', path: '/fields/System.AssignedTo', value: opts.assignedTo });
      }
      if (opts.description) {
        ops.push({ op: 'replace', path: '/fields/System.Description', value: opts.description });
      }

      if (ops.length === 0) {
        die(new Error('No update fields provided. Use --title, --state, --assigned-to, or --description.'));
      }

      const client = createClient(config);
      try {
        const wi = await client.updateWorkItem(project, parseInt(opts.id, 10), ops);

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(wi, null, 2) : JSON.stringify(wi));
        } else {
          console.log(chalk.green(`✓ Updated work item #${wi.id}`));
          console.log();
          printWorkItem(wi);
        }
      } catch (err) {
        die(err);
      }
    });

  workItem
    .command('query')
    .description('Query work items using WIQL')
    .requiredOption('--wiql <query>', 'WIQL query string')
    .option('--top <n>', 'Maximum results to return')
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
        const queryResult = await client.queryWorkItems(
          project,
          opts.wiql,
          opts.top ? parseInt(opts.top, 10) : undefined
        );

        if (!queryResult.workItems || queryResult.workItems.length === 0) {
          if (opts.format === 'json') {
            console.log(opts.pretty ? JSON.stringify([], null, 2) : JSON.stringify([]));
          } else {
            console.log('No work items found.');
          }
          return;
        }

        // Batch fetch full work item details
        const ids = queryResult.workItems.map((wi) => wi.id);
        const items = await client.getWorkItemsBatch(project, ids, [
          'System.Id',
          'System.Title',
          'System.State',
          'System.WorkItemType',
          'System.AssignedTo',
          'System.Description',
        ]);

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(items, null, 2) : JSON.stringify(items));
        } else {
          printWorkItemList(items);
        }
      } catch (err) {
        die(err);
      }
    });
}
