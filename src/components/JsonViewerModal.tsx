import { useEffect, useState } from 'react';
import JsonTreeView from './JsonTreeView';

export interface JsonViewerState {
  title: string;
  data: unknown;
}

interface Props {
  state: JsonViewerState | null;
  onClose: () => void;
}

const DEFAULT_EXPAND_DEPTH = 2;

export default function JsonViewerModal({ state, onClose }: Props) {
  const [expandDepth, setExpandDepth] = useState(DEFAULT_EXPAND_DEPTH);
  const [treeKey, setTreeKey] = useState(0);

  useEffect(() => {
    if (!state) return;
    setExpandDepth(DEFAULT_EXPAND_DEPTH);
    setTreeKey((k) => k + 1);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [state, onClose]);

  if (!state) return null;

  const text = JSON.stringify(state.data, null, 2);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard may be unavailable
    }
  }

  function expandAll() {
    setExpandDepth(99);
    setTreeKey((k) => k + 1);
  }

  function collapseAll() {
    setExpandDepth(0);
    setTreeKey((k) => k + 1);
  }

  function resetExpand() {
    setExpandDepth(DEFAULT_EXPAND_DEPTH);
    setTreeKey((k) => k + 1);
  }

  return (
    <div
      className="json-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="json-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="json-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="json-modal-header">
          <h3 id="json-modal-title">{state.title}</h3>
          <div className="json-modal-actions">
            <button type="button" className="btn-secondary btn-sm" onClick={expandAll}>
              Expand all
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={collapseAll}>
              Collapse all
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={resetExpand}>
              Reset
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={copyJson}>
              Copy raw
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
        <div className="json-modal-body">
          <JsonTreeView
            key={treeKey}
            data={state.data}
            initialExpandDepth={expandDepth}
          />
        </div>
      </div>
    </div>
  );
}
