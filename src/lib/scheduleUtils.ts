import type { ScheduleEntry } from './types';

/** Strip IMO suffixes and normalize for comparison, e.g. "GERD MAERSK (9320245" → "GERD MAERSK" */
function normalizeVesselName(name: string): string {
  return name
    .replace(/\s*\([^)]*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizeVoyage(voyage: string): string {
  return voyage.trim().toUpperCase();
}

/**
 * Identity of a single sailing: vessel + voyage + POL departure + POD arrival.
 * Uses the first ocean leg (skips transship placeholder legs with vessel "N/A").
 */
function pickMainScheduleLeg(schedule: ScheduleEntry) {
  const details = schedule.scheduleDetails ?? [];
  return (
    details.find((d) => {
      const vessel = d.transport?.vessel?.name ?? '';
      const mode = d.transport?.transportMode ?? '';
      return vessel && vessel !== 'N/A' && mode !== 'RAIL';
    }) ?? details[0]
  );
}

/**
 * Departure date for a schedule (YYYY-MM-DD), aligned with sailing fingerprint logic.
 */
export function scheduleSailingDate(
  _scheduleId: string,
  schedule: ScheduleEntry | undefined,
): string | null {
  if (!schedule) return null;

  const mainLeg = pickMainScheduleLeg(schedule);
  const raw =
    mainLeg?.fromLocation?.departure ??
    schedule.fromLocation?.departure ??
    schedule.sailingDate;

  if (!raw) return null;
  return raw.slice(0, 10);
}

export function sailingFingerprint(
  scheduleId: string,
  schedule: ScheduleEntry | undefined,
): string {
  if (!schedule) return `missing:${scheduleId}`;

  const mainLeg = pickMainScheduleLeg(schedule);

  if (mainLeg) {
    const fl = mainLeg.fromLocation ?? {};
    const tl = mainLeg.toLocation ?? {};
    const tr = mainLeg.transport ?? {};
    return [
      normalizeVesselName(tr.vessel?.name ?? ''),
      normalizeVoyage(tr.voyageNumber ?? ''),
      (fl.departure ?? '').slice(0, 10),
      fl.unLocCode ?? '',
      (tl.arrival ?? '').slice(0, 10),
      tl.unLocCode ?? '',
    ].join('|');
  }

  const fl = schedule.fromLocation ?? {};
  const tl = schedule.toLocation ?? {};
  return [
    (fl.departure ?? schedule.sailingDate ?? '').slice(0, 10),
    fl.unLocCode ?? '',
    (tl.arrival ?? '').slice(0, 10),
    tl.unLocCode ?? '',
  ].join('|');
}

/** @deprecated Use sailingFingerprint — kept for any external reference */
export const scheduleFingerprint = sailingFingerprint;

export function scheduleSailingDays(
  _scheduleId: string,
  schedule: ScheduleEntry | undefined,
): string | null {
  if (!schedule) return null;

  const raw = schedule.transitTime ?? '';
  const match = raw.match(/(\d+)/);
  if (match) return match[1];

  const det = schedule.scheduleDetails?.[0];
  const dep = det?.fromLocation?.departure ?? schedule.sailingDate;
  const arr = det?.toLocation?.arrival;
  if (dep && arr) {
    const depMs = Date.parse(dep);
    const arrMs = Date.parse(arr);
    if (!Number.isNaN(depMs) && !Number.isNaN(arrMs) && arrMs >= depMs) {
      return String(Math.round((arrMs - depMs) / 86_400_000));
    }
  }

  return null;
}

/**
 * Within a single offer, count how many attached schedules repeat the same sailing.
 * A duplicate = 2nd+ occurrence of the same vessel/voyage/departure/arrival.
 * Does not compare across offers.
 */
export function countDuplicateSailingsWithinOffer(
  scheduleIds: string[],
  schedules: Record<string, ScheduleEntry>,
): number {
  const seen = new Set<string>();
  let duplicates = 0;

  for (const id of scheduleIds) {
    const fp = sailingFingerprint(id, schedules[id]);
    if (seen.has(fp)) duplicates += 1;
    else seen.add(fp);
  }

  return duplicates;
}

/** @deprecated Use countDuplicateSailingsWithinOffer */
export const countDuplicateScheduleRefs = countDuplicateSailingsWithinOffer;
