export type ApiVersion = 'v3' | 'v4';

export interface V3Response {
  offers?: V3Offer[];
  schedules?: Record<string, ScheduleEntry>;
}

export interface V4Response {
  data?: {
    offers?: V4Offer[];
    schedules?: Record<string, ScheduleEntry>;
  };
}

export interface ScheduleEntry {
  id?: string;
  transitTime?: string;
  sailingDate?: string;
  scheduleDetails?: ScheduleDetail[];
  fromLocation?: LocationPoint;
  toLocation?: LocationPoint;
}

export interface ScheduleDetail {
  fromLocation?: LocationPoint;
  toLocation?: LocationPoint;
  transport?: {
    vessel?: { name?: string; imoNumber?: number | string };
    voyageNumber?: string;
    transportMode?: string;
  };
}

export interface LocationPoint {
  unLocCode?: string;
  departure?: string;
  arrival?: string;
  portName?: string;
  siteName?: string;
}

export interface V3Offer {
  freightifyId?: string;
  productPrice?: {
    linerReferenceId?: string;
    routeScheduleIds?: string[];
    serviceType?: string;
    cargoType?: string;
    transitTimeInDays?: string | number;
    charges?: V3Charge[];
    ratesBy?: V3RatesBy[];
  };
  productOffer?: {
    carrierName?: string;
    carrierScac?: string;
    originPort?: string;
    destinationPort?: string;
    vendorId?: string;
    originFreightServiceType?: string;
    destinationFreightServiceType?: string;
  };
}

export interface V3RatesBy {
  carrierId?: string;
  carrierName?: string;
  rateTypeCode?: string;
  vendorId?: string;
}

export interface V3Charge {
  rateType?: string;
  rateTypeCode?: string;
  amount?: number;
  amountUsd?: number;
}

export interface V4Offer {
  _id?: string;
  meta?: {
    scheduleIds?: string[];
    serviceType?: string;
    cargoType?: string;
    transitTime?: string;
    serviceModeOrigin?: string;
    serviceModeDestination?: string;
    serviceProvider?: {
      id?: string;
      name?: string;
      code?: string;
      logo?: string;
    };
    vendor?: {
      id?: string;
      name?: string;
    };
    tariffDetails?: {
      tariffNumber?: string;
    };
    origins?: { code?: string }[];
    destinations?: { code?: string }[];
  };
  pricingLevels?: V4PricingLevel[];
}

export interface V4PricingLevel {
  pricingLevel?: string;
  equipmentPrices?: {
    equipmentType?: string;
    legs?: V4Leg[];
  }[];
}

export interface V4Leg {
  legCode?: string;
  legName?: string;
  legMeta?: {
    vendor?: {
      id?: string;
      name?: string;
    };
  };
  charges?: V4Charge[];
}

export interface V4Charge {
  code?: string;
  amount?: number | string;
  amountUsd?: number | string;
  subLegCode?: string;
}

export interface NormalizedOffer {
  apiVersion: ApiVersion;
  offerId: string;
  carrierId: string;
  carrier: string;
  carrierCode: string;
  carrierLogo: string | null;
  vendorId: string;
  vendorName: string;
  oceanFreightCost: number | null;
  serviceType: string;
  attachedScheduleSailingDays: string[];
  attachedScheduleSailingDates: string[];
  tariff: string;
  cargoType: string;
  transitTime: string;
  route: string;
  scheduleCount: number;
  duplicateScheduleCount: number;
  hasL3: boolean;
  warnings: string[];
  scheduleIds: string[];
  rawOffer: V3Offer | V4Offer;
}

export interface CarrierVersionStats {
  offerCount: number;
  offers: NormalizedOffer[];
  excludedCount: number;
}

export interface CarrierMatrixRow {
  carrierKey: string;
  carrierId: string;
  v3Label: string | null;
  v4Label: string | null;
  v3Logo: string | null;
  v4Logo: string | null;
  v3: CarrierVersionStats;
  v4: CarrierVersionStats;
}

export interface AnalysisResult {
  rows: CarrierMatrixRow[];
  warnings: string[];
  meta: {
    v3OfferCount: number;
    v4OfferCount: number;
    v3ValidCount: number;
    v4ValidCount: number;
  };
}

export interface ParsedInputs {
  v3: V3Response | null;
  v4: V4Response | null;
}
