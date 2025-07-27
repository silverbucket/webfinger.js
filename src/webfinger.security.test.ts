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

    it('should handle invalid IPv4 addresses', async () => {
      const webfinger = new WebFinger();
      
      const invalidIPv4Addresses = [
        'user@256.256.256.256',    // Octets > 255
        'user@192.168.1.300',      // Last octet > 255
        'user@192.168.999.1',      // Third octet > 255
        'user@999.168.1.1',        // First octet > 255
        'user@300.300.300.300',    // All octets > 255
        'user@1000.1.1.1',        // First octet >> 255
      ];

      for (const address of invalidIPv4Addresses) {
        await expect(webfinger.lookup(address))
          .rejects.toThrow(); // Should be rejected as invalid format since regex won't match
      }
    });

    it('should handle invalid port numbers', async () => {
      const webfinger = new WebFinger();
      
      const invalidPortAddresses = [
        'user@example.com:abc',     // Non-numeric port
        'user@example.com:99999x',  // Invalid port format
        'user@localhost:notaport',  // Non-numeric port
      ];

      for (const address of invalidPortAddresses) {
        await expect(webfinger.lookup(address))
          .rejects.toThrow('invalid host format');
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

  describe('Redirect-based SSRF Prevention', () => {
    it('should reject redirects to localhost', async () => {
      const webfinger = new WebFinger({ request_timeout: 1000 });
      
      // Mock a fetch that returns a redirect to localhost
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        if (typeof url === 'string' && url.includes('evil.com')) {
          return new Response('', { 
            status: 302, 
            headers: { 'location': 'http://localhost:8080/admin' }
          });
        }
        return originalFetch(url);
      };
      
      try {
        await expect(webfinger.lookup('user@evil.com'))
          .rejects.toThrow('redirect to private or internal address blocked');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should reject redirects to private IP ranges', async () => {
      const webfinger = new WebFinger({ request_timeout: 1000 });
      
      const privateRedirects = [
        'http://127.0.0.1:8080/secret',
        'http://10.0.0.1/admin',
        'http://192.168.1.1:3000/internal',
        'http://172.16.0.1/restricted'
      ];
      
      for (const redirectTarget of privateRedirects) {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (url) => {
          if (typeof url === 'string' && url.includes('evil.com')) {
            return new Response('', { 
              status: 301, 
              headers: { 'location': redirectTarget }
            });
          }
          return originalFetch(url);
        };
        
        try {
          await expect(webfinger.lookup('user@evil.com'))
            .rejects.toThrow('redirect to private or internal address blocked');
        } finally {
          globalThis.fetch = originalFetch;
        }
      }
    });

    it('should handle too many redirects', async () => {
      const webfinger = new WebFinger({ request_timeout: 1000 });
      
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        if (typeof url === 'string' && url.includes('redirect-loop.com')) {
          return new Response('', { 
            status: 302, 
            headers: { 'location': url } // Redirect to self
          });
        }
        return originalFetch(url);
      };
      
      try {
        await expect(webfinger.lookup('user@redirect-loop.com'))
          .rejects.toThrow('too many redirects');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should reject redirects without location header', async () => {
      const webfinger = new WebFinger({ request_timeout: 1000 });
      
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        if (typeof url === 'string' && url.includes('bad-redirect.com')) {
          return new Response('', { status: 302 }); // No location header
        }
        return originalFetch(url);
      };
      
      try {
        await expect(webfinger.lookup('user@bad-redirect.com'))
          .rejects.toThrow('redirect without location header');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should reject invalid redirect URLs', async () => {
      const webfinger = new WebFinger({ request_timeout: 1000 });
      
      const originalFetch = globalThis.fetch;
      const originalURL = globalThis.URL;
      
      // Mock URL constructor to throw for specific location
      globalThis.URL = function(url: string, base?: string) {
        if (url === 'ht!tp://invalid') {
          throw new Error('Invalid URL');
        }
        return new originalURL(url, base);
      } as any;
      
      globalThis.fetch = async (url) => {
        if (typeof url === 'string' && url.includes('invalid-redirect.com')) {
          return new Response('', { 
            status: 302, 
            headers: { 'location': 'ht!tp://invalid' }
          });
        }
        // Block all other requests to prevent real network calls
        throw new Error('Network request blocked in test');
      };
      
      try {
        await expect(webfinger.lookup('user@invalid-redirect.com'))
          .rejects.toThrow('invalid redirect URL');
      } finally {
        globalThis.fetch = originalFetch;
        globalThis.URL = originalURL;
      }
    });

    it('should follow legitimate redirects to public domains', async () => {
      const webfinger = new WebFinger({ request_timeout: 1000 });
      
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        if (typeof url === 'string' && url.includes('legit-redirect.com/.well-known/webfinger')) {
          return new Response('', { 
            status: 302, 
            headers: { 'location': 'https://example.com/.well-known/webfinger?resource=acct:user@legit-redirect.com' }
          });
        } else if (typeof url === 'string' && url.includes('example.com/.well-known/webfinger')) {
          return new Response('{"error": "user not found"}', { status: 404 });
        }
        return originalFetch(url);
      };
      
      try {
        await expect(webfinger.lookup('user@legit-redirect.com'))
          .rejects.toThrow('resource not found'); // Should follow redirect but get 404
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should allow redirect when private addresses are explicitly allowed', async () => {
      const webfinger = new WebFinger({ 
        allow_private_addresses: true,
        request_timeout: 1000 
      });
      
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        if (typeof url === 'string' && url.includes('redirect-to-localhost.com/.well-known/webfinger')) {
          return new Response('', { 
            status: 302, 
            headers: { 'location': 'http://localhost:8080/.well-known/webfinger?resource=acct:user@redirect-to-localhost.com' }
          });
        } else if (typeof url === 'string' && url.includes('localhost:8080/.well-known/webfinger')) {
          return new Response('{"error": "connection refused"}', { status: 500 });
        }
        return originalFetch(url);
      };
      
      try {
        await expect(webfinger.lookup('user@redirect-to-localhost.com'))
          .rejects.toThrow('error during request'); // Should follow redirect but get connection error
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('Regression Tests for SSRF Vulnerability', () => {
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