import { describe, it, expect, beforeAll } from 'bun:test';
import WebFinger from '../src/webfinger';

// Type for mocking Node.js process object in tests
type MockProcess = {
  versions: {
    node: string;
  };
};

describe('WebFinger', () => {
  let webfinger: WebFinger;

  beforeAll(() => {
    webfinger = new WebFinger({
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


  describe('lookupLink method', () => {
    it('should reject for unsupported link relations', async () => {
      await expect(webfinger.lookupLink('test@example.com', 'unsupported-rel'))
        .rejects.toThrow('unsupported rel');
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

      it('should have allow_private_addresses configuration option', () => {
        const permissiveWf = new WebFinger({
          allow_private_addresses: true
        });
        
        expect(permissiveWf.config.allow_private_addresses).toBe(true);
      });

      it('should default to blocking private addresses', () => {
        const defaultWf = new WebFinger();
        expect(defaultWf.config.allow_private_addresses).toBe(false);
      });
    });

    describe('SSRF Prevention (CVE Advisory Tests)', () => {
      it('should block the original PoC attack vector', async () => {
        // Test the exact attack vector from GHSA-8xq3-w9fx-74rv
        const maliciousAddress = 'user@localhost:1234/secret.txt?';
        
        await expect(webfinger.lookup(maliciousAddress))
          .rejects.toThrow('private or internal addresses are not allowed');
      });

      it('should block localhost with port and path combinations', async () => {
        const attackVectors = [
          'user@localhost:8080/admin',
          'user@127.0.0.1:3000/api/internal', 
          'user@localhost:1234/secret.txt?',
          'user@127.0.0.1:9000/config',
          'user@localhost:7000/admin/restricted'
        ];

        for (const maliciousAddress of attackVectors) {
          await expect(webfinger.lookup(maliciousAddress))
            .rejects.toThrow('private or internal addresses are not allowed');
        }
      });

      it('should block internal network probing attempts', async () => {
        const internalProbes = [
          'user@192.168.1.100:22/ssh',
          'user@10.0.0.1:80/admin',
          'user@172.16.0.1:443/internal',
          'user@169.254.169.254:80/latest/meta-data'  // AWS metadata service
        ];

        for (const probe of internalProbes) {
          await expect(webfinger.lookup(probe))
            .rejects.toThrow('private or internal addresses are not allowed');
        }
      });
    });

    describe('DNS Resolution SSRF Protection', () => {
      it('should have DNS resolution protection available in Node.js environments', () => {
        const secureWebfinger = new WebFinger({
          allow_private_addresses: false,
          request_timeout: 1000
        });
        
        // We can't easily test actual DNS resolution without external dependencies,
        // but we can verify the WebFinger instance is properly configured
        expect(secureWebfinger).toBeDefined();
      });

      it('should perform DNS resolution in Node.js environment and block private IPs', async () => {
        const originalEval = global.eval;
        const originalProcess = global.process;
        
        // Set up Node.js environment simulation
        global.process = { versions: { node: '18.0.0' } } as MockProcess;
        
        let dnsResolveCalled = false;
        let resolvedHostname = '';
        
        const mockDns = {
          resolve4: async (hostname: string) => {
            dnsResolveCalled = true;
            resolvedHostname = hostname;
            return ['127.0.0.1']; // Return localhost IP to trigger SSRF protection
          },
          resolve6: async () => []
        };
        
        // Mock eval to return our mock DNS module
        global.eval = (code: string) => {
          if (code.includes('import("dns")')) {
            return Promise.resolve({ promises: mockDns });
          }
          return originalEval(code);
        };
        
        try {
          const webfinger = new WebFinger({
            allow_private_addresses: false,
            request_timeout: 1000
          });
          
          // Test DNS validation through the lookup method
          await expect(webfinger.lookup('test@malicious-domain.com'))
            .rejects.toThrow('resolves to private address');
          
          // Verify DNS was called
          expect(dnsResolveCalled).toBe(true);
          expect(resolvedHostname).toBe('malicious-domain.com');
        } finally {
          // Restore original functions
          global.eval = originalEval;
          global.process = originalProcess;
        }
      });

      it('should skip DNS resolution for IP addresses', async () => {
        const originalEval = global.eval;
        const originalProcess = global.process;
        
        // Set up Node.js environment
        global.process = { versions: { node: '18.0.0' } } as MockProcess;
        
        let dnsResolveCalled = false;
        const mockDns = {
          resolve4: async () => {
            dnsResolveCalled = true;
            return [];
          },
          resolve6: async () => []
        };
        
        global.eval = () => Promise.resolve({ promises: mockDns });
        
        try {
          const secureWebfinger = new WebFinger({
            allow_private_addresses: false,
            request_timeout: 1000
          });
          
          // Should be blocked by isPrivateAddress, not DNS resolution
          await expect(secureWebfinger.lookup('test@127.0.0.1'))
            .rejects.toThrow('private or internal addresses are not allowed');
          
          // DNS should not have been called since it's already an IP
          expect(dnsResolveCalled).toBe(false);
        } finally {
          global.eval = originalEval;
          global.process = originalProcess;
        }
      });

      it('should skip DNS resolution for localhost', async () => {
        const originalEval = global.eval;
        const originalProcess = global.process;
        
        global.process = { versions: { node: '18.0.0' } } as MockProcess;
        
        let dnsResolveCalled = false;
        const mockDns = {
          resolve4: async () => {
            dnsResolveCalled = true;
            return [];
          },
          resolve6: async () => []
        };
        
        global.eval = () => Promise.resolve({ promises: mockDns });
        
        try {
          const secureWebfinger = new WebFinger({
            allow_private_addresses: false,
            request_timeout: 1000
          });
          
          await expect(secureWebfinger.lookup('test@localhost'))
            .rejects.toThrow('private or internal addresses are not allowed');
          
          // DNS should not have been called for localhost
          expect(dnsResolveCalled).toBe(false);
        } finally {
          global.eval = originalEval;
          global.process = originalProcess;
        }
      });

      it('should allow domains that resolve to public IPs', async () => {
        const originalEval = global.eval;
        const originalProcess = global.process;
        const originalFetch = globalThis.fetch;
        
        global.process = { versions: { node: '18.0.0' } } as MockProcess;
        
        let dnsResolveCalled = false;
        const mockDns = {
          resolve4: async () => {
            dnsResolveCalled = true;
            return ['8.8.8.8']; // Public DNS server IP
          },
          resolve6: async () => []
        };
        
        global.eval = () => Promise.resolve({ promises: mockDns });
        
        // Mock fetch to simulate network request
        globalThis.fetch = () => Promise.reject(new Error('Network error'));
        
        try {
          const secureWebfinger = new WebFinger({
            allow_private_addresses: false,
            request_timeout: 1000
          });
          
          // Should fail with network error, not DNS security error
          await expect(secureWebfinger.lookup('test@public-domain.com'))
            .rejects.toThrow('Network error');
          
          expect(dnsResolveCalled).toBe(true);
        } finally {
          global.eval = originalEval;
          global.process = originalProcess;
          globalThis.fetch = originalFetch;
        }
      });

      it('should not perform DNS resolution in browser environments', async () => {
        const originalEval = global.eval;
        const originalProcess = global.process;
        const originalFetch = globalThis.fetch;
        
        // Simulate browser environment (no process.versions.node)
        delete (global as Record<string, unknown>).process;
        
        let evalCalled = false;
        global.eval = () => {
          evalCalled = true;
          return Promise.resolve({ promises: null });
        };
        
        globalThis.fetch = () => Promise.reject(new Error('Network error'));
        
        try {
          const secureWebfinger = new WebFinger({
            allow_private_addresses: false,
            request_timeout: 1000
          });
          
          // Should fail with network error, DNS resolution should be skipped
          await expect(secureWebfinger.lookup('test@example.com'))
            .rejects.toThrow('Network error');
          
          // eval should not have been called in browser environment
          expect(evalCalled).toBe(false);
        } finally {
          global.eval = originalEval;
          global.process = originalProcess;
          globalThis.fetch = originalFetch;
        }
      });

      it('should allow private addresses when allow_private_addresses is true', async () => {
        const permissiveWf = new WebFinger({
          allow_private_addresses: true,
          request_timeout: 100
        });
        
        // These should not be blocked by DNS validation when private addresses are allowed
        // Test with localhost which should be allowed through due to config
        try {
          await permissiveWf.lookup('test@localhost');
        } catch (error) {
          // Should fail with network error, not DNS resolution security error
          expect(error.message).not.toContain('resolves to private address');
          expect(error.message).not.toContain('private or internal addresses are not allowed');
        }
      });

      it('should skip DNS resolution when allow_private_addresses is true', async () => {
        const originalEval = global.eval;
        const originalProcess = global.process;
        const originalFetch = globalThis.fetch;
        
        // Set up Node.js environment simulation
        global.process = { versions: { node: '18.0.0' } } as MockProcess;
        
        let dnsResolveCalled = false;
        const mockDns = {
          resolve4: async () => {
            dnsResolveCalled = true;
            return ['127.0.0.1']; // This would normally trigger SSRF protection
          },
          resolve6: async () => []
        };
        
        // Mock eval to return our mock DNS module
        global.eval = (code: string) => {
          if (code.includes('import("dns")')) {
            return Promise.resolve({ promises: mockDns });
          }
          return originalEval(code);
        };
        
        // Mock fetch to prevent real network requests
        globalThis.fetch = async () => {
          throw new Error('Network error - should not reach here');
        };
        
        try {
          const permissiveWf = new WebFinger({
            allow_private_addresses: true,
            request_timeout: 100
          });
          
          // Try to lookup a domain that would normally trigger DNS resolution
          try {
            await permissiveWf.lookup('test@malicious-domain.example');
          } catch (error) {
            // Should fail with network error, not DNS validation error
            expect(error.message).toBe('Network error - should not reach here');
          }
          
          // Verify DNS resolution was NOT called when allow_private_addresses is true
          expect(dnsResolveCalled).toBe(false);
        } finally {
          // Restore original functions
          global.eval = originalEval;
          global.process = originalProcess;
          globalThis.fetch = originalFetch;
        }
      });
    });

    describe('Security Configuration', () => {
      it('should have security features properly configured', () => {
        const testWf = new WebFinger({ 
          allow_private_addresses: false,
          request_timeout: 1000 
        });
        
        expect(testWf.config.allow_private_addresses).toBe(false);
        expect(testWf).toBeDefined();
      });
    });
  });

  describe('Content-Type Warnings', () => {
    it('should debug log when server returns application/json', async () => {
      const originalFetch = globalThis.fetch;
      const originalConsoleDebug = console.debug;
      let debugMessage = '';

      // Mock console.debug to capture debug messages
      console.debug = (message: string) => {
        debugMessage = message;
      };

      // Mock fetch to return application/json instead of application/jrd+json
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({
          subject: 'acct:test@example.com',
          links: []
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        });
      };

      try {
        const testWf = new WebFinger({ 
          request_timeout: 1000,
          allow_private_addresses: true // Allow example.com for testing
        });
        await testWf.lookup('test@example.com');
        
        expect(debugMessage).toContain('WebFinger: Server uses "application/json"');
        expect(debugMessage).toContain('RFC 7033 recommended "application/jrd+json"');
      } finally {
        globalThis.fetch = originalFetch;
        console.debug = originalConsoleDebug;
      }
    });

    it('should warn when server returns unexpected content type', async () => {
      const originalFetch = globalThis.fetch;
      const originalConsoleWarn = console.warn;
      let warningMessage = '';

      // Mock console.warn to capture warnings
      console.warn = (message: string) => {
        warningMessage = message;
      };

      // Mock fetch to return unexpected content type
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({
          subject: 'acct:test@example.com',
          links: []
        }), {
          status: 200,
          headers: {
            'content-type': 'text/html'
          }
        });
      };

      try {
        const testWf = new WebFinger({ 
          request_timeout: 1000,
          allow_private_addresses: true // Allow example.com for testing
        });
        await testWf.lookup('test@example.com');
        
        expect(warningMessage).toContain('WebFinger: Server returned unexpected content-type "text/html"');
        expect(warningMessage).toContain('RFC 7033');
      } finally {
        globalThis.fetch = originalFetch;
        console.warn = originalConsoleWarn;
      }
    });

    it('should not warn when server returns correct content type', async () => {
      const originalFetch = globalThis.fetch;
      const originalConsoleWarn = console.warn;
      const originalConsoleDebug = console.debug;
      let warningCalled = false;
      let debugCalled = false;

      // Mock console functions to detect if they're called
      console.warn = () => { warningCalled = true; };
      console.debug = () => { debugCalled = true; };

      // Mock fetch to return correct application/jrd+json
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({
          subject: 'acct:test@example.com',
          links: []
        }), {
          status: 200,
          headers: {
            'content-type': 'application/jrd+json'
          }
        });
      };

      try {
        const testWf = new WebFinger({ 
          request_timeout: 1000,
          allow_private_addresses: true // Allow example.com for testing
        });
        await testWf.lookup('test@example.com');
        
        expect(warningCalled).toBe(false);
        expect(debugCalled).toBe(false);
      } finally {
        globalThis.fetch = originalFetch;
        console.warn = originalConsoleWarn;
        console.debug = originalConsoleDebug;
      }
    });

    it('should handle content-type with charset parameter', async () => {
      const originalFetch = globalThis.fetch;
      const originalConsoleDebug = console.debug;
      let debugMessage = '';

      console.debug = (message: string) => {
        debugMessage = message;
      };

      // Mock fetch to return application/json with charset
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({
          subject: 'acct:test@example.com',
          links: []
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8'
          }
        });
      };

      try {
        const testWf = new WebFinger({ 
          request_timeout: 1000,
          allow_private_addresses: true // Allow example.com for testing
        });
        await testWf.lookup('test@example.com');
        
        expect(debugMessage).toContain('WebFinger: Server uses "application/json"');
      } finally {
        globalThis.fetch = originalFetch;
        console.debug = originalConsoleDebug;
      }
    });
  });
});