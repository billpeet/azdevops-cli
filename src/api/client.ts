import axios, { AxiosInstance, AxiosError } from 'axios';
import { Config } from '../config/store';
import {
  AzProject,
  AzRepository,
  AzRef,
  AzPullRequest,
  AzPullRequestComment,
  AzPullRequestCommentThread,
  AzReviewer,
  AzPipeline,
  AzPipelineRun,
  AzWorkItem,
  AzWorkItemQueryResult,
  AzListResponse,
} from './types';

export interface AzDevOpsClient {
  listProjects(top?: number, skip?: number): Promise<AzProject[]>;
  listRepositories(project: string): Promise<AzRepository[]>;
  listBranches(project: string, repo: string, filter?: string): Promise<AzRef[]>;
  listPullRequests(project: string, repo: string, opts?: { status?: string; top?: number }): Promise<AzPullRequest[]>;
  getPullRequest(project: string, repo: string, id: number): Promise<AzPullRequest>;
  createPullRequest(project: string, repo: string, body: {
    sourceRefName: string;
    targetRefName: string;
    title: string;
    description?: string;
    reviewers?: { id: string }[];
  }): Promise<AzPullRequest>;
  updatePullRequest(project: string, repo: string, id: number, body: {
    status?: string;
    title?: string;
    description?: string;
  }): Promise<AzPullRequest>;
  listPullRequestReviewers(project: string, repo: string, id: number): Promise<AzReviewer[]>;
  listPullRequestCommentThreads(project: string, repo: string, id: number): Promise<AzPullRequestCommentThread[]>;
  createPullRequestCommentThread(
    project: string,
    repo: string,
    id: number,
    content: string
  ): Promise<AzPullRequestCommentThread>;
  replyToPullRequestComment(
    project: string,
    repo: string,
    id: number,
    threadId: number,
    parentCommentId: number,
    content: string
  ): Promise<AzPullRequestComment>;
  listPipelines(project: string, top?: number): Promise<AzPipeline[]>;
  runPipeline(project: string, pipelineId: number, branch?: string): Promise<AzPipelineRun>;
  listPipelineRuns(project: string, pipelineId: number, top?: number): Promise<AzPipelineRun[]>;
  getPipelineRun(project: string, pipelineId: number, runId: number): Promise<AzPipelineRun>;
  getWorkItem(project: string, id: number, expand?: string): Promise<AzWorkItem>;
  createWorkItem(project: string, type: string, ops: JsonPatchOp[]): Promise<AzWorkItem>;
  updateWorkItem(project: string, id: number, ops: JsonPatchOp[]): Promise<AzWorkItem>;
  queryWorkItems(project: string, wiql: string, top?: number): Promise<AzWorkItemQueryResult>;
  getWorkItemsBatch(project: string, ids: number[], fields?: string[]): Promise<AzWorkItem[]>;
}

export interface JsonPatchOp {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value?: unknown;
}

function handleAxiosError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<{ message?: string; typeKey?: string; value?: { Message?: string } }>;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    const message =
      data?.message ?? data?.value?.Message ?? data?.typeKey ?? axiosErr.message;
    throw new Error(`Azure DevOps API error ${status ?? 'unknown'}: ${message}`);
  }
  throw err;
}

