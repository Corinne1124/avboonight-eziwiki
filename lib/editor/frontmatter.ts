/**
 * Editing a page's frontmatter without losing what is already in it.
 *
 * The field editor has to change one value in a block it did not write. A
 * round-trip through a YAML library would reformat the whole block — reordering
 * keys, reflowing lists, dropping comments — so instead the block is kept as
 * the lines it is made of, and only the lines belonging to fields the editor
 * understands are rewritten. Anything it does not understand (comments, keys it
 * has never heard of, anything nested) is kept verbatim, and a block whose
 * shape it cannot follow at all is reported as not simple, which sends the
 * reader to the source editor rather than to a corrupted page.
 *
 * Pure and client-safe: no filesystem, no YAML dependency.
 */

import { yamlScalar } from '../content/frontmatter';

/** Frontmatter keys the field editor offers, in the order it writes them. */
export const EDITABLE_FIELDS = [
  'title',
  'description',
  'order',
  'tags',
  'hidden',
  'aliases',
  'updated',
] as const;

/** One of {@link EDITABLE_FIELDS}. */
export type EditableField = (typeof EDITABLE_FIELDS)[number];

/** A value the field editor can hold. */
export type FieldValue = string | number | boolean | string[];

/**
 * One line of the frontmatter block.
 *
 * Comments and blank lines are entries too, with a null key, which is what
 * keeps them where the author put them.
 */
export interface FrontmatterEntry {
  /** Key of this entry, or null for a comment or blank line */
  key: string | null;
  /** The line(s) as they are written, used whenever the entry is left alone */
  raw: string;
  /** Parsed value, for a single-line entry */
  value?: FieldValue;
  /** Whether the key is one the field editor can offer */
  editable: boolean;
}

/** A page, split into its frontmatter lines and its body. */
export interface ParsedDocument {
  /** Frontmatter entries, in file order */
  entries: FrontmatterEntry[];
  /** Everything after the frontmatter block */
  body: string;
  /** Whether the file had a `---` block at all */
  hasFrontmatter: boolean;
  /**
   * Whether every line of the block was understood.
   *
   * False means the field editor must not be used: writing the block back from
   * parsed values would drop whatever was not parsed.
   */
  simple: boolean;
}

/** The opening and closing fence of a frontmatter block. */
const FENCE = /^(---|\.\.\.)\s*$/;

/** A `key: value` line. */
const KEY_LINE = /^([A-Za-z0-9_.-]+):(.*)$/;

/** A list item inside a block-form array. */
const LIST_ITEM = /^\s*-\s*(.*)$/;

/**
 * Reads a scalar the way YAML would for the values a wiki actually writes.
 *
 * @param raw - Text after the colon, already trimmed
 * @returns The value, or null when the text is not a scalar this understands
 */
function readScalar(raw: string): FieldValue | null {
  const text = raw.trim();
  if (!text) return '';

  // A quoted value is unambiguous, so it is read before anything else looks at
  // its contents: `"Setup: The Basics"` is a title, not structure.
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'");
  }

  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim();
    if (!inner) return [];
    return splitInlineArray(inner).map((item) => unquote(item.trim()));
  }

  // Shapes a single-line reader cannot follow: nested maps, block scalars,
  // anchors, and a plain scalar carrying `: ` — which YAML itself refuses, so
  // the file is better shown as source than rewritten from a guess.
  if (/^[{&*!|>]/.test(text) || /:\s/.test(text)) return null;

  if (text === 'true') return true;
  if (text === 'false') return false;

  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);

  // A trailing comment is only a comment when a space precedes it; `a#b` is a
  // value with a hash in it.
  return text.replace(/\s+#.*$/, '').trim();
}

/**
 * Splits an inline array on the commas that separate its items.
 *
 * A comma inside quotes belongs to the item, not to the array.
 *
 * @param inner - Text between the brackets
 * @returns The raw items, not yet unquoted
 */
