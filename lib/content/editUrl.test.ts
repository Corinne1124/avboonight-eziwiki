import { describe, it, expect } from 'vitest';
import { buildEditUrl } from './editUrl';

describe('buildEditUrl', () => {
  it('derives a GitHub link from the repository alone', () => {
    const url = buildEditUrl({ repoUrl: 'https://github.com/you/wiki' }, 'guides/setup');

    expect(url).toBe('https://github.com/you/wiki/edit/main/content/guides/setup.md');
  });

  it('uses GitLab’s own editor path', () => {
    const url = buildEditUrl({ repoUrl: 'https://gitlab.com/you/wiki' }, 'guides/setup');

    expect(url).toBe('https://gitlab.com/you/wiki/-/edit/main/content/guides/setup.md');
  });

  it('points at the configured branch', () => {
    const url = buildEditUrl(
      { repoUrl: 'https://github.com/you/wiki', editBranch: 'master' },
      'intro',
    );

    expect(url).toBe('https://github.com/you/wiki/edit/master/content/intro.md');
  });

  it('drops the parts of a clone URL a browser cannot use', () => {
    const url = buildEditUrl({ repoUrl: 'https://github.com/you/wiki.git/' }, 'intro');

    expect(url).toBe('https://github.com/you/wiki/edit/main/content/intro.md');
  });

  it('fills a template for a forge it cannot recognise', () => {
    const url = buildEditUrl(
      { editUrl: 'https://git.example.com/wiki/-/edit/trunk/docs/{path}' },
      'guides/setup',
    );

    expect(url).toBe('https://git.example.com/wiki/-/edit/trunk/docs/guides/setup.md');
  });

  it('prefers an explicit template over the derived one', () => {
    const url = buildEditUrl(
      { repoUrl: 'https://github.com/you/wiki', editUrl: 'https://elsewhere.test/{path}' },
      'intro',
    );

    expect(url).toBe('https://elsewhere.test/intro.md');
  });

  it('offers nothing when no repository is configured', () => {
    expect(buildEditUrl({}, 'intro')).toBeNull();
  });

  it('offers nothing for a host whose editor path is unknown', () => {
    // Better than guessing: a link built on a wrong assumption sends the one
    // reader willing to fix the page to a 404.
    expect(buildEditUrl({ repoUrl: 'https://bitbucket.org/you/wiki' }, 'intro')).toBeNull();
  });

  it('survives a repository URL that is not a URL', () => {
    expect(buildEditUrl({ repoUrl: 'git@github.com:you/wiki.git' }, 'intro')).toBeNull();
  });
});
