import { describe, it, expect, beforeAll } from 'bun:test';
import WebFinger from '../src/webfinger';

describe('WebFinger', () => {
  let webfinger: WebFinger;

  beforeAll(() => {
    webfinger = new WebFinger({
      webfist_fallback: true,
      uri_fallback: true,
      request_timeout: 5000
    });
  });

  describe('Module Loading', () => {
    it('should export WebFinger as a function', () => {
      expect(typeof WebFinger).toBe('function');
    });

    it('should create a WebFinger instance', () => {
      const wf = new WebFinger();
      expect(wf).toBeInstanceOf(WebFinger);
      expect(typeof wf.lookup).toBe('function');
      expect(typeof wf.lookupLink).toBe('function');
    });

    it('should create instance with default config when no params provided', () => {
      const wf = new WebFinger();
      expect(wf).toBeInstanceOf(WebFinger);
    });
  });

  describe('Input Validation', () => {
    it('should reject when called with no parameters', async () => {
      await expect(webfinger.lookup()).rejects.toThrow('address is required');
    });

    it('should reject invalid useraddress format', async () => {
      await expect(webfinger.lookup('asdfg')).rejects.toThrow('invalid useraddress format');
    });

    it('should reject empty string', async () => {
      await expect(webfinger.lookup('')).rejects.toThrow('address is required');
    });

    it('should reject invalid URI format', async () => {
      await expect(webfinger.lookup('http://')).rejects.toThrow('could not determine host from address');
    });
  });

  describe('Configuration', () => {
    it('should create instance with custom configuration', () => {
      const customWf = new WebFinger({
        tls_only: false,
        webfist_fallback: true,
        uri_fallback: true,
        request_timeout: 15000
      });
      expect(customWf).toBeInstanceOf(WebFinger);
    });

    it('should handle partial configuration', () => {
      const partialWf = new WebFinger({
        tls_only: false
      });
      expect(partialWf).toBeInstanceOf(WebFinger);
    });
  });

  describe('Localhost Handling', () => {
    it('should handle localhost addresses (expected to fail with connection error)', async () => {
      const localWf = new WebFinger({ request_timeout: 3000 });
      
      await expect(localWf.lookup('me@localhost:8001')).rejects.toThrow();
    });
  });

  describe('Network Error Handling', () => {
    it('should handle non-existent domains gracefully', async () => {
      const testWf = new WebFinger({ 
        uri_fallback: true,
        request_timeout: 2000 
      });
      
      // This should fail with a network error or 404
      await expect(testWf.lookup('test@nonexistentdomain12345.com')).rejects.toThrow();
    });

    it('should handle domains without WebFinger support', async () => {
      const testWf = new WebFinger({ 
        uri_fallback: true,
        request_timeout: 3000 
      });
      
      // Gmail doesn't support WebFinger, should error
      await expect(testWf.lookup('test@gmail.com')).rejects.toThrow();
    });
  });

  describe('lookupLink method', () => {
    it('should reject for unsupported link relations', async () => {
      await expect(webfinger.lookupLink('test@example.com', 'unsupported-rel'))
        .rejects.toThrow('unsupported rel');
    });

    it('should accept known link relations', async () => {
      // This will likely fail with network error, but should not reject due to unsupported rel
      const testWf = new WebFinger({ request_timeout: 1000 });
      
      try {
        await testWf.lookupLink('test@nonexistent12345.com', 'avatar');
      } catch (error) {
        // Should fail with network error, not unsupported rel error
        expect(error.message).not.toContain('unsupported rel');
      }
    });
  });

  describe('Error Types', () => {
    it('should return WebFingerError instances', async () => {
      try {
        await webfinger.lookup('invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('invalid useraddress format');
      }
    });
  });
});