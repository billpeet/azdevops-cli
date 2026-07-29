import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import { createClient } from '../src/api/client';
import { AzPullRequestCommentThread } from '../src/api/types';
import { filterPullRequestCommentThreads } from '../src/commands/pr-comments';

function thread(
  id: number,
  status: AzPullRequestCommentThread['status'],
  commentType: 'text' | 'system' = 'text',
  isDeleted = false
): AzPullRequestCommentThread {
  return {
    id,
    status,
    isDeleted,
    publishedDate: '2026-07-29T00:00:00Z',
    lastUpdatedDate: '2026-07-29T00:00:00Z',
    comments: [
      {
        id: 1,
        parentCommentId: 0,
        author: { id: 'reviewer', displayName: 'CodeRabbit' },
        content: 'Please handle this edge case.',
        publishedDate: '2026-07-29T00:00:00Z',
        lastUpdatedDate: '2026-07-29T00:00:00Z',
        commentType,
      },
    ],
  };
}

test('unresolved filtering excludes every terminal resolution status', () => {
  const threads = [
    thread(1, 'active'),
    thread(2, 'pending'),
    thread(3, 'unknown'),
    thread(4, undefined),
    thread(5, 'fixed'),
    thread(6, 'wontFix'),
    thread(7, 'closed'),
    thread(8, 'byDesign'),
  ];

  assert.deepEqual(
    filterPullRequestCommentThreads(threads, { unresolved: true }).map(({ id }) => id),
    [1, 2, 3, 4]
  );
});

test('system-only and deleted threads are hidden unless system activity is requested', () => {
  const mixedThread = thread(4, 'active');
  mixedThread.comments.push({
    ...mixedThread.comments[0],
    id: 2,
    commentType: 'system',
    content: 'A system event',
  });
  const threads = [
    thread(1, 'active'),
    thread(2, undefined, 'system'),
    thread(3, 'active', 'text', true),
    mixedThread,
  ];

  const defaultResult = filterPullRequestCommentThreads(threads);
  assert.deepEqual(defaultResult.map(({ id }) => id), [1, 4]);
  assert.deepEqual(defaultResult[1].comments.map(({ id }) => id), [1]);

  const withSystem = filterPullRequestCommentThreads(threads, { includeSystem: true });
  assert.deepEqual(withSystem.map(({ id }) => id), [1, 2, 4]);
  assert.deepEqual(withSystem[2].comments.map(({ id }) => id), [1, 2]);
});

test('client requests the Azure DevOps pull request threads endpoint', async () => {
  const originalCreate = axios.create;
  let requestedPath: string | undefined;

  (axios as unknown as { create: typeof axios.create }).create = (() => ({
    get: async (path: string) => {
      requestedPath = path;
      return { data: { count: 1, value: [thread(42, 'active')] } };
    },
  })) as typeof axios.create;

  try {
    const client = createClient({ organization: 'my-org', token: 'secret' });
    const result = await client.listPullRequestCommentThreads('My Project', 'my/repo', 123);

    assert.equal(
      requestedPath,
      'My%20Project/_apis/git/repositories/my%2Frepo/pullrequests/123/threads'
    );
    assert.equal(result[0].id, 42);
  } finally {
    (axios as unknown as { create: typeof axios.create }).create = originalCreate;
  }
});
