'use client';

import React from 'react';
import { FilePlus2 } from 'lucide-react';
import { useStrings } from '@/components/providers/StringsProvider';
import { useEditorConfig } from '@/components/providers/EditorConfigProvider';
import { useEditorStore } from '@/lib/store/editorStore';

/**
 * Opens the in-browser editor with a blank page.
 *
 * The entry point for a wiki's other direction: not fixing what is written but
 * writing what is missing. It sits in the sidebar header, where it is reachable
 * from every page including the empty home route, which has no article to put
 * an edit control beside.
 *
 * @param props - Component props
 * @param props.collapsed - Whether the sidebar is showing its rail only
 */
export function NewPageButton({ collapsed = false }: { collapsed?: boolean }) {
  const t = useStrings();
  const { enabled } = useEditorConfig();
  const openNew = useEditorStore((state) => state.openNew);

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={openNew}
      aria-label={t.editorNewPage}
      title={t.editorNewPage}
      className={`rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 ${
        collapsed ? '' : 'flex-shrink-0'
      }`}
    >
      <FilePlus2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
