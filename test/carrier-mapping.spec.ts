import { mapToWalmartCarrier, WALMART_SUPPORTED_CARRIERS } from '../src/common/utils/carrier-mapping.util';

/**
 * CarrierMappingUtil Unit Tests
 * 
 * C# projesindeki Utils/CarrierMappingUtil.cs ile birebir uyumlu testler.
 */
describe('CarrierMappingUtil', () => {
  // ==========================================
  // KNOWN CARRIERS MAPPING TESTS
  // ==========================================
  describe('mapToWalmartCarrier - Known Carriers', () => {
    it('should map "dhl" to "DHL"', () => {
      expect(mapToWalmartCarrier('dhl')).toBe('DHL');
    });

    it('should map "DHL" to "DHL" (case insensitive)', () => {
      expect(mapToWalmartCarrier('DHL')).toBe('DHL');
    });

    it('should map "Dhl" to "DHL" (mixed case)', () => {
      expect(mapToWalmartCarrier('Dhl')).toBe('DHL');
    });

    it('should map "usps" to "USPS"', () => {
      expect(mapToWalmartCarrier('usps')).toBe('USPS');
    });

    it('should map "USPS" to "USPS"', () => {
      expect(mapToWalmartCarrier('USPS')).toBe('USPS');
    });

    it('should map "fedex" to "FedEx"', () => {
      expect(mapToWalmartCarrier('fedex')).toBe('FedEx');
    });

    it('should map "FedEx" to "FedEx"', () => {
      expect(mapToWalmartCarrier('FedEx')).toBe('FedEx');
    });

    it('should map "FEDEX" to "FedEx"', () => {
      expect(mapToWalmartCarrier('FEDEX')).toBe('FedEx');
    });

    it('should map "ups" to "UPS"', () => {
      expect(mapToWalmartCarrier('ups')).toBe('UPS');
    });

    it('should map "UPS" to "UPS"', () => {
      expect(mapToWalmartCarrier('UPS')).toBe('UPS');
    });

    it('should map "asendia" to "Asendia"', () => {
      expect(mapToWalmartCarrier('asendia')).toBe('Asendia');
    });

    it('should map "Asendia" to "Asendia"', () => {
      expect(mapToWalmartCarrier('Asendia')).toBe('Asendia');
    });
  });

  // ==========================================
  // UNKNOWN CARRIERS TESTS
  // ==========================================
  describe('mapToWalmartCarrier - Unknown Carriers', () => {
    it('should return empty string for "evri"', () => {
      expect(mapToWalmartCarrier('evri')).toBe('');
    });

    it('should return empty string for "uniuni"', () => {
      expect(mapToWalmartCarrier('uniuni')).toBe('');
    });

    it('should return empty string for "intelcom"', () => {
      expect(mapToWalmartCarrier('intelcom')).toBe('');
    });

    it('should return empty string for random carrier', () => {
      expect(mapToWalmartCarrier('MyLocalCarrier')).toBe('');
    });

    it('should return empty string for "amazon"', () => {
      expect(mapToWalmartCarrier('amazon')).toBe('');
    });
  });

  // ==========================================
  // EDGE CASES TESTS
  // ==========================================
  describe('mapToWalmartCarrier - Edge Cases', () => {
    it('should return empty string for null', () => {
      expect(mapToWalmartCarrier(null as any)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(mapToWalmartCarrier(undefined as any)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(mapToWalmartCarrier('')).toBe('');
    });

    it('should return empty string for whitespace only', () => {
      expect(mapToWalmartCarrier('   ')).toBe('');
    });

    it('should trim whitespace before mapping', () => {
      expect(mapToWalmartCarrier('  ups  ')).toBe('UPS');
    });

    it('should trim tabs and newlines', () => {
      expect(mapToWalmartCarrier('\tups\n')).toBe('UPS');
    });
  });

  // ==========================================
  // WALMART SUPPORTED CARRIERS LIST TEST
  // ==========================================
  describe('WALMART_SUPPORTED_CARRIERS', () => {
    it('should contain UPS', () => {
      expect(WALMART_SUPPORTED_CARRIERS).toContain('UPS');
    });

    it('should contain USPS', () => {
      expect(WALMART_SUPPORTED_CARRIERS).toContain('USPS');
    });

    it('should contain FedEx', () => {
      expect(WALMART_SUPPORTED_CARRIERS).toContain('FedEx');
    });

    it('should contain DHL', () => {
      expect(WALMART_SUPPORTED_CARRIERS).toContain('DHL');
    });

    it('should contain Asendia', () => {
      expect(WALMART_SUPPORTED_CARRIERS).toContain('Asendia');
    });

    it('should have more than 50 carriers', () => {
      expect(WALMART_SUPPORTED_CARRIERS.length).toBeGreaterThan(50);
    });

    it('should not contain duplicates', () => {
      const uniqueCarriers = [...new Set(WALMART_SUPPORTED_CARRIERS)];
      expect(uniqueCarriers.length).toBe(WALMART_SUPPORTED_CARRIERS.length);
    });
  });
});