function splitInlineArray(inner: string): string[] {
  const items: string[] = [];
  let current = '';
  let quote: string | null = null;

  for (let index = 0; index < inner.length; index += 1) {
    const character = inner[index];

    if (quote) {
      current += character;
      if (character === quote && inner[index - 1] !== '\\') quote = null;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }

    if (character === ',') {
      items.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  items.push(current);
  return items;
}

/**
 * Removes the quotes around a scalar.
 *
 * @param text - Raw scalar text
 * @returns The unquoted value
 */
function unquote(text: string): string {
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
  return text;
}

/**
 * Splits a file into its frontmatter entries and its body.
 *
 * @param source - The whole file, as it is written
 * @returns Entries, body, and whether the block was fully understood
 *
 * @example
 * ```typescript
 * const doc = parseDocument('---\ntitle: Quick Start\n---\n\n# Hello\n');
 * doc.entries[0].value; // 'Quick Start'
 * doc.body; // '\n# Hello\n'
 * ```
 */
export function parseDocument(source: string): ParsedDocument {
  const text = source.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);

  if (!FENCE.test(lines[0] ?? '')) {
    return { entries: [], body: text, hasFrontmatter: false, simple: true };
  }

  let end = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (FENCE.test(lines[index])) {
      end = index;
      break;
    }
  }

  if (end === -1) return { entries: [], body: text, hasFrontmatter: false, simple: true };

  const entries: FrontmatterEntry[] = [];
  let simple = true;

  for (let index = 1; index < end; index += 1) {
    const line = lines[index];

    if (!line.trim() || line.trimStart().startsWith('#')) {
      entries.push({ key: null, raw: line, editable: false });
      continue;
    }

    const match = KEY_LINE.exec(line);

    // Any other shape — an indented continuation, a nested map, a multi-line
    // scalar — is kept as it stands and marks the block as one the field
    // editor must leave alone.
    if (!match || /^\s/.test(line)) {
      entries.push({ key: null, raw: line, editable: false });
      simple = false;
      continue;
    }

    const key = match[1];
    const rest = match[2];
    const editable = (EDITABLE_FIELDS as readonly string[]).includes(key);

    // Block-form array: `key:` followed by `- item` lines.
    if (!rest.trim()) {
      const items: string[] = [];
      const rawLines = [line];
      let cursor = index + 1;

      while (cursor < end && LIST_ITEM.test(lines[cursor])) {
        const item = LIST_ITEM.exec(lines[cursor])![1];
        items.push(unquote(item.trim().replace(/\s+#.*$/, '')));
        rawLines.push(lines[cursor]);
        cursor += 1;
      }

      if (items.length > 0) {
        entries.push({ key, raw: rawLines.join('\n'), value: items, editable });
        index = cursor - 1;
        continue;
      }

      // A key with nothing after it and no list under it is an empty value.
      entries.push({ key, raw: line, value: '', editable });
      continue;
    }

    const value = readScalar(rest);
    if (value === null) {
      entries.push({ key: null, raw: line, editable: false });
      simple = false;
      continue;
    }

    entries.push({ key, raw: line, value, editable });
  }

  const body = lines.slice(end + 1).join('\n');
  return { entries, body, hasFrontmatter: true, simple };
}

/**
 * Renders a value the way the field editor writes it.
 *
 * @param value - The value to write
 * @returns The text that follows the colon
 */
function writeScalar(value: FieldValue): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => yamlScalar(String(item))).join(', ')}]`;
  }
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return yamlScalar(value);
}

/**
 * Reads one field out of a parsed document.
 *
 * @param doc - Parsed document
 * @param key - Field to read
 * @returns The value, or undefined when the block does not carry it
 */
export function getField(doc: ParsedDocument, key: EditableField): FieldValue | undefined {
  return doc.entries.find((entry) => entry.key === key)?.value;
}

/**
 * Replaces one field, or removes it, keeping every other line as it was.
 *
 * An existing key is rewritten where it stands. A new key is placed among the
 * other editable fields in the order they are written to a new file — after the
 * editable fields that precede it and before those that follow — so a block
 * gains `tags:` next to the other fields rather than after the author's notes.
 *
 * @param doc - Parsed document
 * @param key - Field to write
 * @param value - Value to write, or undefined to remove the field
 * @returns A new parsed document
 */
export function setField(
  doc: ParsedDocument,
  key: EditableField,
  value: FieldValue | undefined,
): ParsedDocument {
  const entries = [...doc.entries];
  const existing = entries.findIndex((entry) => entry.key === key);

  if (value === undefined) {
    if (existing !== -1) entries.splice(existing, 1);
    return { ...doc, entries };
  }

  const entry: FrontmatterEntry = {
    key,
    raw: `${key}: ${writeScalar(value)}`,
    value,
    editable: true,
  };

  if (existing !== -1) {
    entries[existing] = entry;
    return { ...doc, entries };
  }

  // A new key goes where it would have been written by hand: after the editable
  // fields it follows, and before the first one it precedes — which keeps the
  // block in the canonical order even when the fields are added one at a time,
  // and leaves an author's trailing notes at the bottom.
  const rankOf = (candidate: FrontmatterEntry) =>
    candidate.key ? (EDITABLE_FIELDS as readonly string[]).indexOf(candidate.key) : -1;

  const rank = EDITABLE_FIELDS.indexOf(key);
  const before = entries.findIndex((candidate) => rankOf(candidate) > rank);
  const after = entries.reduce(
    (found, candidate, index) =>
      rankOf(candidate) !== -1 && rankOf(candidate) < rank ? index : found,
    -1,
  );

  const insertAt = before !== -1 ? before : after !== -1 ? after + 1 : entries.length;
  entries.splice(insertAt, 0, entry);
  return { ...doc, entries };
}

/**
 * Writes a parsed document back out.
 *
 * @param doc - Entries and body to write
 * @returns The file's text, with a trailing newline
 */
export function renderDocument(doc: Pick<ParsedDocument, 'entries' | 'body'>): string {
  const body = doc.body.replace(/^\n+/, '').replace(/\s*$/, '');
  const bodyText = body ? `${body}\n` : '';

  if (doc.entries.length === 0) return bodyText;

  const block = doc.entries.map((entry) => entry.raw).join('\n');

  // A blank line between the block and the body only when there is a body: a
  // block followed by nothing ends at its own closing fence.
  return bodyText ? `---\n${block}\n---\n\n${bodyText}` : `---\n${block}\n---\n`;
}

/**
 * Builds a page from fields and a body, for a file that does not exist yet.
 *
 * @param fields - Values to write, in any order
 * @param body - Markdown body
 * @returns The file's text
 */
export function composeDocument(
  fields: Partial<Record<EditableField, FieldValue | undefined>>,
  body: string,
): string {
  let doc: ParsedDocument = { entries: [], body, hasFrontmatter: false, simple: true };

  for (const key of EDITABLE_FIELDS) {
    const value = fields[key];
    if (value === undefined || value === '') continue;
    doc = setField(doc, key, value);
  }

  return renderDocument(doc);
}

/**
 * Reads a comma-separated list into values, the way the tags field is typed.
 *
 * @param text - Text from a list field
 * @returns The items, trimmed and without empties
 */
export function parseListField(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
