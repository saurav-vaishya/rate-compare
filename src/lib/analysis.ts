import type {
  AnalysisResult,
  CarrierMatrixRow,
  CarrierVersionStats,
  ParsedInputs,
  V3Offer,
  V3Response,
  V4Offer,
  V4Response,
} from './types';
import {
  buildVendorNameLookup,
  getCarrierIdFromOffer,
  getCarrierLabelFromOffer,
  getCarrierLogoFromOffer,
  mergeCarrierLabels,
  mergeCarrierLogo,
  normalizeV3Offer,
  normalizeV4Offer,
} from './offerExtractors';

function emptyStats(): CarrierVersionStats {
  return {
    offerCount: 0,
    offers: [],
    excludedCount: 0,
  };
}

function buildVersionStats(
  normalizedOffers: ReturnType<typeof normalizeV3Offer>[],
  excludedCount: number,
): CarrierVersionStats {
  const valid = normalizedOffers.filter(
    (o): o is NonNullable<typeof o> => o !== null,
  );

  return {
    offerCount: valid.length,
    offers: valid,
    excludedCount,
  };
}

function sortCarrierRows(rows: CarrierMatrixRow[]): CarrierMatrixRow[] {
  return rows.sort((a, b) => {
    const na = Number(a.carrierId);
    const nb = Number(b.carrierId);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
    return a.carrierId.localeCompare(b.carrierId);
  });
}

export function parseJsonInput(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON for ${label}. Please paste valid JSON.`);
  }
}

export function validateInputs(
  v3Raw: unknown | null,
  v4Raw: unknown | null,
): ParsedInputs {
  const hasV3 = v3Raw !== null;
  const hasV4 = v4Raw !== null;

  if (!hasV3 && !hasV4) {
    throw new Error('Provide at least one API response (v3 or v4).');
  }

  let v3: ParsedInputs['v3'] = null;
  let v4: ParsedInputs['v4'] = null;

  if (hasV3) {
    const parsed = v3Raw as V3Response;
    if (!parsed?.offers || !Array.isArray(parsed.offers)) {
      throw new Error('v3 response must have an "offers" array at the root.');
    }
    v3 = parsed;
  }

  if (hasV4) {
    const parsed = v4Raw as V4Response;
    if (!parsed?.data?.offers || !Array.isArray(parsed.data.offers)) {
      throw new Error('v4 response must have "data.offers" array.');
    }
    v4 = parsed;
  }

  return { v3, v4 };
}

export function hasProvidedVersion(
  inputs: ParsedInputs,
  version: 'v3' | 'v4',
): boolean {
  return version === 'v3' ? inputs.v3 !== null : inputs.v4 !== null;
}

export function runAnalysis(inputs: ParsedInputs): AnalysisResult {
  const { v3, v4 } = inputs;
  const v3Schedules = v3?.schedules ?? {};
  const v4Schedules = v4?.data?.schedules ?? {};
  const warnings: string[] = [];

  const rowMap = new Map<string, CarrierMatrixRow>();

  function ensureRow(carrierId: string): CarrierMatrixRow {
    let row = rowMap.get(carrierId);
    if (!row) {
      row = {
        carrierKey: carrierId,
        carrierId,
        v3Label: null,
        v4Label: null,
        v3Logo: null,
        v4Logo: null,
        v3: emptyStats(),
        v4: emptyStats(),
      };
      rowMap.set(carrierId, row);
    }
    return row;
  }

  const v3Buckets = new Map<
    string,
    {
      offers: V3Offer[];
      normalized: ReturnType<typeof normalizeV3Offer>[];
      excluded: number;
    }
  >();
  const v4Buckets = new Map<
    string,
    {
      offers: V4Offer[];
      normalized: ReturnType<typeof normalizeV4Offer>[];
      excluded: number;
    }
  >();

  const vendorNames = buildVendorNameLookup(v4?.data?.offers ?? []);

  for (const offer of v3?.offers ?? []) {
    const carrierId = getCarrierIdFromOffer('v3', offer);
    const label = getCarrierLabelFromOffer('v3', offer);
    const logo = getCarrierLogoFromOffer('v3', offer);
    const row = ensureRow(carrierId);
    row.v3Label = mergeCarrierLabels(row.v3Label, label);
    row.v3Logo = mergeCarrierLogo(row.v3Logo, logo);

    if (!v3Buckets.has(carrierId)) {
      v3Buckets.set(carrierId, { offers: [], normalized: [], excluded: 0 });
    }
    const bucket = v3Buckets.get(carrierId)!;
    bucket.offers.push(offer);
    const norm = normalizeV3Offer(offer, v3Schedules, vendorNames);
    if (!norm) {
      bucket.excluded += 1;
      warnings.push(
        `v3 offer ${offer.freightifyId ?? '?'} (ID ${carrierId}, ${label}) excluded: missing ocean freight (FREIGHT/BUY).`,
      );
    }
    bucket.normalized.push(norm);
  }

  for (const offer of v4?.data?.offers ?? []) {
    const carrierId = getCarrierIdFromOffer('v4', offer);
    const label = getCarrierLabelFromOffer('v4', offer);
    const logo = getCarrierLogoFromOffer('v4', offer);
    const row = ensureRow(carrierId);
    row.v4Label = mergeCarrierLabels(row.v4Label, label);
    row.v4Logo = mergeCarrierLogo(row.v4Logo, logo);

    if (!v4Buckets.has(carrierId)) {
      v4Buckets.set(carrierId, { offers: [], normalized: [], excluded: 0 });
    }
    const bucket = v4Buckets.get(carrierId)!;
    bucket.offers.push(offer);
    const norm = normalizeV4Offer(offer, v4Schedules);
    if (!norm) {
      bucket.excluded += 1;
      warnings.push(
        `v4 offer ${offer._id ?? '?'} (ID ${carrierId}, ${label}) excluded: missing mandatory L3 leg.`,
      );
    }
    bucket.normalized.push(norm);
  }

  for (const [carrierId, bucket] of v3Buckets) {
    const row = rowMap.get(carrierId)!;
    row.v3 = buildVersionStats(bucket.normalized, bucket.excluded);
  }

  for (const [carrierId, bucket] of v4Buckets) {
    const row = rowMap.get(carrierId)!;
    row.v4 = buildVersionStats(bucket.normalized, bucket.excluded);
  }

  const rows = sortCarrierRows([...rowMap.values()]);

  const v3OfferCount = v3?.offers?.length ?? 0;
  const v4OfferCount = v4?.data?.offers?.length ?? 0;
  const v3ValidCount = rows.reduce((s, r) => s + r.v3.offerCount, 0);
  const v4ValidCount = rows.reduce((s, r) => s + r.v4.offerCount, 0);

  return {
    rows,
    warnings,
    meta: { v3OfferCount, v4OfferCount, v3ValidCount, v4ValidCount },
  };
}
