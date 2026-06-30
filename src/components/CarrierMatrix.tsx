import { Fragment, useState } from 'react';
import type { CarrierMatrixRow, NormalizedOffer, ScheduleEntry } from '../lib/types';
import CarrierLogo from './CarrierLogo';
import OfferSubsection from './OfferSubsection';
import type { JsonViewerState } from './JsonViewerModal';

interface Props {
  rows: CarrierMatrixRow[];
  hasV3: boolean;
  hasV4: boolean;
  v3Schedules: Record<string, ScheduleEntry>;
  v4Schedules: Record<string, ScheduleEntry>;
  onViewJson: (state: JsonViewerState) => void;
}

function StatCell({ value, empty }: { value: number; empty?: boolean }) {
  if (empty) return <td className="num muted-stat">—</td>;
  return <td className="num">{value}</td>;
}

function formatPerOfferList(values: number[]): string {
  if (values.length === 0) return '—';
  return values.join(', ');
}

function PerOfferStatCell({
  offers,
  pick,
  highlightNonZero,
  empty,
}: {
  offers: NormalizedOffer[];
  pick: (o: NormalizedOffer) => number;
  highlightNonZero?: boolean;
  empty?: boolean;
}) {
  if (empty) {
    return <td className="num list-stat muted-stat">—</td>;
  }
  const values = offers.map(pick);
  const highlight = highlightNonZero && values.some((v) => v > 0);
  return (
    <td className={`num list-stat ${highlight ? 'highlight' : ''}`}>
      {formatPerOfferList(values)}
    </td>
  );
}

function CarrierLabelRow({
  version,
  label,
  logo,
  fallbackLogo,
}: {
  version: 'v3' | 'v4';
  label: string;
  logo: string | null;
  fallbackLogo?: string | null;
}) {
  return (
    <div className="carrier-label-row">
      <span className="label-tag">{version}</span>
      <span className="carrier-label-text">{label}</span>
      <CarrierLogo url={logo ?? fallbackLogo} name={label} size="sm" />
    </div>
  );
}

export default function CarrierMatrix({
  rows,
  hasV3,
  hasV4,
  v3Schedules,
  v4Schedules,
  onViewJson,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (rows.length === 0) {
    return <p className="empty">No carrier rows to display.</p>;
  }

  return (
    <div className="matrix-wrap">
      <table className="matrix-table">
        <thead>
          <tr>
            <th aria-label="Expand" />
            <th>Liner / Carrier (grouped by ID)</th>
            <th colSpan={3} className={`group-head group-v3${hasV3 ? '' : ' group-empty'}`}>
              v3{!hasV3 && <span className="group-empty-label"> (not loaded)</span>}
            </th>
            <th colSpan={3} className={`group-head group-v4${hasV4 ? '' : ' group-empty'}`}>
              v4{!hasV4 && <span className="group-empty-label"> (not loaded)</span>}
            </th>
          </tr>
          <tr className="subhead">
            <th />
            <th />
            <th>Offers</th>
            <th>Schedule Refs</th>
            <th>Duplicate Sailings</th>
            <th>Offers</th>
            <th>Schedule Refs</th>
            <th>Duplicate Sailings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = expanded.has(row.carrierKey);
            return (
              <Fragment key={row.carrierKey}>
                <tr
                  className={`matrix-row ${isOpen ? 'expanded' : ''}`}
                  onClick={() => toggle(row.carrierKey)}
                >
                  <td className="expand-cell">
                    <button
                      type="button"
                      className="expand-btn"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Collapse' : 'Expand'}
                    >
                      {isOpen ? '▼' : '▶'}
                    </button>
                  </td>
                  <td className="carrier-cell">
                    <div className="carrier-id-row">
                      <div className="carrier-id-badge">ID: {row.carrierId}</div>
                      <CarrierLogo
                        url={row.v4Logo ?? row.v3Logo}
                        name={row.v4Label ?? row.v3Label ?? row.carrierId}
                        size="md"
                      />
                    </div>
                    {row.v3Label && (
                      <CarrierLabelRow
                        version="v3"
                        label={row.v3Label}
                        logo={row.v3Logo}
                        fallbackLogo={row.v4Logo}
                      />
                    )}
                    {row.v4Label && (
                      <CarrierLabelRow
                        version="v4"
                        label={row.v4Label}
                        logo={row.v4Logo}
                      />
                    )}
                    {!row.v3Label && !row.v4Label && (
                      <div className="carrier-label muted">No offers</div>
                    )}
                  </td>
                  <StatCell value={row.v3.offerCount} empty={!hasV3} />
                  <PerOfferStatCell
                    offers={row.v3.offers}
                    pick={(o) => o.scheduleCount}
                    empty={!hasV3}
                  />
                  <PerOfferStatCell
                    offers={row.v3.offers}
                    pick={(o) => o.duplicateScheduleCount}
                    highlightNonZero
                    empty={!hasV3}
                  />
                  <StatCell value={row.v4.offerCount} empty={!hasV4} />
                  <PerOfferStatCell
                    offers={row.v4.offers}
                    pick={(o) => o.scheduleCount}
                    empty={!hasV4}
                  />
                  <PerOfferStatCell
                    offers={row.v4.offers}
                    pick={(o) => o.duplicateScheduleCount}
                    highlightNonZero
                    empty={!hasV4}
                  />
                </tr>
                {isOpen && (
                  <tr className="expand-content">
                    <td colSpan={8}>
                      <div
                        className="expand-panel"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {hasV3 && row.v3.excludedCount > 0 && (
                          <p className="excluded-note">
                            Excluded v3 offers (missing ocean/FREIGHT leg):{' '}
                            {row.v3.excludedCount}
                          </p>
                        )}
                        {hasV4 && row.v4.excludedCount > 0 && (
                          <p className="excluded-note">
                            Excluded v4 offers (missing L3 leg):{' '}
                            {row.v4.excludedCount}
                          </p>
                        )}
                        {hasV3 ? (
                          <OfferSubsection
                            offers={row.v3.offers}
                            version="v3"
                            carrierId={row.carrierId}
                            schedules={v3Schedules}
                            fallbackLogo={row.v4Logo}
                            onViewJson={onViewJson}
                          />
                        ) : (
                          <OfferSubsection
                            offers={[]}
                            version="v3"
                            carrierId={row.carrierId}
                            schedules={v3Schedules}
                            versionProvided={false}
                            onViewJson={onViewJson}
                          />
                        )}
                        {hasV4 ? (
                          <OfferSubsection
                            offers={row.v4.offers}
                            version="v4"
                            carrierId={row.carrierId}
                            schedules={v4Schedules}
                            onViewJson={onViewJson}
                          />
                        ) : (
                          <OfferSubsection
                            offers={[]}
                            version="v4"
                            carrierId={row.carrierId}
                            schedules={v4Schedules}
                            versionProvided={false}
                            onViewJson={onViewJson}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
