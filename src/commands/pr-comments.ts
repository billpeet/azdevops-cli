import { AzPullRequestCommentThread } from '../api/types';

const RESOLVED_STATUSES = new Set(['fixed', 'wontFix', 'closed', 'byDesign']);

export interface PullRequestCommentFilters {
  unresolved?: boolean;
  includeSystem?: boolean;
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
      console.log(`${reply}${comment.author?.displayName ?? 'Unknown'} (${comment.publishedDate})`);
      console.log(comment.content ?? '');
      console.log();
    }
  }

  console.log(`${threads.length} comment thread(s).`);
}
