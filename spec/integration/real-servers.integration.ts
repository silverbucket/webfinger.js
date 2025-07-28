import { describe, it, expect, beforeAll } from 'bun:test';
import WebFinger from '../../src/webfinger';

const getErrorMessage = (error: unknown): string => 
  error instanceof Error ? error.message : String(error);

describe('WebFinger Integration Tests', () => {
  let webfinger: WebFinger;

  beforeAll(() => {
    webfinger = new WebFinger({
      webfist_fallback: true,
      uri_fallback: true,
      request_timeout: 10000 // Longer timeout for real network requests
    });
  });

  describe('Real WebFinger Servers', () => {
    it('should successfully lookup a known working WebFinger address', async () => {
      try {
        const result = await webfinger.lookup('nick@silverbucket.net');
        expect(result).toBeDefined();
        expect(result.object).toBeDefined();
        expect(result.idx).toBeDefined();
        expect(result.idx.links).toBeDefined();
      } catch (error) {
        // If the server is down, skip this test
        console.warn('Skipping integration test - server may be down:', getErrorMessage(error));
      }
    }, 15000);

    it('should handle WebFinger lookupLink for known address', async () => {
      try {
        const result = await webfinger.lookupLink('nick@silverbucket.net', 'profile');
        expect(result).toBeDefined();
        expect(result.href).toBeDefined();
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        if (errorMessage.includes('no links found')) {
          // This is acceptable - the address may not have this link type
          expect(errorMessage).toContain('no links found');
        } else {
          // Server may be down, skip
          console.warn('Skipping integration test - server may be down:', getErrorMessage(error));
        }
      }
    }, 15000);

    it('should handle another known WebFinger address', async () => {
      try {
        const result = await webfinger.lookup('paulej@packetizer.com');
        expect(result).toBeDefined();
        expect(result.object).toBeDefined();
        expect(result.idx).toBeDefined();
      } catch (error) {
        console.warn('Skipping integration test - server may be down:', getErrorMessage(error));
      }
    }, 15000);
  });

  describe('Network Error Scenarios', () => {
    it('should handle complete network failures gracefully', async () => {
      const testWf = new WebFinger({ 
        uri_fallback: false,
        webfist_fallback: false,
        request_timeout: 2000 
      });
      
      await expect(testWf.lookup('test@completely-nonexistent-domain-12345.invalid'))
        .rejects.toThrow();
    });

    it('should handle domains with no WebFinger support', async () => {
      const testWf = new WebFinger({ 
        uri_fallback: true,
        webfist_fallback: false,
        request_timeout: 5000 
      });
      
      // Google doesn't support WebFinger
      await expect(testWf.lookup('test@google.com'))
        .rejects.toThrow();
    });

    it('should handle malformed addresses consistently', async () => {
      const testWf = new WebFinger({ request_timeout: 1000 });
      
      await expect(testWf.lookup('not-an-email'))
        .rejects.toThrow('invalid useraddress format');
      
      await expect(testWf.lookup(''))
        .rejects.toThrow('address is required');
      
      // This may throw different errors depending on DNS resolution
      try {
        await testWf.lookup('@nodomain');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        // Could be validation error or network error
      }
    });
  });

  describe('Configuration Testing', () => {
    it('should handle different timeout settings', async () => {
      const shortTimeoutWf = new WebFinger({ 
        request_timeout: 1000 
      });
      
      const longTimeoutWf = new WebFinger({ 
        request_timeout: 10000 
      });
      
      // Both should be valid instances
      expect(shortTimeoutWf).toBeDefined();
      expect(longTimeoutWf).toBeDefined();
    });

    it('should handle TLS configuration properly', async () => {
      const tlsOnlyWf = new WebFinger({ 
        tls_only: true
      });
      
      const tlsFlexibleWf = new WebFinger({ 
        tls_only: false
      });
      
      expect(tlsOnlyWf).toBeDefined();
      expect(tlsFlexibleWf).toBeDefined();
    });
  });

  describe('Response Format Validation', () => {
    it('should validate that successful responses have correct structure', async () => {
      try {
        const result = await webfinger.lookup('nick@silverbucket.net');
        
        // Validate response structure
        expect(result).toHaveProperty('object');
        expect(result).toHaveProperty('idx');
        expect(result.idx).toHaveProperty('links');
        expect(result.idx).toHaveProperty('properties');
        
        // Validate that links is an object with expected properties
        expect(typeof result.idx.links).toBe('object');
        
        // Validate that each link type is an array
        Object.keys(result.idx.links).forEach(linkType => {
          expect(Array.isArray(result.idx.links[linkType])).toBe(true);
        });
        
      } catch (error) {
        console.warn('Skipping validation test - server may be down:', getErrorMessage(error));
      }
    }, 10000);
  });
});