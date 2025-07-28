import { expect } from '@esm-bundle/chai';

async function loadWebFinger() {
  if (window.WebFinger) {
    return window.WebFinger;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/.tmp/webfinger.js';
    script.onload = () => resolve(window.WebFinger);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

describe('WebFinger Browser Tests', () => {
  let WebFinger;
  let webfinger;

  before(async () => {
    WebFinger = await loadWebFinger();
  });

  beforeEach(() => {
    webfinger = new WebFinger({
      webfist_fallback: true,
      uri_fallback: true,
      request_timeout: 5000
    });
  });

  describe('Module Loading', () => {
    it('should load WebFinger in browser', () => {
      expect(WebFinger).to.be.a('function');
    });

    it('should create a WebFinger instance', () => {
      const wf = new WebFinger();
      expect(wf).to.be.instanceOf(WebFinger);
      expect(wf.lookup).to.be.a('function');
      expect(wf.lookupLink).to.be.a('function');
    });
  });

  describe('Input Validation', () => {
    it('should reject when called with no parameters', async () => {
      try {
        await webfinger.lookup();
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.include('address is required');
      }
    });

    it('should reject invalid useraddress format', async () => {
      try {
        await webfinger.lookup('asdfg');
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.include('invalid useraddress format');
      }
    });
  });

  describe('Browser Environment', () => {
    it('should have access to fetch API', () => {
      expect(window.fetch).to.be.a('function');
    });

    it('should work with browser globals', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(window.location).to.exist;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(document).to.exist;
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
      expect(customWf).to.be.instanceOf(WebFinger);
    });
  });

  describe('Real WebFinger Lookups', () => {
    let mockServer;
    let serverPort;

    before(async () => {
      // Create mock server for testing
      mockServer = await createMockServer();
      serverPort = mockServer.port;
    });

    after(async () => {
      if (mockServer) {
        await mockServer.stop();
      }
    });

    it('should perform successful WebFinger lookup with mock server', async () => {
      const wf = new WebFinger({
        tls_only: false,
        request_timeout: 5000
      });

      const result = await wf.lookup(`test@localhost:${serverPort}`);
      
      expect(result).to.be.an('object');
      expect(result.object.subject).to.equal(`acct:test@localhost:${serverPort}`);
      expect(result.idx).to.be.an('object');
    });

    it('should handle server errors gracefully', async () => {
      const wf = new WebFinger({
        tls_only: false,
        request_timeout: 5000
      });

      try {
        await wf.lookup(`nonexistent@localhost:${serverPort}`);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.include('resource not found');
      }
    });
  });

  describe('JRD Data Structure Validation', () => {
    let mockServer;
    let serverPort;

    before(async () => {
      mockServer = await createMockServer();
      serverPort = mockServer.port;
    });

    after(async () => {
      if (mockServer) {
        await mockServer.stop();
      }
    });

    it('should return properly structured JRD response', async () => {
      const wf = new WebFinger({
        tls_only: false,
        request_timeout: 5000
      });

      const result = await wf.lookup(`test@localhost:${serverPort}`);
      
      // Validate JRD structure
      expect(result.object.subject).to.be.a('string');
      expect(result.object.links).to.be.an('array');
      expect(result.idx).to.be.an('object');
      
      // Validate links structure
      result.object.links.forEach(link => {
        expect(link).to.have.property('rel').that.is.a('string');
        expect(link).to.have.property('href').that.is.a('string');
      });
    });

    it('should handle JRD with properties', async () => {
      const wf = new WebFinger({
        tls_only: false,
        request_timeout: 5000
      });

      const result = await wf.lookup(`user@localhost:${serverPort}`);
      
      expect(result.object.properties).to.be.an('object');
      expect(result.object.properties['http://packetizer.com/ns/name']).to.equal('Test User');
    });
  });

  describe('Link Relation Lookups', () => {
    let mockServer;
    let serverPort;

    before(async () => {
      mockServer = await createMockServer();
      serverPort = mockServer.port;
    });

    after(async () => {
      if (mockServer) {
        await mockServer.stop();
      }
    });

    it('should find specific link relations', async () => {
      const wf = new WebFinger({
        tls_only: false,
        request_timeout: 5000
      });

      const profileLink = await wf.lookupLink(`test@localhost:${serverPort}`, 'profile');
      
      expect(profileLink).to.be.an('object');
      expect(profileLink.href).to.equal('https://example.com/test');
      expect(profileLink.rel).to.equal('http://webfinger.net/rel/profile-page');
    });

    it('should return null for non-existent link relations', async () => {
      const wf = new WebFinger({
        tls_only: false,
        request_timeout: 5000
      });

      try {
        await wf.lookupLink(`test@localhost:${serverPort}`, 'nonexistent');
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).to.include('unsupported rel');
      }
    });
  });

  describe('Fallback Mechanisms', () => {
    let mockServer;
    let serverPort;

    before(async () => {
      mockServer = await createMockServer();
      serverPort = mockServer.port;
    });

    after(async () => {
      if (mockServer) {
        await mockServer.stop();
      }
    });

    it('should work with uri_fallback enabled', async () => {
      const wf = new WebFinger({
        tls_only: false,
        uri_fallback: true,
        request_timeout: 5000
      });

      const result = await wf.lookup(`test@localhost:${serverPort}`);
      
      expect(result).to.be.an('object');
      expect(result.object.subject).to.equal(`acct:test@localhost:${serverPort}`);
    });

    it('should handle network error scenarios', async function() {
      this.timeout(8000);
      
      const wf = new WebFinger({
        tls_only: false,
        request_timeout: 1000
      });

      try {
        await wf.lookup('test@nonexistent-domain-12345.com');
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.match(/(failed.*fetch|network)/i);
      }
    });
  });
});

