import type {
  ApiVersion,
  NormalizedOffer,
  ScheduleEntry,
  V3Offer,
  V4Offer,
} from './types';
import {
  countDuplicateSailingsWithinOffer,
  scheduleSailingDays,
} from './scheduleUtils';

function parseAmount(value: number | string | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

/** v3: productPrice.ratesBy[].carrierId (FREIGHT row preferred) */
export function getV3CarrierId(offer: V3Offer): string {
  const ratesBy = offer.productPrice?.ratesBy ?? [];
  const freight = ratesBy.find((r) => r.rateTypeCode === 'FREIGHT');
  const id = freight?.carrierId ?? ratesBy[0]?.carrierId;
  if (id) return String(id);
  return `unknown-v3-${offer.freightifyId ?? 'no-id'}`;
}

/** v4: meta.serviceProvider.id */
export function getV4CarrierId(offer: V4Offer): string {
  const id = offer.meta?.serviceProvider?.id;
  if (id) return String(id);
  return `unknown-v4-${offer._id ?? 'no-id'}`;
}

export function getCarrierIdFromOffer(
  version: ApiVersion,
  offer: V3Offer | V4Offer,
): string {
  return version === 'v3'
    ? getV3CarrierId(offer as V3Offer)
    : getV4CarrierId(offer as V4Offer);
}

/** v4: meta.serviceProvider.logo */
export function getV4CarrierLogo(offer: V4Offer): string | null {
  const logo = offer.meta?.serviceProvider?.logo;
  return logo?.trim() ? logo.trim() : null;
}

/** v3 responses do not include a carrier logo field. */
export function getV3CarrierLogo(_offer: V3Offer): string | null {
  return null;
}

export function getCarrierLogoFromOffer(
  version: ApiVersion,
  offer: V3Offer | V4Offer,
): string | null {
  return version === 'v3'
    ? getV3CarrierLogo(offer as V3Offer)
    : getV4CarrierLogo(offer as V4Offer);
}

export function mergeCarrierLogo(
  existing: string | null,
  next: string | null,
): string | null {
  return existing ?? next ?? null;
}

/** Display label for a version — name + SCAC only (ID shown separately in matrix). */
export function getCarrierLabelFromOffer(
  version: ApiVersion,
  offer: V3Offer | V4Offer,
): string {
  if (version === 'v3') {
    const o = offer as V3Offer;
    const po = o.productOffer ?? {};
    const name = po.carrierName ?? 'Unknown';
    const code = po.carrierScac ?? '';
    return code ? `${name} (${code})` : name;
  }
  const o = offer as V4Offer;
  const sp = o.meta?.serviceProvider ?? {};
  const name = sp.name ?? 'Unknown';
  const code = sp.code ?? '';
  return code ? `${name} (${code})` : name;
}

export function v3HasOceanLeg(offer: V3Offer): boolean {
  const charges = offer.productPrice?.charges ?? [];
  return charges.some(
    (c) => c.rateType === 'BUY' && c.rateTypeCode === 'FREIGHT',
  );
}

export function v4HasL3Leg(offer: V4Offer): boolean {
  for (const pl of offer.pricingLevels ?? []) {
    for (const eq of pl.equipmentPrices ?? []) {
      for (const leg of eq.legs ?? []) {
        if (leg.legCode === 'L3') {
          const hasCharge = (leg.charges ?? []).length > 0;
          if (hasCharge) return true;
        }
      }
    }
  }
  return false;
}

function v3OceanFreight(offer: V3Offer): number | null {
  const charges = offer.productPrice?.charges ?? [];
  const freight = charges.filter(
    (c) => c.rateType === 'BUY' && c.rateTypeCode === 'FREIGHT',
  );
  if (freight.length === 0) return null;
  return freight.reduce(
    (sum, c) => sum + parseAmount(c.amountUsd ?? c.amount),
    0,
  );
}

function v4OceanFreight(offer: V4Offer): number | null {
  let total = 0;
  let found = false;

  for (const pl of offer.pricingLevels ?? []) {
    if (pl.pricingLevel !== 'BUY') continue;
    for (const eq of pl.equipmentPrices ?? []) {
      for (const leg of eq.legs ?? []) {
        if (leg.legCode !== 'L3') continue;
        for (const ch of leg.charges ?? []) {
          found = true;
          total += parseAmount(ch.amountUsd ?? ch.amount);
        }
      }
    }
  }

  return found ? total : null;
}

function v3ServiceType(offer: V3Offer): string {
  const pp = offer.productPrice ?? {};
  const po = offer.productOffer ?? {};
  const parts = [
    pp.serviceType,
    po.originFreightServiceType,
    po.destinationFreightServiceType,
  ].filter(Boolean);
  return parts.join(' / ') || '—';
}

function v4ServiceType(offer: V4Offer): string {
  const m = offer.meta ?? {};
  const parts = [
    m.serviceType,
    m.serviceModeOrigin ? `Origin: ${m.serviceModeOrigin}` : '',
    m.serviceModeDestination ? `Dest: ${m.serviceModeDestination}` : '',
  ].filter(Boolean);
  return parts.join(' / ') || '—';
}

function getV3Vendor(offer: V3Offer): { id: string; name: string } {
  const po = offer.productOffer ?? {};
  const ratesBy = offer.productPrice?.ratesBy ?? [];
  const freight = ratesBy.find((r) => r.rateTypeCode === 'FREIGHT');
  const id = po.vendorId ?? freight?.vendorId ?? ratesBy[0]?.vendorId;
  return { id: id ? String(id) : '', name: '' };
}

function getV4Vendor(offer: V4Offer): { id: string; name: string } {
  const metaVendor = offer.meta?.vendor;
  if (metaVendor?.id || metaVendor?.name) {
    return {
      id: metaVendor.id ? String(metaVendor.id) : '',
      name: metaVendor.name ?? '',
    };
  }

  for (const pl of offer.pricingLevels ?? []) {
    for (const eq of pl.equipmentPrices ?? []) {
      for (const leg of eq.legs ?? []) {
        if (leg.legCode !== 'L3') continue;
        const legVendor = leg.legMeta?.vendor;
        if (legVendor?.id || legVendor?.name) {
          return {
            id: legVendor.id ? String(legVendor.id) : '',
            name: legVendor.name ?? '',
          };
        }
      }
    }
  }

  return { id: '', name: '' };
}

export function formatVendorLabel(name: string, id: string): string {
  if (!id && !name) return '—';
  if (name && id) return `${name} (${id})`;
  if (id) return `(${id})`;
  return name;
}

export function buildVendorNameLookup(v4Offers: V4Offer[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const offer of v4Offers) {
    const vendor = getV4Vendor(offer);
    if (vendor.id && vendor.name && !map.has(vendor.id)) {
      map.set(vendor.id, vendor.name);
    }
  }
  return map;
}
export function normalizeV3Offer(
  offer: V3Offer,
  schedules: Record<string, ScheduleEntry>,
  vendorNames?: Map<string, string>,
): NormalizedOffer | null {
  const po = offer.productOffer ?? {};
  const pp = offer.productPrice ?? {};
  const name = po.carrierName ?? 'Unknown';
  const code = po.carrierScac ?? '';
  const carrierId = getV3CarrierId(offer);
  const vendor = getV3Vendor(offer);
  const scheduleIds = pp.routeScheduleIds ?? [];
  const warnings: string[] = [];

  if (!v3HasOceanLeg(offer)) {
    warnings.push('Missing ocean freight leg (v3 FREIGHT/BUY charges)');
    return null;
  }

  const sailingDays = scheduleIds
    .map((id) => scheduleSailingDays(id, schedules[id]))
    .filter((d): d is string => d !== null);

  return {
    apiVersion: 'v3',
    offerId: offer.freightifyId ?? '—',
    carrierId,
    carrier: name,
    carrierCode: code,
    carrierLogo: getV3CarrierLogo(offer),
    vendorId: vendor.id,
    vendorName: vendor.name || vendorNames?.get(vendor.id) || '',
    oceanFreightCost: v3OceanFreight(offer),
    serviceType: v3ServiceType(offer),
    attachedScheduleSailingDays: sailingDays,
    tariff: pp.linerReferenceId ?? '—',
    cargoType: pp.cargoType ?? '—',
    transitTime: String(pp.transitTimeInDays ?? '—'),
    route: `${po.originPort ?? '?'} → ${po.destinationPort ?? '?'}`,
    scheduleCount: scheduleIds.length,
    duplicateScheduleCount: countDuplicateSailingsWithinOffer(scheduleIds, schedules),
    hasL3: true,
    warnings,
    scheduleIds,
    rawOffer: offer,
  };
}

export function normalizeV4Offer(
  offer: V4Offer,
  schedules: Record<string, ScheduleEntry>,
): NormalizedOffer | null {
  const m = offer.meta ?? {};
  const sp = m.serviceProvider ?? {};
  const name = sp.name ?? 'Unknown';
  const code = sp.code ?? '';
  const carrierId = getV4CarrierId(offer);
  const vendor = getV4Vendor(offer);
  const scheduleIds = m.scheduleIds ?? [];
  const warnings: string[] = [];

  if (!v4HasL3Leg(offer)) {
    warnings.push('Missing mandatory L3 leg with charges');
    return null;
  }

  const sailingDays = scheduleIds
    .map((id) => scheduleSailingDays(id, schedules[id]))
    .filter((d): d is string => d !== null);

  const origin = m.origins?.[0]?.code ?? '?';
  const dest = m.destinations?.[0]?.code ?? '?';

  return {
    apiVersion: 'v4',
    offerId: offer._id ?? '—',
    carrierId,
    carrier: name,
    carrierCode: code,
    carrierLogo: getV4CarrierLogo(offer),
    vendorId: vendor.id,
    vendorName: vendor.name,
    oceanFreightCost: v4OceanFreight(offer),
    serviceType: v4ServiceType(offer),
    attachedScheduleSailingDays: sailingDays,
    tariff: m.tariffDetails?.tariffNumber ?? '—',
    cargoType: m.cargoType ?? '—',
    transitTime: String(m.transitTime ?? '—'),
    route: `${origin} → ${dest}`,
    scheduleCount: scheduleIds.length,
    duplicateScheduleCount: countDuplicateSailingsWithinOffer(scheduleIds, schedules),
    hasL3: true,
    warnings,
    scheduleIds,
    rawOffer: offer,
  };
}

/** Merge carrier display labels when multiple names share the same ID. */
export function mergeCarrierLabels(
  existing: string | null,
  next: string,
): string {
  if (!existing) return next;
  const parts = existing.split(' · ');
  if (parts.includes(next)) return existing;
  return [...parts, next].join(' · ');
}
