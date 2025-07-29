import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import WebFinger from '../../src/webfinger';
import { createWebFingerTestServer, WebFingerTestServer } from './test-server';

describe('WebFinger Controlled Tests', () => {
  let testServer: WebFingerTestServer;
  let webfinger: WebFinger;
  let serverPort: number;

  beforeAll(async () => {
    testServer = createWebFingerTestServer();
    await testServer.start();
    serverPort = testServer.port;
    
    webfinger = new WebFinger({
      tls_only: false, // Use HTTP for test server
      webfist_fallback: false,
      uri_fallback: true,
      request_timeout: 5000,
      allow_private_addresses: true // Allow localhost for integration tests
    });
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
  });

  describe('Test Server Integration', () => {
    it('should successfully lookup a user on test server', async () => {
      const result = await webfinger.lookup(`test@localhost:${serverPort}`);
      
      expect(result).toBeDefined();
      expect(result.object).toBeDefined();
      expect(result.object.subject).toBe(`acct:test@localhost:${serverPort}`);
      expect(result.idx).toBeDefined();
      expect(result.idx.links).toBeDefined();
      expect(result.idx.links.profile).toBeDefined();
      expect(result.idx.links.profile.length).toBeGreaterThan(0);
      expect(result.idx.links.avatar).toBeDefined();
      expect(result.idx.links.avatar.length).toBeGreaterThan(0);
    });

    it('should handle lookupLink for specific relation', async () => {
      const profileLink = await webfinger.lookupLink(`test@localhost:${serverPort}`, 'profile');
      
      expect(profileLink).toBeDefined();
      expect(profileLink.href).toBe('https://example.com/test');
      expect(profileLink.rel).toBe('http://webfinger.net/rel/profile-page');
    });

    it('should handle avatar link lookup', async () => {
      const avatarLink = await webfinger.lookupLink(`test@localhost:${serverPort}`, 'avatar');
      
      expect(avatarLink).toBeDefined();
      expect(avatarLink.href).toBe('https://example.com/avatar.png');
      expect(avatarLink.rel).toBe('http://webfinger.net/rel/avatar');
    });

    it('should handle user with properties', async () => {
      const result = await webfinger.lookup(`user@localhost:${serverPort}`);
      
      expect(result).toBeDefined();
      expect(result.idx.properties.name).toBe('Test User');
      expect(result.idx.links.profile.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent user', async () => {
      // Create a webfinger instance without fallbacks for this test
      const noFallbackWebfinger = new WebFinger({
        tls_only: false,
        webfist_fallback: false,
        uri_fallback: false, // Disable fallbacks to test direct 404
        request_timeout: 5000,
        allow_private_addresses: true // Allow localhost for integration tests
      });
      
      await expect(noFallbackWebfinger.lookup(`nonexistent@localhost:${serverPort}`))
        .rejects.toThrow('resource not found');
    });

    it('should handle missing link relations gracefully', async () => {
      await expect(webfinger.lookupLink(`test@localhost:${serverPort}`, 'blog'))
        .rejects.toThrow('no links found with rel="blog"');
    });

    it('should handle unsupported link relations', async () => {
      await expect(webfinger.lookupLink(`test@localhost:${serverPort}`, 'unsupported'))
        .rejects.toThrow('unsupported rel unsupported');
    });
  });

  describe('Fallback Behavior with Test Server', () => {
    it('should try different URIs with uri_fallback enabled', async () => {
      const fallbackWf = new WebFinger({
        tls_only: false,
        uri_fallback: true,
        webfist_fallback: false,
        request_timeout: 3000,
        allow_private_addresses: true // Allow localhost for integration tests
      });

      // Should work even if first endpoint fails
      const result = await fallbackWf.lookup(`test@localhost:${serverPort}`);
      expect(result).toBeDefined();
    });

    it('should work without uri_fallback for working endpoint', async () => {
      const noFallbackWf = new WebFinger({
        tls_only: false,
        uri_fallback: false,
        webfist_fallback: false,
        request_timeout: 3000,
        allow_private_addresses: true // Allow localhost for integration tests
      });

      const result = await noFallbackWf.lookup(`test@localhost:${serverPort}`);
      expect(result).toBeDefined();
    });
  });

  describe('Error Response Handling', () => {
    it('should handle malformed resource parameter', async () => {
      // Test with malformed address that should be caught by client validation
      await expect(webfinger.lookup('malformed-address'))
        .rejects.toThrow('invalid useraddress format');
    });

    it('should handle empty address', async () => {
      await expect(webfinger.lookup(''))
        .rejects.toThrow('address is required');
    });
  });

  describe('Response Structure Validation', () => {
    it('should properly index links by relation type', async () => {
      const result = await webfinger.lookup(`test@localhost:${serverPort}`);
      
      // Check that the indexing worked correctly
      expect(result.idx.links.profile).toBeDefined();
      expect(Array.isArray(result.idx.links.profile)).toBe(true);
      expect(result.idx.links.profile[0].href).toBe('https://example.com/test');
      
      expect(result.idx.links.avatar).toBeDefined();
      expect(Array.isArray(result.idx.links.avatar)).toBe(true);
      expect(result.idx.links.avatar[0].href).toBe('https://example.com/avatar.png');
    });

    it('should handle properties correctly', async () => {
      const result = await webfinger.lookup(`user@localhost:${serverPort}`);
      
      expect(result.idx.properties).toBeDefined();
      expect(result.idx.properties.name).toBe('Test User');
    });
  });
});