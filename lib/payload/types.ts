import type { UrlStrategy } from '../navigation/url';
import type { Strings } from '../i18n/strings';

/**
 * Navigation item in the sidebar hierarchy
 */
export interface NavigationItem {
  /** Display name of the navigation item */
  name: string;
  /** Optional path to content file (without .md extension) */
  path?: string;
  /** Optional nested navigation items */
  children?: NavigationItem[];
  /** Optional icon identifier */
  icon?: string;
  /** Optional background color for the navigation item */
  color?: string;
  /** Hide this item from navigation (accessible only via direct URL) */
  hidden?: boolean;
}

/**
 * Global site configuration
 */
export interface GlobalConfig {
  /** Site title displayed in browser tab */
  title: string;
  /** Site description for SEO */
  description: string;
  /** Path to favicon */
  favicon?: string;
  /**
   * BCP 47 language tag for the content, e.g. `ko`, `ja`, `en-GB`.
   *
   * Announced on the root element. Screen readers pick pronunciation from it
   * and translation tools decide what to offer, so a Korean wiki left at the
   * `en` default is read aloud as English. Defaults to `en`.
   */
  lang?: string;
  /**
   * Replacements for individual interface strings.
   *
   * The interface follows {@link lang} where a translation exists, and falls
   * back to English where one does not. This is how a wiki in any other
   * language says its own words without waiting for a translation to be
   * contributed — and how one in a translated language overrules a wording it
   * disagrees with.
   *
   * ```typescript
   * strings: { search: 'Suchen…', onThisPage: 'Auf dieser Seite' }
   * ```
   *
   * Keys are those of `Strings` in `lib/i18n/strings.ts`; anything left out
   * keeps its translated value.
   */
  strings?: Partial<Strings>;
  /** Base URL for the site */
  baseUrl?: string;
  /**
   * Source repository for this site.
   *
   * Shown as a link in the sidebar when set, and omitted entirely when not, so
   * a private or unpublished wiki does not advertise one.
   */
  repoUrl?: string;
  /**
   * Branch that {@link repoUrl}'s derived edit links point at. Defaults to
   * `main`; set it when the repository's default branch is called something
   * else, or edit links will lead to a branch that does not exist.
   */
  editBranch?: string;
  /**
   * Template for the "edit this page" link, containing `{path}` where the
   * content-relative file path belongs, e.g.
   * `https://git.example.com/wiki/-/edit/main/content/{path}`.
   *
   * Needed only for a forge that cannot be recognised from {@link repoUrl}
   * alone; github.com and gitlab.com repositories get a link without it. Set it
   * to nothing at all and no page offers one.
   */
  editUrl?: string;
  /**
   * How content paths are expressed in URLs.
   *
   * `path` produces readable, indexable URLs mirroring the content tree.
   * `hash` produces opaque hashes that conceal the structure at the cost of
   * SEO and shareability. Defaults to `path`.
   */
  urlStrategy?: UrlStrategy;
  /**
   * Discover documents under `content/` and add any that navigation does not
   * already reference. Enabled by default, so a new Markdown file appears in
   * the sidebar without touching this config.
   */
  autoNavigation?: boolean;
  /** SEO metadata */
  seo?: {
    openGraph?: {
      title?: string;
      description?: string;
      images?: Array<{
        url: string;
        width?: number;
        height?: number;
        alt?: string;
      }>;
    };
    twitter?: {
      card?: 'summary' | 'summary_large_image' | 'app' | 'player';
      site?: string;
      creator?: string;
      title?: string;
      description?: string;
      images?: string[];
    };
  };
}

/**
 * Theme color configuration
 */
export interface ThemeConfig {
  /** Primary brand color */
  primary: string;
  /** Secondary accent color */
  secondary: string;
  /** Background color */
  background: string;
  /** Text color */
  text: string;
  /** Sidebar background color */
  sidebarBg: string;
  /** Code block background */
  codeBg: string;
}

/**
 * Complete payload structure
 */
export interface Payload {
  /** Global site configuration */
  global: GlobalConfig;
  /**
   * Curated navigation structure.
   *
   * Optional: when omitted, navigation is derived entirely from the content
   * directory. When present, these entries control naming and ordering, and
   * undeclared documents are appended automatically unless
   * {@link GlobalConfig.autoNavigation} is disabled.
   */
  navigation?: NavigationItem[];
  /** Theme customization */
  theme?: Partial<ThemeConfig>;
}
