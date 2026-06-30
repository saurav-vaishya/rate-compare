import { useState } from 'react';

interface TreeProps {
  data: unknown;
  /** Nodes with depth less than this start expanded. */
  initialExpandDepth?: number;
}

interface NodeProps {
  name?: string;
  value: unknown;
  depth: number;
  initialExpandDepth: number;
  isLast?: boolean;
}

function typeLabel(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function primitivePreview(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    const s = value.length > 80 ? `${value.slice(0, 80)}…` : value;
    return JSON.stringify(s);
  }
  return String(value);
}

function collectionPreview(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.length}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as object).length}}`;
  }
  return '';
}

function JsonTreeNode({
  name,
  value,
  depth,
  initialExpandDepth,
}: NodeProps) {
  const isBranch = value !== null && typeof value === 'object';
  const [expanded, setExpanded] = useState(depth < initialExpandDepth);

  if (!isBranch) {
    return (
      <div className="json-tree-line" style={{ paddingLeft: depth * 16 }}>
        {name !== undefined && (
          <>
            <span className="json-tree-key">{JSON.stringify(name)}</span>
            <span className="json-tree-colon">: </span>
          </>
        )}
        <span className={`json-tree-primitive json-type-${typeLabel(value)}`}>
          {primitivePreview(value)}
        </span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);
  const open = isArray ? '[' : '{';
  const close = isArray ? ']' : '}';

  return (
    <div className="json-tree-node">
      <div
        className="json-tree-line json-tree-branch-head"
        style={{ paddingLeft: depth * 16 }}
      >
        <button
          type="button"
          className="json-tree-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? '▼' : '▶'}
        </button>
        {name !== undefined && (
          <>
            <span className="json-tree-key">{JSON.stringify(name)}</span>
            <span className="json-tree-colon">: </span>
          </>
        )}
        <span className="json-tree-bracket">{open}</span>
        {!expanded && (
          <>
            <span className="json-tree-ellipsis"> {collectionPreview(value)} </span>
            <span className="json-tree-bracket">{close}</span>
          </>
        )}
      </div>
      {expanded && (
        <>
          {entries.length === 0 ? (
            <div
              className="json-tree-line json-tree-empty"
              style={{ paddingLeft: (depth + 1) * 16 }}
            >
              <span className="json-tree-ellipsis">empty</span>
            </div>
          ) : (
            entries.map(([k, v]) => (
              <JsonTreeNode
                key={`${depth}-${k}`}
                name={k}
                value={v}
                depth={depth + 1}
                initialExpandDepth={initialExpandDepth}
              />
            ))
          )}
          <div
            className="json-tree-line"
            style={{ paddingLeft: depth * 16 }}
          >
            <span className="json-tree-bracket">{close}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function JsonTreeView({
  data,
  initialExpandDepth = 2,
}: TreeProps) {
  return (
    <div className="json-tree-root">
      <JsonTreeNode
        value={data}
        depth={0}
        initialExpandDepth={initialExpandDepth}
      />
    </div>
  );
}
