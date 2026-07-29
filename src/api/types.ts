export interface AzProject {
  id: string;
  name: string;
  description: string;
  state: string;
  url: string;
}

export interface AzRepository {
  id: string;
  name: string;
  url: string;
  defaultBranch: string;
  project: AzProject;
}

export interface AzRef {
  name: string;
  objectId: string;
}

export interface AzIdentity {
  id: string;
  displayName: string;
  uniqueName?: string;
}

export interface AzReviewer extends AzIdentity {
  vote: number; // 10=approved, 5=approved with suggestions, 0=no vote, -5=waiting, -10=rejected
}

export interface AzPullRequest {
  pullRequestId: number;
  title: string;
  description: string;
  status: string;
  sourceRefName: string;
  targetRefName: string;
  createdBy: AzIdentity;
  reviewers: AzReviewer[];
  creationDate: string;
  mergeStatus: string;
  url: string;
  repository: AzRepository;
}

export type AzCommentType = 'unknown' | 'text' | 'codeChange' | 'system';

export type AzCommentThreadStatus =
  | 'unknown'
  | 'active'
  | 'fixed'
  | 'wontFix'
  | 'closed'
  | 'byDesign'
  | 'pending';

export interface AzCommentPosition {
  line: number;
  offset: number;
}

export interface AzCommentThreadContext {
  filePath?: string;
  leftFileStart?: AzCommentPosition;
  leftFileEnd?: AzCommentPosition;
  rightFileStart?: AzCommentPosition;
  rightFileEnd?: AzCommentPosition;
}

export interface AzPullRequestComment {
  id: number;
  parentCommentId: number;
  author: AzIdentity;
  content?: string;
  publishedDate: string;
  lastUpdatedDate: string;
  lastContentUpdatedDate?: string;
  commentType: AzCommentType;
  isDeleted?: boolean;
  usersLiked?: AzIdentity[];
}

export interface AzPullRequestCommentThread {
  id: number;
  publishedDate: string;
  lastUpdatedDate: string;
  comments: AzPullRequestComment[];
  status?: AzCommentThreadStatus;
  threadContext?: AzCommentThreadContext | null;
  isDeleted: boolean;
  properties?: Record<string, unknown>;
}

export interface AzPipeline {
  id: number;
  name: string;
  url: string;
  folder: string;
}

export interface AzPipelineRun {
  id: number;
  name: string;
  state: string;
  result: string;
  createdDate: string;
  finishedDate: string;
  pipeline: AzPipeline;
}

export interface AzWorkItem {
  id: number;
  rev: number;
  fields: Record<string, unknown>;
  url: string;
}

export interface AzWorkItemQueryResult {
  queryType: string;
  queryResultType: string;
  workItems: { id: number; url: string }[];
}

export interface AzListResponse<T> {
  value: T[];
  count: number;
}
