import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { runAnalysis, hasProvidedVersion } from '../lib/analysis';
import type { AnalysisResult, ParsedInputs } from '../lib/types';
import { loadInputs } from '../lib/inputStorage';
import CarrierMatrix from '../components/CarrierMatrix';
import JsonViewerModal, {
  type JsonViewerState,
} from '../components/JsonViewerModal';

export default function AnalysisPage() {
  const [inputs, setInputs] = useState<ParsedInputs | null>(null);
  const [loading, setLoading] = useState(true);
  const [jsonView, setJsonView] = useState<JsonViewerState | null>(null);

  useEffect(() => {
    setInputs(loadInputs());
    setLoading(false);
  }, []);

  const result: AnalysisResult | null = useMemo(() => {
    if (!inputs) return null;
    return runAnalysis(inputs);
  }, [inputs]);

  if (loading) {
    return (
      <div className="page">
        <p className="loading-msg">Loading comparison data…</p>
      </div>
    );
  }

  if (!inputs || (!inputs.v3 && !inputs.v4) || !result) {
    return <Navigate to="/" replace />;
  }

  const hasV3 = hasProvidedVersion(inputs, 'v3');
  const hasV4 = hasProvidedVersion(inputs, 'v4');

  return (
    <div className="page">
      <header className="page-header">
        <div className="header-row">
          <div>
            <h1>Carrier Analysis</h1>
            <p className="subtitle">
              Matrix 1 — liner/carrier offer &amp; schedule counts with duplicate
              sailing detection. Expand a row to see per-offer details.
            </p>
            {hasV3 !== hasV4 && (
              <p className="version-note">
                {hasV3 ? 'v3' : 'v4'} only —{' '}
                {hasV3 ? 'v4' : 'v3'} columns and subsections are empty.
              </p>
            )}
          </div>
          <Link to="/" className="btn-secondary">
            ← New comparison
          </Link>
        </div>
      </header>

      <section className="summary-cards">
        <div className="card">
          <span className="card-label">v3 offers (raw)</span>
          <span className="card-value">{result.meta.v3OfferCount}</span>
        </div>
        <div className="card">
          <span className="card-label">v3 valid (FREIGHT leg)</span>
          <span className="card-value">{result.meta.v3ValidCount}</span>
        </div>
        <div className="card">
          <span className="card-label">v4 offers (raw)</span>
          <span className="card-value">{result.meta.v4OfferCount}</span>
        </div>
        <div className="card">
          <span className="card-label">v4 valid (L3 leg)</span>
          <span className="card-value">{result.meta.v4ValidCount}</span>
        </div>
        <div className="card">
          <span className="card-label">Carriers</span>
          <span className="card-value">{result.rows.length}</span>
        </div>
      </section>

      {result.warnings.length > 0 && (
        <details className="warnings-panel">
          <summary>
            {result.warnings.length} validation warning
            {result.warnings.length !== 1 ? 's' : ''} (excluded offers)
          </summary>
          <ul>
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      <section className="matrix-section">
        <h2 className="section-title">Carrier Matrix</h2>
        <p className="section-desc">
          Rows are grouped by <strong>carrier ID</strong> — v3 uses{' '}
          <code>productPrice.ratesBy[].carrierId</code>, v4 uses{' '}
          <code>meta.serviceProvider.id</code>. Logos from v4{' '}
          <code>meta.serviceProvider.logo</code> appear in a box after each
          carrier name (v3 rows use the v4 logo when the same ID has one). Schedule Refs and
          Duplicate Sailings are comma-separated per offer. A duplicate sailing
          is counted only within an offer when two or more attached schedules
          share the same vessel, voyage, departure date, and arrival date.
        </p>
        <CarrierMatrix
          rows={result.rows}
          hasV3={hasV3}
          hasV4={hasV4}
          v3Schedules={inputs.v3?.schedules ?? {}}
          v4Schedules={inputs.v4?.data?.schedules ?? {}}
          onViewJson={setJsonView}
        />
      </section>

      <JsonViewerModal state={jsonView} onClose={() => setJsonView(null)} />
    </div>
  );
}
