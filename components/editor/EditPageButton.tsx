'use client';

import React from 'react';
import { Pencil } from 'lucide-react';
import { useStrings } from '@/components/providers/StringsProvider';
import { useEditorConfig } from '@/components/providers/EditorConfigProvider';
import { useEditorStore } from '@/lib/store/editorStore';

/**
 * Opens the in-browser editor on the page being read.
 *
 * Rendered beside the link out to the repository rather than instead of it:
 * the two answer different situations. Editing in place is for a reader with a
 * token who spotted a mistake; the repository link is for everyone else, and
 * for changes too large to make in a textarea.
 *
 * @param props - Component props
 * @param props.path - Canonical path of the page being read
 */
export function EditPageButton({ path }: { path: string }) {
  const t = useStrings();
  const { enabled } = useEditorConfig();
  const openFor = useEditorStore((state) => state.openFor);

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={() => openFor(path)}
      className="inline-flex items-center gap-1.5 py-0.5 text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
    >
      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
      {t.editorOpenHere}
    </button>
  );
}
