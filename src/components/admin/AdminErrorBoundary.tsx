/**
 * AdminErrorBoundary — keeps one broken page from blanking the whole CMS.
 *
 * Wraps the page area inside AdminLayout, so the sidebar stays usable.
 * Distinguishes a failed code download (typical right after a new deploy,
 * when the browser still references old file names) from a runtime error.
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

function isChunkLoadError(e: Error) {
  return /dynamically imported module|Importing a module script failed|Failed to fetch|ChunkLoadError|Loading chunk/i.test(e.message);
}

export default class AdminErrorBoundary extends React.Component<Props, State> {
  // Declared for the type-checker (the project has no React type definitions).
  declare readonly props: Props;
  declare setState: (state: State) => void;
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[CMS] Page error:', error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const chunk = isChunkLoadError(error);
    return (
      <div className="max-w-xl bg-white border border-[#DDE3EA] rounded-xl p-6 space-y-3" role="alert">
        <div className="flex items-center gap-2 text-[#C0392B]">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="font-semibold">{chunk ? 'This page could not be loaded' : 'Something went wrong on this page'}</h2>
        </div>
        <p className="text-sm text-[#1A2B40]">
          {chunk
            ? 'The page’s code could not be downloaded. Check your connection. If the CMS was just updated, reloading fetches the new version.'
            : 'The rest of the CMS still works — use the menu, or try this page again.'}
        </p>
        <p className="text-xs text-[#6B7A8D] break-words">{error.message}</p>
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="text-sm font-medium text-[#1B365D] border border-[#DDE3EA] rounded-lg px-3 py-1.5 hover:bg-[#F4F6F8]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm font-medium text-white bg-[#1B365D] rounded-lg px-3 py-1.5 hover:opacity-90"
          >
            Reload CMS
          </button>
        </div>
      </div>
    );
  }
}
