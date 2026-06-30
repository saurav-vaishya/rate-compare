import type { ApiVersion, NormalizedOffer, ScheduleEntry } from '../lib/types';
import { formatVendorLabel } from '../lib/offerExtractors';
import CarrierLogo from './CarrierLogo';
import CopyButton from './CopyButton';
import ViewJsonLink from './ViewJsonLink';
import type { JsonViewerState } from './JsonViewerModal';

function formatCurrency(value: number | null): string {
  if (value === null) return '—';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SailingDatesList({ dates }: { dates: string[] }) {
  if (dates.length === 0) return <>—</>;

  const unique = [...new Set(dates)].sort();

  return (
    <span className="sailing-dates-list">
      {unique.map((date) => (
        <span key={date} className="sailing-date-item">
          {date}
        </span>
      ))}
    </span>
  );
}

function formatSailingDaysSummary(days: string[]): { display: string; title: string } {
  if (days.length === 0) return { display: '—', title: '' };

  const full = days.map((d) => `${d}d`).join(', ');
  const nums = days.map((d) => Number.parseInt(d, 10)).filter((n) => !Number.isNaN(n));

  if (nums.length === 0) return { display: full, title: full };
  if (days.length === 1) return { display: `${nums[0]}d`, title: full };

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = min === max ? `${min}d` : `${min}–${max}d`;

  return {
    display: `${days.length} sailings · ${range}`,
    title: full,
  };
}

function shortenOfferId(id: string): string {
  if (id.length <= 18) return id;
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

function RouteDisplay({ route }: { route: string }) {
  const parts = route.split(/\s*→\s*/);
  if (parts.length !== 2) return <span>{route}</span>;

  return (
    <span className="route-inline">
      <span className="port-code">{parts[0]}</span>
      <span className="route-arrow" aria-hidden="true">
        →
      </span>
      <span className="port-code">{parts[1]}</span>
    </span>
  );
}

function formatTransit(transit: string): string {
  if (!transit || transit === '—') return '—';
  return /^\d+$/.test(transit) ? `${transit} days` : transit;
}

interface Props {
  offers: NormalizedOffer[];
  version: ApiVersion;
  carrierId: string;
  schedules: Record<string, ScheduleEntry>;
  fallbackLogo?: string | null;
  versionProvided?: boolean;
  onViewJson: (state: JsonViewerState) => void;
}

function buildSchedulesPayload(
  offer: NormalizedOffer,
  schedules: Record<string, ScheduleEntry>,
) {
  const entries: Record<string, ScheduleEntry | null> = {};
  for (const id of offer.scheduleIds) {
    entries[id] = schedules[id] ?? null;
  }
  return {
    offerId: offer.offerId,
    apiVersion: offer.apiVersion,
    scheduleIds: offer.scheduleIds,
    schedules: entries,
  };
}

export default function OfferSubsection({
  offers,
  version,
  carrierId,
  schedules,
  fallbackLogo,
  versionProvided = true,
  onViewJson,
}: Props) {
  if (!versionProvided) {
    return (
      <div className="offer-subsection offer-subsection-empty">
        <p className="empty-subsection">
          No {version.toUpperCase()} data loaded.
        </p>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <p className="empty-subsection">
        No valid {version.toUpperCase()} offers for this carrier (check L3 / FREIGHT
        leg requirement).
      </p>
    );
  }

  const lead = offers[0];

  function viewSubsectionJson() {
    onViewJson({
      title: `${version.toUpperCase()} offers — carrier ID ${carrierId} (${offers.length})`,
      data: {
        apiVersion: version,
        carrierId,
        offerCount: offers.length,
        offers: offers.map((o) => o.rawOffer),
      },
    });
  }

  return (
    <div className="offer-subsection">
      <div className="subsection-head">
        <div className="subsection-head-main">
          <span className={`badge badge-${version}`}>{version}</span>
          <CarrierLogo
            url={lead.carrierLogo ?? fallbackLogo}
            name={lead.carrier}
            size="sm"
          />
          <div className="subsection-carrier-meta">
            <h4 className={`subsection-title tag-${version}`}>
              <span className="subsection-title-text">
                {lead.carrier}
                {lead.carrierCode && (
                  <span className="muted"> ({lead.carrierCode})</span>
                )}
              </span>
              <ViewJsonLink title="View subsection JSON" onClick={viewSubsectionJson} />
            </h4>
            <p className="subsection-subline">
              {offers.length} offer{offers.length === 1 ? '' : 's'} · Carrier ID{' '}
              <span className="mono">{carrierId}</span>
            </p>
          </div>
        </div>
      </div>
      <div className="offer-table-scroll">
        <table className="offer-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th className="col-money">Ocean freight</th>
              <th>Service</th>
              <th>Sailing days</th>
              <th>Sailing dates</th>
              <th>Tariff</th>
              <th>Route</th>
              <th className="col-num">Transit</th>
              <th className="col-num">Schedules</th>
              <th className="col-num">Dup. sailings</th>
              <th>Offer ID</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => {
              const sailing = formatSailingDaysSummary(o.attachedScheduleSailingDays);

              return (
                <tr key={`${version}-${o.offerId}`}>
                  <td className="vendor-cell">
                    {formatVendorLabel(o.vendorName, o.vendorId)}
                  </td>
                  <td className="num col-money">{formatCurrency(o.oceanFreightCost)}</td>
                  <td>{o.serviceType}</td>
                  <td className="sailing-days-cell" title={sailing.title || undefined}>
                    {sailing.display}
                  </td>
                  <td className="sailing-dates-cell">
                    <SailingDatesList dates={o.attachedScheduleSailingDates} />
                  </td>
                  <td className="mono">{o.tariff}</td>
                  <td className="route-cell">
                    <RouteDisplay route={o.route} />
                  </td>
                  <td className="num col-num">{formatTransit(o.transitTime)}</td>
                  <td className="schedules-cell col-num">
                    <span className="schedules-cell-inner">
                      <span className="num">{o.scheduleCount}</span>
                      {o.scheduleCount > 0 && (
                        <ViewJsonLink
                          title="View schedules JSON"
                          onClick={() =>
                            onViewJson({
                              title: `Schedules — ${version} offer ${o.offerId}`,
                              data: buildSchedulesPayload(o, schedules),
                            })
                          }
                        />
                      )}
                    </span>
                  </td>
                  <td
                    className={`num col-num ${o.duplicateScheduleCount > 0 ? 'highlight' : ''}`}
                  >
                    {o.duplicateScheduleCount}
                  </td>
                  <td className="offer-id-cell">
                    <span className="offer-id-cell-inner">
                      <span className="mono offer-id-text" title={o.offerId}>
                        {shortenOfferId(o.offerId)}
                      </span>
                      <ViewJsonLink
                        title="View offer JSON"
                        onClick={() =>
                          onViewJson({
                            title: `${version.toUpperCase()} offer — ${o.offerId}`,
                            data: o.rawOffer,
                          })
                        }
                      />
                      <CopyButton text={o.offerId} title="Copy offer ID" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
