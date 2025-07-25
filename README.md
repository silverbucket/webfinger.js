# webfinger.js

A modern, TypeScript-based WebFinger client that runs in both browsers and Node.js environments.

[![version](https://img.shields.io/npm/v/webfinger.js.svg)](https://www.npmjs.com/package/webfinger.js)
[![license](https://img.shields.io/npm/l/webfinger.js.svg)](https://npmjs.org/package/webfinger.js)
[![downloads](https://img.shields.io/npm/dm/webfinger.js.svg)](https://npmjs.org/package/webfinger.js)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Features

✨ **Modern ES6+ support** - Built with TypeScript, works with modern JavaScript  
🔒 **Security-first** - SSRF protection, blocks private/internal addresses by default  
🛡️ **Production-ready** - Prevents localhost/LAN access per ActivityPub security guidelines  
🔄 **Flexible fallbacks** - Supports host-meta and WebFist fallback mechanisms  
🌐 **Universal** - Works in browsers and Node.js  
📦 **Zero dependencies** - Lightweight and self-contained  
⚡ **Fast** - Efficient WebFinger discovery and caching  

## Installation

```bash
# Using bun (recommended)
bun add webfinger.js

# Using npm
npm install webfinger.js

# Using yarn
yarn add webfinger.js
```

## Usage

### ES6+ / TypeScript (Recommended)

```typescript
import WebFinger from 'webfinger.js';

const webfinger = new WebFinger({
  webfist_fallback: true,  // Enable WebFist fallback
  tls_only: true,         // HTTPS only (recommended)
  uri_fallback: false,    // Enable host-meta fallback
  request_timeout: 10000  // 10 second timeout
});

// Using async/await (modern approach)
try {
  const result = await webfinger.lookup('nick@silverbucket.net');
  console.log('User info:', result.idx.properties);
  console.log('Avatar:', result.idx.links.avatar?.[0]?.href);
  console.log('Blog:', result.idx.links.blog?.[0]?.href);
} catch (error) {
  console.error('WebFinger lookup failed:', error.message);
}

// Look up specific link relations
try {
  const storage = await webfinger.lookupLink('nick@silverbucket.net', 'remotestorage');
  console.log('Remote storage endpoint:', storage.href);
} catch (error) {
  console.error('No remote storage found:', error.message);
}
```

### CommonJS / Node.js

```javascript
const WebFinger = require('webfinger.js').default;

const webfinger = new WebFinger({
  webfist_fallback: true,
  tls_only: true
});

// Using callbacks (legacy support)
webfinger.lookup('nick@silverbucket.net', (err, result) => {
  if (err) {
    console.error('Error:', err.message);
    return;
  }
  
  console.log('User info:', result.idx.properties);
  console.log('Links:', result.idx.links);
});
```

### Browser (Global)

```html
<script src="https://unpkg.com/webfinger.js/dist/webfinger.js"></script>
<script>
  const webfinger = new WebFinger({
    webfist_fallback: true,
    tls_only: true
  });

  // Modern browsers support async/await
  (async () => {
    try {
      const result = await webfinger.lookup('user@example.com');
      console.log('WebFinger result:', result);
    } catch (error) {
      console.error('Lookup failed:', error);
    }
  })();
</script>
```

## API Reference

### Constructor Options

```typescript
interface WebFingerConfig {
  tls_only?: boolean;               // Default: true - Use HTTPS only
  webfist_fallback?: boolean;       // Default: false - Enable WebFist fallback
  uri_fallback?: boolean;           // Default: false - Enable host-meta fallback  
  request_timeout?: number;         // Default: 10000 - Request timeout in ms
  allow_private_addresses?: boolean; // Default: false - Allow localhost/LAN addresses (DANGEROUS!)
}
```

### Methods

#### `lookup(address: string): Promise<WebFingerResult>`

Perform a WebFinger lookup for the given address.

**Parameters:**
- `address` - Email-like address (e.g., `user@domain.com`) or URI

**Returns:** Promise resolving to WebFinger result object

#### `lookupLink(address: string, rel: string): Promise<LinkObject>`

Looks up a specific link relation for the given address.

**Parameters:**
- `address` - Email-like address or URI
- `rel` - Link relation (e.g., `'avatar'`, `'blog'`, `'remotestorage'`)

**Returns:** Promise resolving to the first matching link object

### Response Format

```typescript
interface WebFingerResult {
  object: JRD;           // Raw JSON Resource Descriptor
  idx: {                 // Processed/indexed data
    properties: {
      name?: string;     // Display name
    };
    links: {
      avatar: LinkObject[];      // Profile images
      blog: LinkObject[];       // Blog/website links
      profile: LinkObject[];    // Profile pages
      remotestorage: LinkObject[]; // RemoteStorage endpoints
      vcard: LinkObject[];      // vCard data
      // ... other link relations
    };
  };
}

interface LinkObject {
  href: string;          // Target URL
  rel: string;          // Link relation
  type?: string;        // MIME type
  properties?: Record<string, any>; // Additional properties
}
```

## Examples

### Social Profile Discovery

```typescript
import WebFinger from 'webfinger.js';

async function getProfile(address: string) {
  const webfinger = new WebFinger();
  
  try {
    const result = await webfinger.lookup(address);
    
    return {
      name: result.idx.properties.name,
      avatar: result.idx.links.avatar?.[0]?.href,
      website: result.idx.links.blog?.[0]?.href,
      profile: result.idx.links.profile?.[0]?.href
    };
  } catch (error) {
    throw new Error(`Profile not found: ${error.message}`);
  }
}

// Usage
const profile = await getProfile('nick@silverbucket.net');
console.log(profile);
```

### RemoteStorage Discovery

```typescript
async function findRemoteStorage(userAddress: string) {
  const webfinger = new WebFinger();
  
  try {
    const storage = await webfinger.lookupLink(userAddress, 'remotestorage');
    return {
      endpoint: storage.href,
      version: storage.properties?.['http://remotestorage.io/spec/version'],
      authEndpoint: storage.properties?.['http://tools.ietf.org/html/rfc6749#section-4.2']
    };
  } catch (error) {
    throw new Error(`RemoteStorage not found for ${userAddress}`);
  }
}
```

## Security

### SSRF Protection

This library includes comprehensive protection against Server-Side Request Forgery (SSRF) attacks by default:

- **Private address blocking**: Prevents requests to localhost, private IP ranges, and internal networks
- **Path injection prevention**: Validates host formats to prevent directory traversal attacks
- **ActivityPub compliance**: Follows [ActivityPub security guidelines](https://www.w3.org/TR/activitypub/#security-considerations) (Section B.3)

#### Blocked Addresses

The following address ranges are blocked by default:

- **Localhost**: `localhost`, `127.x.x.x`, `::1`, `localhost.localdomain`
- **Private IPv4**: `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`
- **Link-local**: `169.254.x.x`, `fe80::/10`
- **Multicast**: `224.x.x.x-239.x.x.x`, `ff00::/8`

#### Development Override

⚠️ **CAUTION**: Only for development/testing environments!

```typescript
const webfinger = new WebFinger({
  allow_private_addresses: true  // Disables SSRF protection - DANGEROUS in production!
});

// This will now work (but should never be used in production)
await webfinger.lookup('user@localhost:3000');
```

## Development

This project uses [Bun](https://bun.sh) for development.

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build TypeScript
bun run build

# Lint code
bun run lint
```

## Demo

Try the [live demo](https://silverbucket.github.io/webfinger.js/demo/) to see WebFinger in action.

## License

webfinger.js is released under the [AGPL License](LICENSE). See the license file for details.

## Contributing

Contributions are welcome! Feel free to submit bug reports and pull requests.
