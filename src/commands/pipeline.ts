import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig, resolveProject } from '../config/store';
import { createClient } from '../api/client';
import { AzPipeline, AzPipelineRun } from '../api/types';

function die(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(JSON.stringify({ error: message }) + '\n');
  process.exit(1);
}

function printPipelineList(pipelines: AzPipeline[]): void {
  if (pipelines.length === 0) {
    console.log('No pipelines found.');
    return;
  }

  const wId = Math.max(2, ...pipelines.map((p) => String(p.id).length));
  const wName = Math.max(4, ...pipelines.map((p) => p.name.length));
  const wFolder = Math.max(6, ...pipelines.map((p) => (p.folder ?? '').length));

  const pad = (s: string, n: number) => s.padEnd(n);
  const sep = (n: number) => '-'.repeat(n);

  console.log(`| ${pad('ID', wId)} | ${pad('Name', wName)} | ${pad('Folder', wFolder)} |`);
  console.log(`|${sep(wId + 2)}|${sep(wName + 2)}|${sep(wFolder + 2)}|`);
  for (const p of pipelines) {
    console.log(`| ${pad(String(p.id), wId)} | ${pad(p.name, wName)} | ${pad(p.folder ?? '', wFolder)} |`);
  }
  console.log();
  console.log(`${pipelines.length} pipeline(s).`);
}

function printRunList(runs: AzPipelineRun[]): void {
  if (runs.length === 0) {
    console.log('No pipeline runs found.');
    return;
  }

  const wId = Math.max(2, ...runs.map((r) => String(r.id).length));
  const wName = Math.max(4, ...runs.map((r) => (r.name ?? '').length));
  const wState = Math.max(5, ...runs.map((r) => (r.state ?? '').length));
  const wResult = Math.max(6, ...runs.map((r) => (r.result ?? '').length));

  const pad = (s: string, n: number) => s.padEnd(n);
  const sep = (n: number) => '-'.repeat(n);

  console.log(`| ${pad('ID', wId)} | ${pad('Name', wName)} | ${pad('State', wState)} | ${pad('Result', wResult)} | Created            |`);
  console.log(`|${sep(wId + 2)}|${sep(wName + 2)}|${sep(wState + 2)}|${sep(wResult + 2)}|--------------------|`);
  for (const r of runs) {
    console.log(`| ${pad(String(r.id), wId)} | ${pad(r.name ?? '', wName)} | ${pad(r.state ?? '', wState)} | ${pad(r.result ?? '', wResult)} | ${(r.createdDate ?? '').substring(0, 19)} |`);
  }
  console.log();
  console.log(`${runs.length} run(s).`);
}

function printRun(run: AzPipelineRun): void {
  console.log(`## Pipeline Run #${run.id}`);
  console.log();
  console.log(`Name:     ${run.name ?? 'N/A'}`);
  console.log(`State:    ${run.state ?? 'N/A'}`);
  console.log(`Result:   ${run.result ?? 'N/A'}`);
  console.log(`Created:  ${run.createdDate ?? 'N/A'}`);
  console.log(`Finished: ${run.finishedDate ?? 'N/A'}`);
  if (run.pipeline) {
    console.log(`Pipeline: ${run.pipeline.name} (ID: ${run.pipeline.id})`);
  }
}

export function registerPipeline(program: Command): void {
  const pipeline = program
    .command('pipeline')
    .description('Manage Azure DevOps pipelines');

  pipeline
    .command('list')
    .description('List pipelines in a project')
    .option('--project <project>', 'Project name (or set default with setup)')
    .option('--top <n>', 'Maximum results to return')
    .option('--format <format>', 'Output format: text or json', 'json')
    .option('--pretty', 'Pretty-print JSON output')
    .action(async (opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      let project;
      try { project = resolveProject(opts, config); } catch (err) { die(err); }

      const client = createClient(config);
      try {
        const pipelines = await client.listPipelines(project, opts.top ? parseInt(opts.top, 10) : undefined);

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(pipelines, null, 2) : JSON.stringify(pipelines));
        } else {
          printPipelineList(pipelines);
        }
      } catch (err) {
        die(err);
      }
    });

  pipeline
    .command('run')
    .description('Trigger a pipeline run')
    .requiredOption('--pipeline-id <id>', 'Pipeline ID')
    .option('--branch <branch>', 'Branch to run on')
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
        const result = await client.runPipeline(
          project,
          parseInt(opts.pipelineId, 10),
          opts.branch
        );

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result));
        } else {
          console.log(chalk.green(`✓ Pipeline run #${result.id} triggered`));
          console.log();
          printRun(result);
        }
      } catch (err) {
        die(err);
      }
    });

  pipeline
    .command('runs')
    .description('List runs for a pipeline')
    .requiredOption('--pipeline-id <id>', 'Pipeline ID')
    .option('--project <project>', 'Project name (or set default with setup)')
    .option('--top <n>', 'Maximum results to return')
    .option('--format <format>', 'Output format: text or json', 'json')
    .option('--pretty', 'Pretty-print JSON output')
    .action(async (opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      let project;
      try { project = resolveProject(opts, config); } catch (err) { die(err); }

      const client = createClient(config);
      try {
        const runs = await client.listPipelineRuns(
          project,
          parseInt(opts.pipelineId, 10),
          opts.top ? parseInt(opts.top, 10) : undefined
        );

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(runs, null, 2) : JSON.stringify(runs));
        } else {
          printRunList(runs);
        }
      } catch (err) {
        die(err);
      }
    });

  pipeline
    .command('run-get')
    .description('Get details of a pipeline run')
    .requiredOption('--pipeline-id <id>', 'Pipeline ID')
    .requiredOption('--run-id <id>', 'Run ID')
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
        const result = await client.getPipelineRun(
          project,
          parseInt(opts.pipelineId, 10),
          parseInt(opts.runId, 10)
        );

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result));
        } else {
          printRun(result);
        }
      } catch (err) {
        die(err);
      }
    });
}
