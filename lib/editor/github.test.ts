import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  GitHubError,
  deleteFile,
  encodeRepoPath,
  fromBase64,
  parseRepo,
  readFile,
  toBase64,
  verifyToken,
  writeFile,
  type RepoRef,
} from './github';

/** The repository the tests commit to. */
const REF: RepoRef = { owner: 'you', repo: 'wiki', branch: 'main' };

/**
 * Stubs `fetch` with a queue of answers.
 *
 * @param answers - Responses, in the order they are expected
 * @returns The stub, for assertions about URLs, headers and bodies
 */
function stubFetch(answers: Array<{ status?: number; body?: unknown; throws?: boolean }>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];

  const stub = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const answer = answers.shift();
    if (!answer || answer.throws) throw new TypeError('fetch failed');

    return new Response(answer.body === undefined ? '' : JSON.stringify(answer.body), {
      status: answer.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  vi.stubGlobal('fetch', stub);
  return { stub, calls };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('base64', () => {
  it('round-trips text that is not ASCII', () => {
    const text = '---\ntitle: 艾兰\n---\n\n骞婚〉涔﹀悘 😀\n';

    expect(fromBase64(toBase64(text))).toBe(text);
  });

  it('ignores the line breaks the API wraps long content with', () => {
    const encoded = toBase64('hello');

    expect(fromBase64(`${encoded.slice(0, 4)}\n${encoded.slice(4)}\n`)).toBe('hello');
  });
});

describe('parseRepo', () => {
  it('reads a GitHub https URL', () => {
    expect(parseRepo('https://github.com/Corinne1124/avboonight-eziwiki')).toEqual({
      owner: 'Corinne1124',
      repo: 'avboonight-eziwiki',
      branch: 'main',
    });
  });

  it('tolerates the shapes a clone URL is copied in', () => {
    expect(parseRepo('https://github.com/you/wiki.git')?.repo).toBe('wiki');
    expect(parseRepo('https://github.com/you/wiki/')?.repo).toBe('wiki');
    expect(parseRepo('git@github.com:you/wiki.git')?.owner).toBe('you');
    expect(parseRepo('github.com:you/wiki')?.repo).toBe('wiki');
  });

  it('takes the branch it is given', () => {
    expect(parseRepo('https://github.com/you/wiki', 'trunk')?.branch).toBe('trunk');
    expect(parseRepo('https://github.com/you/wiki')?.branch).toBe('main');
  });

  it('refuses a host it could not commit to', () => {
    expect(parseRepo('https://gitlab.com/you/wiki')).toBeNull();
    expect(parseRepo('https://example.com/you/wiki')).toBeNull();
    expect(parseRepo(undefined)).toBeNull();
    expect(parseRepo('')).toBeNull();
  });
});

describe('encodeRepoPath', () => {
  it('encodes per segment, keeping the slashes that mean structure', () => {
    expect(encodeRepoPath('content/AE - ASKARSE.md')).toBe('content/AE%20-%20ASKARSE.md');
  });
});

describe('verifyToken', () => {
  it('reports the account and whether it may push', async () => {
    const { calls } = stubFetch([
      { body: { login: 'you' } },
      { body: { permissions: { push: true } } },
    ]);

    expect(await verifyToken('token', REF)).toEqual({ login: 'you', canPush: true });
    expect(calls[0].url).toBe('https://api.github.com/user');
    expect(calls[0].init.headers).toMatchObject({ Authorization: 'Bearer token' });
    expect(calls[1].url).toBe('https://api.github.com/repos/you/wiki');
  });

  it('reports an account that can only read', async () => {
    stubFetch([{ body: { login: 'you' } }, { body: { permissions: { pull: true } } }]);

    expect((await verifyToken('token', REF)).canPush).toBe(false);
  });

  it('turns a refused token into an error carrying its status', async () => {
    stubFetch([{ status: 401, body: { message: 'Bad credentials' } }]);

    await expect(verifyToken('wrong', REF)).rejects.toMatchObject({
      message: 'Bad credentials',
      status: 401,
    });
  });

  it('reports a network that never answered', async () => {
    stubFetch([{ throws: true }]);

    await expect(verifyToken('token', REF)).rejects.toBeInstanceOf(GitHubError);
  });
});

describe('readFile', () => {
  it('decodes the file it asked for', async () => {
    const content = toBase64('---\ntitle: 艾兰\n---\n');
    const { calls } = stubFetch([{ body: { content, sha: 'abc123' } }]);

    expect(await readFile('token', REF, 'content/ailan.md')).toEqual({
      file: 'content/ailan.md',
      sha: 'abc123',
      content: '---\ntitle: 艾兰\n---\n',
    });
    expect(calls[0].url).toBe(
      'https://api.github.com/repos/you/wiki/contents/content/ailan.md?ref=main',
    );
  });

  it('reports a missing file as absent rather than as a failure', async () => {
    stubFetch([{ status: 404, body: { message: 'Not Found' } }]);

    expect(await readFile('token', REF, 'content/nope.md')).toBeNull();
  });

  it('passes any other failure on', async () => {
    stubFetch([{ status: 500, body: { message: 'Server Error' } }]);

    await expect(readFile('token', REF, 'content/ailan.md')).rejects.toMatchObject({ status: 500 });
  });
});

describe('writeFile', () => {
  it('creates a file without a sha, and reports the commit', async () => {
    const { calls } = stubFetch([{ body: { commit: { html_url: 'https://github.com/c/1' } } }]);

    const result = await writeFile('token', REF, 'content/new.md', 'Body\n', 'docs: add new');

    expect(result).toEqual({ commitUrl: 'https://github.com/c/1', file: 'content/new.md' });
    expect(calls[0].init.method).toBe('PUT');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      message: 'docs: add new',
      content: toBase64('Body\n'),
      branch: 'main',
    });
  });

  it('sends the sha it is replacing', async () => {
    const { calls } = stubFetch([{ body: {} }]);

    await writeFile('token', REF, 'content/ailan.md', 'Body\n', 'docs: edit', 'abc123');

    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({ sha: 'abc123' });
  });
});

describe('deleteFile', () => {
  it('removes a file by sha', async () => {
    const { calls } = stubFetch([{ body: { commit: { html_url: 'https://github.com/c/2' } } }]);

    const result = await deleteFile('token', REF, 'content/gone.md', 'docs: remove gone', 'sha1');

    expect(result.commitUrl).toBe('https://github.com/c/2');
    expect(calls[0].init.method).toBe('DELETE');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      message: 'docs: remove gone',
      sha: 'sha1',
      branch: 'main',
    });
  });
});
