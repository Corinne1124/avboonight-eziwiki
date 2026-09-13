'use client';

import React, { createContext, useContext } from 'react';
import type { RepoRef } from '@/lib/editor/github';

/**
 * The editor's part of the site configuration.
 *
 * Resolved on the server — whether the site offers an editor at all, and which
 * repository and branch commits go to — and handed to the client tree as plain
 * data, so the browser never has to parse the payload or guess at a repository.
 */
export interface EditorSettings {
  /** Whether the site offers the in-browser editor */
  enabled: boolean;
  /** Where commits go, or null when the repository is not a GitHub one */
  repo: RepoRef | null;
}

/** What the editor is offered when the site says nothing. */
const DISABLED: EditorSettings = { enabled: false, repo: null };

const EditorContext = createContext<EditorSettings>(DISABLED);

/**
 * Provides the editor settings to the client tree.
 *
 * @param props - Component props
 * @param props.value - Settings resolved on the server
 * @param props.children - The tree that may use them
 */
export function EditorConfigProvider({
  value,
  children,
}: {
  value: EditorSettings;
  children: React.ReactNode;
}) {
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

/**
 * Reads the editor settings.
 *
 * @returns Whether the editor is offered, and where it commits
 */
export function useEditorConfig(): EditorSettings {
  return useContext(EditorContext);
}
