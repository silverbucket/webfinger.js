import { createServer, Server } from 'http';

export interface WebFingerTestServer {
  server: Server;
  port: number;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createWebFingerTestServer(port = 0): WebFingerTestServer {
  let server: Server;
  let actualPort: number;

  const getMockResponse = (resource: string, port: number) => {
    const cleanResource = resource.replace('acct:', '');
    
    if (cleanResource === `test@localhost:${port}`) {
      return {
        subject: `acct:test@localhost:${port}`,
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
      };
    }
    
    if (cleanResource === `user@localhost:${port}`) {
      return {
        subject: `acct:user@localhost:${port}`,
        properties: {
          'http://packetizer.com/ns/name': 'Test User'
        },
        links: [
          {
            rel: 'http://webfinger.net/rel/profile-page',
            href: 'https://example.com/user'
          }
        ]
      };
    }
    
    return null;
  };

  server = createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method !== 'GET') {
      res.writeHead(405);
      res.end('Method Not Allowed');
      return;
    }

    const url = new URL(req.url!, `http://localhost:${actualPort}`);
    
    // WebFinger endpoint
    if (url.pathname === '/.well-known/webfinger') {
      const resource = url.searchParams.get('resource');
      
      if (!resource) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'resource parameter required' }));
        return;
      }

      const mockResponse = getMockResponse(resource, actualPort);
      
      if (mockResponse) {
        res.writeHead(200, { 'Content-Type': 'application/jrd+json' });
        res.end(JSON.stringify(mockResponse));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'resource not found' }));
      }
      return;
    }

    // host-meta endpoint (fallback)
    if (url.pathname === '/.well-known/host-meta' || url.pathname === '/.well-known/host-meta.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        links: [
          {
            rel: 'lrdd',
            template: `http://localhost:${actualPort}/.well-known/webfinger?resource={uri}`
          }
        ]
      }));
      return;
    }

    // Not found
    res.writeHead(404);
    res.end('Not Found');
  });

  return {
    server,
    get port() { return actualPort; },
    
    start(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.listen(port, () => {
          const addr = server.address();
          if (addr && typeof addr === 'object') {
            actualPort = addr.port;
            resolve();
          } else {
            reject(new Error('Failed to get server address'));
          }
        });
        
        server.on('error', reject);
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    }
  };
}