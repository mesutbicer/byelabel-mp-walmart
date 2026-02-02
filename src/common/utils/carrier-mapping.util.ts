/**
 * CarrierMappingUtil - Carrier name mapping
 * 
 * Fully compatible with the C# Utils/CarrierMappingUtil.cs.
 * 
 * Walmart accepted carriers:
 * UPS, USPS, FedEx, Airborne, OnTrac, DHL Ecommerce - US, DHL, LS (LaserShip),
 * UDS (United Delivery Service), UPSMI (UPS Mail Innovations), FDX, PILOT, ESTES,
 * SAIA, FDS Express, Seko Worldwide, HIT Delivery, FEDEXSP (FedEx SmartPost),
 * RL Carriers, Metropolitan Warehouse & Delivery, China Post, YunExpress,
 * Yellow Freight Sys, AIT Worldwide Logistics, Chukou1, Sendle, Landmark Global,
 * Sunyou, Yanwen, 4PX, GLS, OSM Worldwide, FIRST MILE, AM Trucking, CEVA,
 * India Post, SF Express, CNE, TForce Freight, AxleHire, LSO, Royal Mail,
 * ABF Freight System, WanB, Roadrunner Freight, Meyer Distribution, AAA Cooper,
 * Canada Post, Southeastern Freight Lines, Japan Post, Correos de Mexico,
 * XPO Logistics, JD Logistics, YDH, JCEX, Flyt, Deutsche Post, Better Trucks,
 * Asendia, SFC, UBI, ePost Global, YF Logistics, RXO, Estes Express, Shypmax,
 * WIN.IT America, PITT OHIO, PostNord Sweden, Equick, Whistl, Tusou, Shiprocket,
 * DTDC, PTS.
 */

const CARRIER_MAPPING: Record<string, string> = {
  dhl: 'DHL',
  usps: 'USPS',
  fedex: 'FedEx',
  ups: 'UPS',
  asendia: 'Asendia',
  // evri, uniuni, intelcom have no Walmart mapping
};

/**
 * Converts application carrier code to Walmart accepted enum value.
 * 
 * @param carrierCode - Application carrier code (lowercase)
 * @returns Walmart enum value or empty string if no match
 */
export function mapToWalmartCarrier(carrierCode: string): string {
  if (!carrierCode || carrierCode.trim() === '') {
    return '';
  }

  // Convert to lowercase for case-insensitive comparison
  const normalizedCode = carrierCode.trim().toLowerCase();

  return CARRIER_MAPPING[normalizedCode] || '';
}

/**
 * List of all Walmart supported carriers
 */
export const WALMART_SUPPORTED_CARRIERS = [
  'UPS',
  'USPS',
  'FedEx',
  'Airborne',
  'OnTrac',
  'DHL Ecommerce - US',
  'DHL',
  'LS',
  'UDS',
  'UPSMI',
  'FDX',
  'PILOT',
  'ESTES',
  'SAIA',
  'FDS Express',
  'Seko Worldwide',
  'HIT Delivery',
  'FEDEXSP',
  'RL Carriers',
  'Metropolitan Warehouse & Delivery',
  'China Post',
  'YunExpress',
  'Yellow Freight Sys',
  'AIT Worldwide Logistics',
  'Chukou1',
  'Sendle',
  'Landmark Global',
  'Sunyou',
  'Yanwen',
  '4PX',
  'GLS',
  'OSM Worldwide',
  'FIRST MILE',
  'AM Trucking',
  'CEVA',
  'India Post',
  'SF Express',
  'CNE',
  'TForce Freight',
  'AxleHire',
  'LSO',
  'Royal Mail',
  'ABF Freight System',
  'WanB',
  'Roadrunner Freight',
  'Meyer Distribution',
  'AAA Cooper',
  'Canada Post',
  'Southeastern Freight Lines',
  'Japan Post',
  'Correos de Mexico',
  'XPO Logistics',
  'JD Logistics',
  'YDH',
  'JCEX',
  'Flyt',
  'Deutsche Post',
  'Better Trucks',
  'Asendia',
  'SFC',
  'UBI',
  'ePost Global',
  'YF Logistics',
  'RXO',
  'Estes Express',
  'Shypmax',
  'WIN.IT America',
  'PITT OHIO',
  'PostNord Sweden',
  'Equick',
  'Whistl',
  'Tusou',
  'Shiprocket',
  'DTDC',
  'PTS',
];
