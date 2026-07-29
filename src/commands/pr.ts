import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig, resolveProject } from '../config/store';
import { createClient } from '../api/client';
import { AzPullRequest, AzReviewer } from '../api/types';
import {
  filterPullRequestCommentThreads,
  parsePullRequestCommentReplyTarget,
  printPullRequestComment,
  printPullRequestCommentThreads,
} from './pr-comments';

function die(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(JSON.stringify({ error: message }) + '\n');
  process.exit(1);
}

function voteLabel(vote: number): string {
  switch (vote) {
    case 10: return 'Approved';
    case 5: return 'Approved with suggestions';
    case 0: return 'No vote';
    case -5: return 'Waiting for author';
    case -10: return 'Rejected';
    default: return `Unknown (${vote})`;
  }
}

function refShort(ref: string): string {
  return ref.replace(/^refs\/heads\//, '');
}

function printPrList(prs: AzPullRequest[]): void {
  if (prs.length === 0) {
    console.log('No pull requests found.');
    return;
  }

  const wId = Math.max(2, ...prs.map((p) => String(p.pullRequestId).length));
  const wTitle = Math.max(5, ...prs.map((p) => p.title.substring(0, 60).length));
  const wStatus = Math.max(6, ...prs.map((p) => p.status.length));
  const wAuthor = Math.max(6, ...prs.map((p) => (p.createdBy?.displayName ?? '').length));

  const pad = (s: string, n: number) => s.padEnd(n);
  const sep = (n: number) => '-'.repeat(n);

  console.log(`| ${pad('ID', wId)} | ${pad('Title', wTitle)} | ${pad('Status', wStatus)} | ${pad('Author', wAuthor)} |`);
  console.log(`|${sep(wId + 2)}|${sep(wTitle + 2)}|${sep(wStatus + 2)}|${sep(wAuthor + 2)}|`);
  for (const p of prs) {
    console.log(`| ${pad(String(p.pullRequestId), wId)} | ${pad(p.title.substring(0, 60), wTitle)} | ${pad(p.status, wStatus)} | ${pad(p.createdBy?.displayName ?? '', wAuthor)} |`);
  }
  console.log();
  console.log(`${prs.length} pull request(s).`);
}

function printPr(pr: AzPullRequest): void {
  console.log(`## Pull Request #${pr.pullRequestId}`);
  console.log();
  console.log(`Title:        ${pr.title}`);
  console.log(`Status:       ${pr.status}`);
  console.log(`Source:       ${refShort(pr.sourceRefName)}`);
  console.log(`Target:       ${refShort(pr.targetRefName)}`);
  console.log(`Created by:   ${pr.createdBy?.displayName ?? 'Unknown'}`);
  console.log(`Created:      ${pr.creationDate}`);
  console.log(`Merge status: ${pr.mergeStatus ?? 'N/A'}`);
  if (pr.description) {
    console.log();
    console.log('Description:');
    console.log(pr.description);
  }
  if (pr.reviewers && pr.reviewers.length > 0) {
    console.log();
    console.log('Reviewers:');
    for (const r of pr.reviewers) {
      console.log(`  - ${r.displayName}: ${voteLabel(r.vote)}`);
    }
  }
}

function printReviewerList(reviewers: AzReviewer[]): void {
  if (reviewers.length === 0) {
    console.log('No reviewers found.');
    return;
  }

  const wName = Math.max(4, ...reviewers.map((r) => r.displayName.length));
  const wVote = Math.max(4, ...reviewers.map((r) => voteLabel(r.vote).length));

  const pad = (s: string, n: number) => s.padEnd(n);
  const sep = (n: number) => '-'.repeat(n);

  console.log(`| ${pad('Name', wName)} | ${pad('Vote', wVote)} |`);
  console.log(`|${sep(wName + 2)}|${sep(wVote + 2)}|`);
  for (const r of reviewers) {
    console.log(`| ${pad(r.displayName, wName)} | ${pad(voteLabel(r.vote), wVote)} |`);
  }
}

export function registerPr(program: Command): void {
  const pr = program
    .command('pr')
    .description('Manage Azure DevOps pull requests');

  pr
    .command('list')
    .description('List pull requests in a repository')
    .requiredOption('--repo <repo>', 'Repository name or ID')
    .option('--project <project>', 'Project name (or set default with setup)')
    .option('--status <status>', 'Filter by status: active, completed, abandoned, all', 'active')
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
        const prs = await client.listPullRequests(project, opts.repo, {
          status: opts.status,
          top: opts.top ? parseInt(opts.top, 10) : undefined,
        });

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(prs, null, 2) : JSON.stringify(prs));
        } else {
          printPrList(prs);
        }
      } catch (err) {
        die(err);
      }
    });

  pr
    .command('get')
    .description('Get details of a pull request')
    .requiredOption('--repo <repo>', 'Repository name or ID')
    .requiredOption('--id <id>', 'Pull request ID')
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
        const result = await client.getPullRequest(project, opts.repo, parseInt(opts.id, 10));

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result));
        } else {
          printPr(result);
        }
      } catch (err) {
        die(err);
      }
    });

  pr
    .command('create')
    .description('Create a new pull request')
    .requiredOption('--repo <repo>', 'Repository name or ID')
    .requiredOption('--source <branch>', 'Source branch name')
    .requiredOption('--target <branch>', 'Target branch name')
    .requiredOption('--title <title>', 'Pull request title')
    .option('--description <text>', 'Pull request description')
    .option('--reviewers <ids>', 'Comma-separated reviewer IDs')
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
        const body: {
          sourceRefName: string;
          targetRefName: string;
          title: string;
          description?: string;
          reviewers?: { id: string }[];
        } = {
          sourceRefName: `refs/heads/${opts.source}`,
          targetRefName: `refs/heads/${opts.target}`,
          title: opts.title,
        };
        if (opts.description) body.description = opts.description;
        if (opts.reviewers) {
          body.reviewers = opts.reviewers.split(',').map((id: string) => ({ id: id.trim() }));
        }

        const result = await client.createPullRequest(project, opts.repo, body);

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result));
        } else {
          console.log(chalk.green(`✓ Created pull request #${result.pullRequestId}`));
          console.log();
          printPr(result);
        }
      } catch (err) {
        die(err);
      }
    });

  pr
    .command('update')
    .description('Update an existing pull request')
    .requiredOption('--repo <repo>', 'Repository name or ID')
    .requiredOption('--id <id>', 'Pull request ID')
    .option('--status <status>', 'New status: completed, abandoned')
    .option('--title <title>', 'New title')
    .option('--description <text>', 'New description')
    .option('--project <project>', 'Project name (or set default with setup)')
    .option('--format <format>', 'Output format: text or json', 'json')
    .option('--pretty', 'Pretty-print JSON output')
    .action(async (opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      let project;
      try { project = resolveProject(opts, config); } catch (err) { die(err); }

      const body: Record<string, unknown> = {};
      if (opts.status) body.status = opts.status;
      if (opts.title) body.title = opts.title;
      if (opts.description) body.description = opts.description;

      if (Object.keys(body).length === 0) {
        die(new Error('No update fields provided. Use --status, --title, or --description.'));
      }

      const client = createClient(config);
      try {
        const result = await client.updatePullRequest(project, opts.repo, parseInt(opts.id, 10), body);

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result));
        } else {
          console.log(chalk.green(`✓ Updated pull request #${result.pullRequestId}`));
          console.log();
          printPr(result);
        }
      } catch (err) {
        die(err);
      }
    });

  pr
    .command('reviewers')
    .description('List reviewers of a pull request')
    .requiredOption('--repo <repo>', 'Repository name or ID')
    .requiredOption('--id <id>', 'Pull request ID')
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
        const reviewers = await client.listPullRequestReviewers(project, opts.repo, parseInt(opts.id, 10));

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(reviewers, null, 2) : JSON.stringify(reviewers));
        } else {
          printReviewerList(reviewers);
        }
      } catch (err) {
        die(err);
      }
    });

  pr
    .command('comments')
    .alias('threads')
    .description('List comment threads on a pull request')
    .requiredOption('--repo <repo>', 'Repository name or ID')
    .requiredOption('--id <id>', 'Pull request ID')
    .option('--project <project>', 'Project name (or set default with setup)')
    .option('--unresolved', 'Show only threads that are not resolved')
    .option('--include-system', 'Include system-generated activity threads')
    .option('--format <format>', 'Output format: text or json', 'json')
    .option('--pretty', 'Pretty-print JSON output')
    .action(async (opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      let project;
      try { project = resolveProject(opts, config); } catch (err) { die(err); }

      const client = createClient(config);
      try {
        const allThreads = await client.listPullRequestCommentThreads(
          project,
          opts.repo,
          parseInt(opts.id, 10)
        );
        const threads = filterPullRequestCommentThreads(allThreads, {
          unresolved: opts.unresolved,
          includeSystem: opts.includeSystem,
        });

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(threads, null, 2) : JSON.stringify(threads));
        } else {
          printPullRequestCommentThreads(threads);
        }
      } catch (err) {
        die(err);
      }
    });

  pr
    .command('comment')
    .description('Add a comment to a pull request or reply to a review comment')
    .requiredOption('--repo <repo>', 'Repository name or ID')
    .requiredOption('--id <id>', 'Pull request ID')
    .requiredOption('--content <text>', 'Comment content')
    .option('--thread-id <id>', 'Thread ID to reply in')
    .option('--parent-comment-id <id>', 'Comment ID to reply to')
    .option('--project <project>', 'Project name (or set default with setup)')
    .option('--format <format>', 'Output format: text or json', 'json')
    .option('--pretty', 'Pretty-print JSON output')
    .action(async (opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      let project;
      try { project = resolveProject(opts, config); } catch (err) { die(err); }
      let replyTarget;
      try {
        replyTarget = parsePullRequestCommentReplyTarget(
          opts.threadId,
          opts.parentCommentId
        );
      } catch (err) {
        die(err);
      }

      const client = createClient(config);
      try {
        if (replyTarget) {
          const comment = await client.replyToPullRequestComment(
            project,
            opts.repo,
            parseInt(opts.id, 10),
            replyTarget.threadId,
            replyTarget.parentCommentId,
            opts.content
          );

          if (opts.format === 'json') {
            console.log(opts.pretty ? JSON.stringify(comment, null, 2) : JSON.stringify(comment));
          } else {
            printPullRequestComment(comment, replyTarget.threadId);
          }
          return;
        }

        const thread = await client.createPullRequestCommentThread(
          project,
          opts.repo,
          parseInt(opts.id, 10),
          opts.content
        );

        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(thread, null, 2) : JSON.stringify(thread));
        } else {
          printPullRequestCommentThreads([thread]);
        }
      } catch (err) {
        die(err);
      }
    });
}
