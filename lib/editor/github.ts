/**
 * Committing to a wiki from the browser.
 *
 * The site is a static export: there is no server to write to, and a secret
 * shipped in the bundle would not be one. So the only place an edit can land is
 * where the wiki already lives — the repository — and the only credential that
 * can put it there is one the reader supplies: a GitHub token with write access
 * to the repository. It is sent to `api.github.com` and to nowhere else, and it
 * is the reader's to keep or to forget.
 *
 * Everything here runs in the browser; no part of it is imported by the build.
 */

/** Where commits go. */
export interface RepoRef {
  /** Repository owner, e.g. 'Corinne1124' */
  owner: string;
  /** Repository name, e.g. 'avboonight-eziwiki' */
  repo: string;
  /** Branch commits are made on */
  branch: string;
}

/** A file read back from the repository. */
export interface RemoteFile {
  /** Path from the repository root */
  file: string;
  /** Blob sha, required to replace or remove the file */
  sha: string;
  /** Decoded text */
  content: string;
}

/** What a commit produced. */
export interface CommitResult {
  /** Web address of the commit, when the API returned one */
  commitUrl: string | null;
  /** Path that was written or removed */
  file: string;
  /**
   * Revision the file now has.
   *
   * A save replaces the blob, so the sha the editor was holding is stale the
   * moment it succeeds; without this the next save in the same session would be
   * refused as a conflict.
   */
  sha?: string;
}

/** Branch assumed when neither the payload nor the caller names one. */
const DEFAULT_BRANCH = 'main';

/** GitHub's REST root. */
const API = 'https://api.github.com';

/**
 * A failure reported by the GitHub API, or by the network underneath it.
 *
 * The status is kept so callers can tell "the token is wrong" from "the
 * repository moved" without matching on wording.
 */
export class GitHubError extends Error {
  /** HTTP status, or 0 when the request never completed */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
  }
}

/**
 * Reads owner, repository and branch out of a repository URL.
 *
 * Only GitHub can be committed to this way, so a URL that is not GitHub's
 * returns null rather than producing requests that would 404.
 *
 * @param repoUrl - `global.repoUrl` from the payload
 * @param branch - Branch to commit on; defaults to `main`
 * @returns The reference, or null when the URL is not a GitHub repository
 *
 * @example
 * ```typescript
 * parseRepo('https://github.com/you/wiki.git');
 * // { owner: 'you', repo: 'wiki', branch: 'main' }
 * ```
 */
export function parseRepo(repoUrl: string | undefined, branch?: string): RepoRef | null {
  if (!repoUrl) return null;

  const trimmed = repoUrl
    .trim()
    .replace(/\.git$/, '')
    .replace(/\/+$/, '');

  const https = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)$/i.exec(trimmed);
  const ssh = /^(?:git@)?github\.com:([^/]+)\/([^/]+)$/i.exec(trimmed);
  const match = https ?? ssh;

  if (!match) return null;
  if (match[1] === '' || match[2] === '') return null;

  return { owner: match[1], repo: match[2], branch: branch || DEFAULT_BRANCH };
}

/**
 * Encodes text as base64, which is the only way the contents API accepts it.
 *
 * `btoa` takes one character per byte, so the string goes through UTF-8 first;
 * without that a page written in Chinese or Korean arrives mangled.
 *
 * @param text - Text to encode
 * @returns Base64 of its UTF-8 bytes
 */
export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';

  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary);
}

/**
 * Decodes the base64 a file's contents come back in.
 *
 * @param encoded - Base64, possibly wrapped across lines
 * @returns The decoded text
 */
