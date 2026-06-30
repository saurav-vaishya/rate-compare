import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseJsonInput, validateInputs } from '../lib/analysis';
import { saveInputs } from '../lib/inputStorage';

export default function InputPage() {
  const navigate = useNavigate();
  const v3FileRef = useRef<HTMLInputElement>(null);
  const v4FileRef = useRef<HTMLInputElement>(null);
  const [v3Text, setV3Text] = useState('');
  const [v4Text, setV4Text] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function readFile(file: File): Promise<string> {
    return file.text();
  }

  async function handleFile(
    file: File | undefined,
    setter: (v: string) => void,
  ) {
    if (!file) return;
    setError(null);
    const text = await readFile(file);
    setter(text);
  }

  function handleAnalyze() {
    setError(null);
    setLoading(true);
    try {
      const hasV3 = v3Text.trim().length > 0;
      const hasV4 = v4Text.trim().length > 0;
      const v3Parsed = hasV3 ? parseJsonInput(v3Text, 'v3') : null;
      const v4Parsed = hasV4 ? parseJsonInput(v4Text, 'v4') : null;
      const inputs = validateInputs(v3Parsed, v4Parsed);
      saveInputs(inputs);
      navigate('/analysis');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse input.');
    } finally {
      setLoading(false);
    }
  }

  const canAnalyze = v3Text.trim().length > 0 || v4Text.trim().length > 0;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Rate Compare Utility</h1>
        <p className="subtitle">
          Paste or upload one or both v3 and v4 API JSON responses. All processing
          runs locally in your browser — nothing is sent to a server.
        </p>
      </header>

      <div className="input-grid">
        <section className="input-panel">
          <div className="panel-head">
            <h2>v3 Response</h2>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => v3FileRef.current?.click()}
            >
              Upload JSON
            </button>
            <input
              ref={v3FileRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0], setV3Text)}
            />
          </div>
          <textarea
            className="json-input"
            placeholder='{ "offers": [...], "schedules": {...} }'
            value={v3Text}
            onChange={(e) => setV3Text(e.target.value)}
            spellCheck={false}
          />
          <p className="hint">
            Optional. Root must include <code>offers</code> array. Ocean leg =
            FREIGHT/BUY charges.
          </p>
        </section>

        <section className="input-panel">
          <div className="panel-head">
            <h2>v4 Response</h2>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => v4FileRef.current?.click()}
            >
              Upload JSON
            </button>
            <input
              ref={v4FileRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0], setV4Text)}
            />
          </div>
          <textarea
            className="json-input"
            placeholder='{ "data": { "offers": [...], "schedules": {...} } }'
            value={v4Text}
            onChange={(e) => setV4Text(e.target.value)}
            spellCheck={false}
          />
          <p className="hint">
            Optional. Root must include <code>data.offers</code>. Each offer must
            have an L3 leg with charges.
          </p>
        </section>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="actions">
        <button
          type="button"
          className="btn-primary"
          disabled={!canAnalyze || loading}
          onClick={handleAnalyze}
        >
          {loading ? 'Validating…' : 'Run Analysis →'}
        </button>
      </div>
    </div>
  );
}
