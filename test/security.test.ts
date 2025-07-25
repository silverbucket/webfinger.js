import { describe, it, expect } from 'bun:test';
import WebFinger from '../src/webfinger';

describe('Security Tests - SSRF Prevention', () => {
  describe('Private Address Detection', () => {
    it('should block localhost variants', async () => {
      const webfinger = new WebFinger();
      
      const localhostVariants = [
        'user@localhost',
        'user@127.0.0.1',
        'user@127.0.0.2',
        'user@127.255.255.255',
        'user@localhost.localdomain',
        'user@::1'
      ];

      for (const address of localhostVariants) {
        await expect(webfinger.lookup(address))
          .rejects.toThrow('private or internal addresses are not allowed');
      }
    });

    it('should block private IPv4 ranges', async () => {
      const webfinger = new WebFinger();
      
      const privateAddresses = [
        'user@10.0.0.1',           // 10.0.0.0/8
        'user@10.255.255.255',     // 10.0.0.0/8
        'user@172.16.0.1',         // 172.16.0.0/12
        'user@172.31.255.255',     // 172.16.0.0/12
        'user@192.168.0.1',        // 192.168.0.0/16
        'user@192.168.255.255',    // 192.168.0.0/16
        'user@169.254.0.1',        // 169.254.0.0/16 (link-local)
        'user@224.0.0.1',          // 224.0.0.0/4 (multicast)
        'user@240.0.0.1'           // 240.0.0.0/4 (reserved)
      ];

      for (const address of privateAddresses) {
        await expect(webfinger.lookup(address))
          .rejects.toThrow('private or internal addresses are not allowed');
      }
    });

    it('should block private IPv6 ranges', async () => {
      const webfinger = new WebFinger();
      
      const privateIPv6Addresses = [
        'user@fc00::1',            // Unique local addresses
        'user@fd00::1',            // Unique local addresses
        'user@fe80::1',            // Link-local
        'user@ff02::1'             // Multicast
      ];

      for (const address of privateIPv6Addresses) {
        await expect(webfinger.lookup(address))
          .rejects.toThrow('private or internal addresses are not allowed');
      }
    });

    it('should allow public addresses', async () => {
      const webfinger = new WebFinger({ request_timeout: 500 });
      
      const publicAddresses = [
        'user@example.com',       // Public domain
        'user@github.com'         // Public domain
      ];

      // These should not be rejected for private address reasons
      // (they may fail for other reasons like network/404, but not security)
      for (const address of publicAddresses) {
        try {
          await webfinger.lookup(address);
        } catch (error) {
          expect(error.message).not.toContain('private or internal addresses are not allowed');
        }
      }
    });
  });

  describe('Path Injection Prevention', () => {
    it('should block path injection via @ symbol', async () => {
      const webfinger = new WebFinger({ request_timeout: 1000 });
      
      const pathInjectionAttempts = [
        'user@localhost:7000/admin/restricted',
        'user@127.0.0.1/secret.txt',
        'user@192.168.1.1/admin/panel',
        'user@10.0.0.1:8080/internal/api',
        'user@localhost:3000/admin/config.json'
      ];

      for (const address of pathInjectionAttempts) {
        await expect(webfinger.lookup(address))
          .rejects.toThrow(); // Should throw either validation or private address error
      }
    });

    it('should block URLs with path injection', async () => {
      const webfinger = new WebFinger({ request_timeout: 1000 });
      
      const urlInjectionAttempts = [
        'http://localhost:7000/admin/restricted',
        'https://127.0.0.1/secret.txt',
        'http://192.168.1.1/admin/panel',
        'https://10.0.0.1:8080/internal/api'
      ];

      for (const address of urlInjectionAttempts) {
        await expect(webfinger.lookup(address))
          .rejects.toThrow(); // Should be blocked either way
      }
    });

    it('should block query parameter injection', async () => {
      const webfinger = new WebFinger();
      
      const queryInjectionAttempts = [
        'user@localhost:7000/admin?param=value',
        'user@127.0.0.1/secret.txt?',
        'user@example.com#fragment'
      ];

      for (const address of queryInjectionAttempts) {
        await expect(webfinger.lookup(address))
          .rejects.toThrow(); // Will throw either validation or private address error
      }
    });
  });

  describe('Configuration Override', () => {
    it('should allow private addresses when explicitly configured', async () => {
      const webfinger = new WebFinger({ 
        allow_private_addresses: true,
        request_timeout: 500  // Very short timeout to avoid hanging
      });
      
      // These should not be rejected for security reasons when explicitly allowed
      const privateAddresses = [
        'user@localhost',
        'user@127.0.0.1'
      ];

      for (const address of privateAddresses) {
        try {
          await webfinger.lookup(address);
        } catch (error) {
          // Should not be rejected for private address reasons (may fail for other reasons like connection)
          expect(error.message).not.toContain('private or internal addresses are not allowed');
          // Connection errors are expected and acceptable
          expect(['Unable to connect', 'error during request', 'fetch() URL is invalid'].some(msg => 
            error.message.includes(msg)
          )).toBe(true);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed addresses gracefully', async () => {
      const webfinger = new WebFinger();
      
      const malformedAddresses = [
        '',
        'invalid',
        '@',
        'user@',
        '@host.com',
        'user@@host.com',
        'user@host@host.com'
      ];

      for (const address of malformedAddresses) {
        await expect(webfinger.lookup(address))
          .rejects.toThrow(); // Should throw validation errors
      }
    });

    it('should handle port numbers correctly', async () => {
      const webfinger = new WebFinger({ request_timeout: 1000 });
      
      await expect(webfinger.lookup('user@localhost:8080'))
        .rejects.toThrow('private or internal addresses are not allowed');
        
      await expect(webfinger.lookup('user@127.0.0.1:3000'))
        .rejects.toThrow('private or internal addresses are not allowed');
    });

    it('should handle IPv6 with ports', async () => {
      const webfinger = new WebFinger();
      
      await expect(webfinger.lookup('user@[::1]:8080'))
        .rejects.toThrow('private or internal addresses are not allowed');
    });
  });

  describe('Regression Tests for CVE-2023-XXXXX', () => {
    it('should prevent the original SSRF vulnerability', async () => {
      const webfinger = new WebFinger();
      
      // Original PoC from security advisory
      const maliciousAddress = 'user@localhost:7000/admin/restricted_page?';
      
      await expect(webfinger.lookup(maliciousAddress))
        .rejects.toThrow(); // Will be blocked by either validation or private address detection
    });

    it('should prevent localhost variants from bypassing detection', async () => {
      const webfinger = new WebFinger();
      
      const bypassAttempts = [
        'user@127.0.0.1:1234/abc',
        'user@localhost:1234/secret.txt',
        'user@127.1:8080/admin',
        'user@localhost.localdomain:3000/internal'
      ];

      for (const address of bypassAttempts) {
        await expect(webfinger.lookup(address))
          .rejects.toThrow(); // Should be blocked by validation or private address detection
      }
    });
  });
});