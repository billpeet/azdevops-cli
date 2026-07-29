import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import { createClient } from '../src/api/client';
import { AzPullRequestComment, AzPullRequestCommentThread } from '../src/api/types';
import {
  filterPullRequestCommentThreads,
  parsePullRequestCommentReplyTarget,
} from '../src/commands/pr-comments';

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

test('reply target requires both IDs and validates positive integers', () => {
  assert.equal(parsePullRequestCommentReplyTarget(), undefined);
  assert.deepEqual(parsePullRequestCommentReplyTarget('148', '1'), {
    threadId: 148,
    parentCommentId: 1,
  });
  assert.throws(
    () => parsePullRequestCommentReplyTarget('148'),
    /both --thread-id and --parent-comment-id/
  );
  assert.throws(
    () => parsePullRequestCommentReplyTarget(undefined, '1'),
    /both --thread-id and --parent-comment-id/
  );
  assert.throws(
    () => parsePullRequestCommentReplyTarget('thread', '1'),
    /--thread-id must be a positive integer/
  );
  assert.throws(
    () => parsePullRequestCommentReplyTarget('148', '0'),
    /--parent-comment-id must be a positive integer/
  );
});

test('client creates a new pull request comment thread', async () => {
  const originalCreate = axios.create;
  let requestedPath: string | undefined;
  let requestedBody: unknown;
  const createdThread = thread(147, 'active');

  (axios as unknown as { create: typeof axios.create }).create = (() => ({
    post: async (path: string, body: unknown) => {
      requestedPath = path;
      requestedBody = body;
      return { data: createdThread };
    },
  })) as typeof axios.create;

  try {
    const client = createClient({ organization: 'my-org', token: 'secret' });
    const result = await client.createPullRequestCommentThread(
      'My Project',
      'my/repo',
      123,
      'Looks good to me.'
    );

    assert.equal(
      requestedPath,
      'My%20Project/_apis/git/repositories/my%2Frepo/pullrequests/123/threads'
    );
    assert.deepEqual(requestedBody, {
      comments: [
        {
          parentCommentId: 0,
          content: 'Looks good to me.',
          commentType: 1,
        },
      ],
      status: 1,
    });
    assert.equal(result.id, 147);
  } finally {
    (axios as unknown as { create: typeof axios.create }).create = originalCreate;
  }
});

test('client replies to a pull request review comment', async () => {
  const originalCreate = axios.create;
  let requestedPath: string | undefined;
  let requestedBody: unknown;
  const createdComment: AzPullRequestComment = {
    id: 2,
    parentCommentId: 1,
    author: { id: 'author', displayName: 'Developer' },
    content: 'Fixed in the latest commit.',
    publishedDate: '2026-07-30T00:00:00Z',
    lastUpdatedDate: '2026-07-30T00:00:00Z',
    commentType: 'text',
  };

  (axios as unknown as { create: typeof axios.create }).create = (() => ({
    post: async (path: string, body: unknown) => {
      requestedPath = path;
      requestedBody = body;
      return { data: createdComment };
    },
  })) as typeof axios.create;

  try {
    const client = createClient({ organization: 'my-org', token: 'secret' });
    const result = await client.replyToPullRequestComment(
      'My Project',
      'my/repo',
      123,
      148,
      1,
      'Fixed in the latest commit.'
    );

    assert.equal(
      requestedPath,
      'My%20Project/_apis/git/repositories/my%2Frepo/pullrequests/123/threads/148/comments'
    );
    assert.deepEqual(requestedBody, {
      content: 'Fixed in the latest commit.',
      parentCommentId: 1,
      commentType: 1,
    });
    assert.equal(result.id, 2);
  } finally {
    (axios as unknown as { create: typeof axios.create }).create = originalCreate;
  }
});
