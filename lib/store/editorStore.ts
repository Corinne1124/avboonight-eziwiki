import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Whether the in-browser editor is open, and what it was opened on.
 *
 * The editor is one overlay for the whole site rather than a control on each
 * page, so what it is editing has to live outside any page: a button anywhere
 * opens it, and the overlay reads the target from here.
 *
 * The credential lives here too, and is written to storage only while its
 * owner asks for it to be remembered. A token kept in `localStorage` is
 * readable by anything running on the site, so forgetting it has to be one
 * click away rather than a browser setting to find.
 */
export type EditorMode = 'edit' | 'new';

interface EditorStore {
  /** Whether the overlay is open */
  open: boolean;
  /** Editing a page, or writing a new one */
  mode: EditorMode;
  /** Canonical path being edited; null when writing a new page */
  targetPath: string | null;
  /** GitHub token, empty when the reader has not signed in */
  token: string;
  /** Whether {@link token} is written to storage */
  remember: boolean;
  /** Opens the editor on a page */
  openFor: (path: string) => void;
  /** Opens the editor with a blank page */
  openNew: () => void;
  /** Closes the overlay, keeping the session */
  close: () => void;
  /** Records a verified token */
  signIn: (token: string, remember: boolean) => void;
  /** Forgets the token */
  signOut: () => void;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      open: false,
      mode: 'edit',
      targetPath: null,
      token: '',
      remember: false,

      openFor: (path) => set({ open: true, mode: 'edit', targetPath: path }),
      openNew: () => set({ open: true, mode: 'new', targetPath: null }),
      close: () => set({ open: false }),

      signIn: (token, remember) => set({ token, remember }),
      signOut: () => set({ token: '', remember: false, open: false }),
    }),
    {
      name: 'editor-storage',
      // `remember` decides whether the token is written at all: storing it and
      // merely choosing not to read it would leave it in the browser anyway.
      partialize: (state) => ({
        token: state.remember ? state.token : '',
        remember: state.remember,
      }),
    },
  ),
);