// Mock server creation function
async function createMockServer() {
  const mockResponses = {
    [`test@localhost`]: {
      subject: 'acct:test@localhost:PORT',
      links: [
        {
          rel: 'http://webfinger.net/rel/profile-page',
          href: 'https://example.com/test'
        },
        {
          rel: 'http://webfinger.net/rel/avatar',
          href: 'https://example.com/avatar.png'
        }
      ]
    },
    [`user@localhost`]: {
      subject: 'acct:user@localhost:PORT',
      properties: {
        'http://packetizer.com/ns/name': 'Test User'
      },
      links: [
        {
          rel: 'http://webfinger.net/rel/profile-page',
          href: 'https://example.com/user'
        }
      ]
    }
  };

  // Create a simple HTTP server for browser testing
  const serverPromise = new Promise((resolve) => {
    const server = {
      port: 8081 + Math.floor(Math.random() * 1000),
      responses: mockResponses,
      stop: async () => {
        // In browser context, we can't actually stop a server
        // This is just for API compatibility
      }
    };
    
    // Mock fetch responses instead of creating actual server
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      const urlObj = new URL(url);
      
      // For non-localhost URLs (like nonexistent domains), reject with network error
      if (!url.includes('localhost')) {
        return Promise.reject(new Error('Failed to fetch'));
      }
      
      // Handle WebFinger and fallback endpoints
      if (urlObj.pathname === '/.well-known/webfinger' || 
          urlObj.pathname === '/.well-known/host-meta' ||
          urlObj.pathname === '/.well-known/host-meta.json') {
        
        if (urlObj.pathname === '/.well-known/webfinger') {
          const resource = urlObj.searchParams.get('resource');
          const cleanResource = resource?.replace('acct:', '').replace(`:${server.port}`, '');
          
          if (cleanResource && mockResponses[cleanResource]) {
            const response = JSON.parse(JSON.stringify(mockResponses[cleanResource]));
            response.subject = response.subject.replace('PORT', server.port);
            const responseText = JSON.stringify(response);
            
            return Promise.resolve({
              ok: true,
              status: 200,
              headers: new Headers({
                'content-type': 'application/jrd+json'
              }),
              json: () => Promise.resolve(response),
              text: () => Promise.resolve(responseText)
            });
          } else {
            const errorResponse = { error: 'resource not found' };
            const errorText = JSON.stringify(errorResponse);
            return Promise.resolve({
              ok: false,
              status: 404,
              headers: new Headers({
                'content-type': 'application/json'
              }),
              json: () => Promise.resolve(errorResponse),
              text: () => Promise.resolve(errorText)
            });
          }
        }
        
        // Handle host-meta fallback
        if (urlObj.pathname === '/.well-known/host-meta' || urlObj.pathname === '/.well-known/host-meta.json') {
          const hostMetaResponse = {
            links: [
              {
                rel: 'lrdd',
                template: `http://localhost:${server.port}/.well-known/webfinger?resource={uri}`
              }
            ]
          };
          const responseText = JSON.stringify(hostMetaResponse);
          
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({
              'content-type': 'application/json'
            }),
            json: () => Promise.resolve(hostMetaResponse),
            text: () => Promise.resolve(responseText)
          });
        }
      }
      
      // Fallback to original fetch for other requests
      return originalFetch.call(this, url, options);
    };
    
    server.originalFetch = originalFetch;
    server.stop = async () => {
      window.fetch = originalFetch;
    };
    
    resolve(server);
  });

  return serverPromise;
}