import { AzPullRequestComment, AzPullRequestCommentThread } from '../api/types';

const RESOLVED_STATUSES = new Set(['fixed', 'wontFix', 'closed', 'byDesign']);

export interface PullRequestCommentFilters {
  unresolved?: boolean;
  includeSystem?: boolean;
}

export interface PullRequestCommentReplyTarget {
  threadId: number;
  parentCommentId: number;
}

function positiveInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${option} must be a positive integer.`);
  }
  return parsed;
}

export function parsePullRequestCommentReplyTarget(
  threadId?: string,
  parentCommentId?: string
): PullRequestCommentReplyTarget | undefined {
  if (!threadId && !parentCommentId) return undefined;
  if (!threadId || !parentCommentId) {
    throw new Error('Replying requires both --thread-id and --parent-comment-id.');
  }

  return {
    threadId: positiveInteger(threadId, '--thread-id'),
    parentCommentId: positiveInteger(parentCommentId, '--parent-comment-id'),
  };
}

export function filterPullRequestCommentThreads(
  threads: AzPullRequestCommentThread[],
  filters: PullRequestCommentFilters = {}
): AzPullRequestCommentThread[] {
  return threads
    .filter((thread) => !thread.isDeleted)
    .filter((thread) => !filters.unresolved || !thread.status || !RESOLVED_STATUSES.has(thread.status))
    .map((thread) => ({
      ...thread,
      comments: thread.comments.filter(
        (comment) =>
          !comment.isDeleted && (filters.includeSystem || comment.commentType !== 'system')
      ),
    }))
    .filter((thread) => thread.comments.length > 0);
}

function threadLocation(thread: AzPullRequestCommentThread): string | undefined {
  const context = thread.threadContext;
  if (!context?.filePath) return undefined;

  const position = context.rightFileStart ?? context.leftFileStart;
  return position ? `${context.filePath}:${position.line}` : context.filePath;
}

export function printPullRequestCommentThreads(threads: AzPullRequestCommentThread[]): void {
  if (threads.length === 0) {
    console.log('No pull request comments found.');
    return;
  }

  for (const thread of threads) {
    const status = thread.status ?? 'unknown';
    const location = threadLocation(thread);
    console.log(`## Thread #${thread.id} [${status}]${location ? ` — ${location}` : ''}`);
    console.log();

    for (const comment of thread.comments) {
      const reply = comment.parentCommentId > 0 ? '↳ ' : '';
      console.log(
        `${reply}Comment #${comment.id} by ${comment.author?.displayName ?? 'Unknown'} (${comment.publishedDate})`
      );
      console.log(comment.content ?? '');
      console.log();
    }
  }

  console.log(`${threads.length} comment thread(s).`);
}

export function printPullRequestComment(comment: AzPullRequestComment, threadId: number): void {
  console.log(`Comment #${comment.id} added to thread #${threadId}.`);
  console.log();
  console.log(comment.content ?? '');
}