export function createClient(config: Config): AzDevOpsClient {
  const http: AxiosInstance = axios.create({
    baseURL: `https://dev.azure.com/${config.organization}/`,
    headers: {
      Authorization: `Basic ${Buffer.from(':' + config.token).toString('base64')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    params: {
      'api-version': '7.1',
    },
  });

  return {
    async listProjects(top?, skip?) {
      try {
        const { data } = await http.get<AzListResponse<AzProject>>('_apis/projects', {
          params: { $top: top, $skip: skip },
        });
        return data.value;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async listRepositories(project) {
      try {
        const { data } = await http.get<AzListResponse<AzRepository>>(
          `${encodeURIComponent(project)}/_apis/git/repositories`
        );
        return data.value;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async listBranches(project, repo, filter?) {
      try {
        const { data } = await http.get<AzListResponse<AzRef>>(
          `${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/refs`,
          { params: { filter: filter ?? 'heads/' } }
        );
        return data.value;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async listPullRequests(project, repo, opts = {}) {
      try {
        const params: Record<string, unknown> = {};
        if (opts.status) params['searchCriteria.status'] = opts.status;
        if (opts.top) params.$top = opts.top;
        const { data } = await http.get<AzListResponse<AzPullRequest>>(
          `${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/pullrequests`,
          { params }
        );
        return data.value;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async getPullRequest(project, repo, id) {
      try {
        const { data } = await http.get<AzPullRequest>(
          `${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/pullrequests/${id}`
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async createPullRequest(project, repo, body) {
      try {
        const { data } = await http.post<AzPullRequest>(
          `${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/pullrequests`,
          body
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async updatePullRequest(project, repo, id, body) {
      try {
        const { data } = await http.patch<AzPullRequest>(
          `${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/pullrequests/${id}`,
          body
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async listPullRequestReviewers(project, repo, id) {
      try {
        const { data } = await http.get<AzListResponse<AzReviewer>>(
          `${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/pullrequests/${id}/reviewers`
        );
        return data.value;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async listPullRequestCommentThreads(project, repo, id) {
      try {
        const { data } = await http.get<AzListResponse<AzPullRequestCommentThread>>(
          `${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/pullrequests/${id}/threads`
        );
        return data.value;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async createPullRequestCommentThread(project, repo, id, content) {
      try {
        const { data } = await http.post<AzPullRequestCommentThread>(
          `${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/pullrequests/${id}/threads`,
          {
            comments: [
              {
                parentCommentId: 0,
                content,
                commentType: 1,
              },
            ],
            status: 1,
          }
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async replyToPullRequestComment(
      project,
      repo,
      id,
      threadId,
      parentCommentId,
      content
    ) {
      try {
        const { data } = await http.post<AzPullRequestComment>(
          `${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/pullrequests/${id}/threads/${threadId}/comments`,
          {
            content,
            parentCommentId,
            commentType: 1,
          }
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async listPipelines(project, top?) {
      try {
        const { data } = await http.get<AzListResponse<AzPipeline>>(
          `${encodeURIComponent(project)}/_apis/pipelines`,
          { params: { $top: top } }
        );
        return data.value;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async runPipeline(project, pipelineId, branch?) {
      try {
        const body: Record<string, unknown> = {};
        if (branch) {
          body.resources = { repositories: { self: { refName: `refs/heads/${branch}` } } };
        }
        const { data } = await http.post<AzPipelineRun>(
          `${encodeURIComponent(project)}/_apis/pipelines/${pipelineId}/runs`,
          body
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async listPipelineRuns(project, pipelineId, top?) {
      try {
        const { data } = await http.get<AzListResponse<AzPipelineRun>>(
          `${encodeURIComponent(project)}/_apis/pipelines/${pipelineId}/runs`,
          { params: { $top: top } }
        );
        return data.value;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async getPipelineRun(project, pipelineId, runId) {
      try {
        const { data } = await http.get<AzPipelineRun>(
          `${encodeURIComponent(project)}/_apis/pipelines/${pipelineId}/runs/${runId}`
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async getWorkItem(project, id, expand?) {
      try {
        const params: Record<string, unknown> = {};
        if (expand) params.$expand = expand;
        const { data } = await http.get<AzWorkItem>(
          `${encodeURIComponent(project)}/_apis/wit/workitems/${id}`,
          { params }
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async createWorkItem(project, type, ops) {
      try {
        const { data } = await http.post<AzWorkItem>(
          `${encodeURIComponent(project)}/_apis/wit/workitems/$${encodeURIComponent(type)}`,
          ops,
          { headers: { 'Content-Type': 'application/json-patch+json' } }
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async updateWorkItem(project, id, ops) {
      try {
        const { data } = await http.patch<AzWorkItem>(
          `${encodeURIComponent(project)}/_apis/wit/workitems/${id}`,
          ops,
          { headers: { 'Content-Type': 'application/json-patch+json' } }
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async queryWorkItems(project, wiql, top?) {
      try {
        const body: Record<string, unknown> = { query: wiql };
        const params: Record<string, unknown> = {};
        if (top) params.$top = top;
        const { data } = await http.post<AzWorkItemQueryResult>(
          `${encodeURIComponent(project)}/_apis/wit/wiql`,
          body,
          { params }
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async getWorkItemsBatch(project, ids, fields?) {
      try {
        const body: Record<string, unknown> = { ids };
        if (fields) body.fields = fields;
        const { data } = await http.post<AzListResponse<AzWorkItem>>(
          `${encodeURIComponent(project)}/_apis/wit/workitemsbatch`,
          body
        );
        return data.value;
      } catch (err) {
        handleAxiosError(err);
      }
    },
  };
}