export function fromBase64(encoded: string): string {
  const binary = atob(encoded.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

/**
 * Percent-encodes each segment of a repository path.
 *
 * Encoded per segment rather than whole, because a slash in the path is
 * structure and an encoded one is not: a file called `a/b.md` cannot exist, but
 * `ae - askarse.md` can, and its spaces have to survive the URL.
 *
 * @param path - Repository path, e.g. 'content/guides/setup.md'
 * @returns The path, ready to append to an API URL
 */
export function encodeRepoPath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * Sends one request to the API and turns a failure into a GitHubError.
 *
 * @param token - GitHub token
 * @param path - API path, e.g. `/user`
 * @param init - Request options
 * @returns The parsed response body, or null for 204
 * @throws GitHubError when the API answers with a failure status
 */
async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    // A blocked request, an offline browser, or a proxy refusing the origin.
    throw new GitHubError('The GitHub API could not be reached.', 0);
  }

  if (response.status === 204) return null as T;

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body &&
      typeof body === 'object' &&
      typeof (body as { message?: unknown }).message === 'string'
        ? (body as { message: string }).message
        : `GitHub answered ${response.status}.`;

    throw new GitHubError(message, response.status);
  }

  return body as T;
}

/**
 * Checks a token, and whether it may write to the repository.
 *
 * Both halves matter: a valid token without push access would let the editor
 * open, be typed into, and fail only at the commit — which is the worst moment
 * to learn it.
 *
 * @param token - GitHub token
 * @param ref - Repository and branch
 * @returns The account the token belongs to, and whether it can push
 * @throws GitHubError when the token is refused
 */
export async function verifyToken(
  token: string,
  ref: RepoRef,
): Promise<{ login: string; canPush: boolean }> {
  const user = await request<{ login?: string }>(token, '/user');
  const repo = await request<{ permissions?: Record<string, boolean> }>(
    token,
    `/repos/${ref.owner}/${ref.repo}`,
  );

  const permissions = repo.permissions ?? {};

  return {
    login: user.login ?? '',
    canPush: Boolean(permissions.push || permissions.admin || permissions.maintain),
  };
}

/**
 * Reads a file, or reports that it is not there.
 *
 * A missing file is an ordinary answer rather than a failure: it is how the
 * editor discovers which of the two conventions a page's file follows.
 *
 * @param token - GitHub token
 * @param ref - Repository and branch
 * @param file - Path from the repository root
 * @returns The file, or null when the repository has no such path
 * @throws GitHubError when the request fails for another reason
 */
export async function readFile(
  token: string,
  ref: RepoRef,
  file: string,
): Promise<RemoteFile | null> {
  try {
    const data = await request<{ content?: string; sha?: string; encoding?: string }>(
      token,
      `/repos/${ref.owner}/${ref.repo}/contents/${encodeRepoPath(file)}?ref=${encodeURIComponent(ref.branch)}`,
    );

    if (typeof data.content !== 'string' || data.encoding === 'none') {
      throw new GitHubError('This file is too large for the contents API.', 0);
    }

    return { file, sha: data.sha ?? '', content: fromBase64(data.content) };
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }
}

/**
 * Writes a file, creating it or replacing the revision named by `sha`.
 *
 * @param token - GitHub token
 * @param ref - Repository and branch
 * @param file - Path from the repository root
 * @param content - New text
 * @param message - Commit message
 * @param sha - Blob being replaced; omit when creating a new file
 * @returns What the commit produced
 * @throws GitHubError when the commit is refused — a stale `sha` reports 409
 */
export async function writeFile(
  token: string,
  ref: RepoRef,
  file: string,
  content: string,
  message: string,
  sha?: string,
): Promise<CommitResult> {
  const data = await request<{ content?: { sha?: string }; commit?: { html_url?: string } }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/contents/${encodeRepoPath(file)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: toBase64(content),
        branch: ref.branch,
        ...(sha ? { sha } : {}),
      }),
    },
  );

  return { commitUrl: data.commit?.html_url ?? null, file, sha: data.content?.sha };
}

/**
 * Removes a file.
 *
 * @param token - GitHub token
 * @param ref - Repository and branch
 * @param file - Path from the repository root
 * @param message - Commit message
 * @param sha - Blob being removed
 * @returns What the commit produced
 * @throws GitHubError when the commit is refused
 */
export async function deleteFile(
  token: string,
  ref: RepoRef,
  file: string,
  message: string,
  sha: string,
): Promise<CommitResult> {
  const data = await request<{ commit?: { html_url?: string } }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/contents/${encodeRepoPath(file)}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ message, sha, branch: ref.branch }),
    },
  );

  return { commitUrl: data.commit?.html_url ?? null, file };
}
