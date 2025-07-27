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
        uri_fallback: false,
        webfist_fallback: false,
        request_timeout: 1000 
      });
      
      // This should fail with a network error or 404
      await expect(testWf.lookup('test@nonexistentdomain12345.com')).rejects.toThrow();
    }, 5000);

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

  describe('Security Features', () => {
    describe('Private Address Blocking', () => {
      let secureWebfinger: WebFinger;

      beforeAll(() => {
        secureWebfinger = new WebFinger({
          allow_private_addresses: false,
          request_timeout: 1000
        });
      });

      it('should block private IPv4 addresses (10.x.x.x)', async () => {
        await expect(secureWebfinger.lookup('test@10.0.0.1')).rejects.toThrow('private or internal addresses are not allowed');
      });

      it('should block private IPv4 addresses (192.168.x.x)', async () => {
        await expect(secureWebfinger.lookup('test@192.168.1.1')).rejects.toThrow('private or internal addresses are not allowed');
      });

      it('should block private IPv4 addresses (172.16-31.x.x)', async () => {
        await expect(secureWebfinger.lookup('test@172.16.0.1')).rejects.toThrow('private or internal addresses are not allowed');
        await expect(secureWebfinger.lookup('test@172.31.255.255')).rejects.toThrow('private or internal addresses are not allowed');
      });

      it('should block localhost addresses', async () => {
        await expect(secureWebfinger.lookup('test@127.0.0.1')).rejects.toThrow('private or internal addresses are not allowed');
        await expect(secureWebfinger.lookup('test@127.1.1.1')).rejects.toThrow('private or internal addresses are not allowed');
      });

      it('should block link-local addresses (169.254.x.x)', async () => {
        await expect(secureWebfinger.lookup('test@169.254.169.254')).rejects.toThrow('private or internal addresses are not allowed');
      });

      it('should block multicast addresses (224-239.x.x.x)', async () => {
        await expect(secureWebfinger.lookup('test@224.0.0.1')).rejects.toThrow('private or internal addresses are not allowed');
        await expect(secureWebfinger.lookup('test@239.255.255.255')).rejects.toThrow('private or internal addresses are not allowed');
      });

      it('should block reserved addresses (240+.x.x.x)', async () => {
        await expect(secureWebfinger.lookup('test@240.0.0.1')).rejects.toThrow('private or internal addresses are not allowed');
        await expect(secureWebfinger.lookup('test@255.255.255.255')).rejects.toThrow('private or internal addresses are not allowed');
      });

      it('should block IPv6 localhost', async () => {
        await expect(secureWebfinger.lookup('test@[::1]')).rejects.toThrow('private or internal addresses are not allowed');
      });

      it('should block IPv6 private addresses', async () => {
        await expect(secureWebfinger.lookup('test@[fc00::1]')).rejects.toThrow('private or internal addresses are not allowed');
        await expect(secureWebfinger.lookup('test@[fd12:3456:789a::1]')).rejects.toThrow('private or internal addresses are not allowed');
        await expect(secureWebfinger.lookup('test@[fe80::1]')).rejects.toThrow('private or internal addresses are not allowed');
      });

      it('should allow private addresses when explicitly configured', async () => {
        const permissiveWf = new WebFinger({
          allow_private_addresses: true,
          request_timeout: 100  // Very short timeout
        });
        
        // Should not reject due to private address (will fail with connection error instead)
        try {
          await permissiveWf.lookup('test@10.0.0.1');
        } catch (error) {
          expect(error.message).not.toContain('private or internal addresses are not allowed');
        }
      }, 2000);

      it('should allow public addresses', async () => {
        // Using 8.8.8.8 (Google DNS) as a known public address
        // This will fail with connection error but should not be blocked for being private
        try {
          await secureWebfinger.lookup('test@8.8.8.8');
        } catch (error) {
          expect(error.message).not.toContain('private or internal addresses are not allowed');
        }
      }, 2000);
    });

    describe('Host Validation', () => {
      it('should reject hosts with invalid characters', async () => {
        await expect(webfinger.lookup('test@host with spaces')).rejects.toThrow('invalid characters in host');
        await expect(webfinger.lookup('test@host?query')).rejects.toThrow('invalid characters in host');
        await expect(webfinger.lookup('test@host#fragment')).rejects.toThrow('invalid characters in host');
      });

      it('should reject malformed hosts', async () => {
        await expect(webfinger.lookup('test@')).rejects.toThrow('invalid useraddress format');
        await expect(webfinger.lookup('test@host/path')).rejects.toThrow('invalid characters in host');
      });

      it('should handle ports correctly', async () => {
        const quickWebfinger = new WebFinger({ request_timeout: 100 });
        // Valid port should not be rejected for host validation
        try {
          await quickWebfinger.lookup('test@example.com:8080');
        } catch (error) {
          expect(error.message).not.toContain('invalid host format');
          expect(error.message).not.toContain('invalid characters in host');
        }
      });
    });

    describe('Redirect Security', () => {
      it('should have redirect security features enabled', () => {
        // Tests that security features are configured - actual redirect tests 
        // would require mocking external servers
        const testWf = new WebFinger({ 
          allow_private_addresses: false,
          request_timeout: 1000 
        });
        
        expect(testWf.config.allow_private_addresses).toBe(false);
        expect(testWf).toBeDefined();
      });
    });

    describe('Input Sanitization', () => {
      it('should handle malicious input safely', async () => {
        const maliciousInputs = [
          'test@../../etc/passwd',
          'test@host\x00null', 
          'test@host\r\ninjection',
          'test@<script>alert(1)</script>',
          'test@javascript:alert(1)'
        ];

        for (const input of maliciousInputs) {
          try {
            await webfinger.lookup(input);
          } catch (error) {
            // Should fail safely with appropriate error, not crash
            expect(error).toBeInstanceOf(Error);
          }
        }
      });
    });
  });
});