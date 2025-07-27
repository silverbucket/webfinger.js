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

Try the **[Interactive Demo](https://silverbucket.github.io/webfinger.js/)** to see WebFinger lookups in action.

## Installation

```bash
# Using bun (recommended)
bun add webfinger.js

# Using npm
npm install webfinger.js

# Using yarn
yarn add webfinger.js
```

## Quick Start

### TypeScript / ES6+

```typescript
import WebFinger from 'webfinger.js';

const webfinger = new WebFinger({
  webfist_fallback: true,
  tls_only: true
});

// Lookup user information
const result = await webfinger.lookup('nick@silverbucket.net');
console.log('Name:', result.idx.properties.name);
console.log('Avatar:', result.idx.links.avatar?.[0]?.href);
```

### CommonJS / Node.js

```javascript
const WebFinger = require('webfinger.js').default;

const webfinger = new WebFinger();
const result = await webfinger.lookup('user@domain.com');
```

### Browser

```html
<script src="https://unpkg.com/webfinger.js/dist/webfinger.js"></script>
<script>
  const webfinger = new WebFinger();
  const result = await webfinger.lookup('user@domain.com');
</script>
```

## Documentation

📚 **[Complete API Reference](docs/API.md)** - Auto-generated from TypeScript source  
🚀 **[Usage Examples](docs/EXAMPLES.md)** - Comprehensive examples and patterns  
🛠️ **[Development Guide](docs/DEVELOPMENT.md)** - Contributing and development setup  
🎮 **[Live Demo](https://silverbucket.github.io/webfinger.js/)** - Interactive WebFinger lookup

## Security

### SSRF Protection

This library includes comprehensive protection against Server-Side Request Forgery (SSRF) attacks by default:

- **Private address blocking**: Prevents requests to localhost, private IP ranges, and internal networks
- **Path injection prevention**: Validates host formats to prevent directory traversal attacks
- **Redirect validation**: Prevents redirect-based SSRF attacks to private networks
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

## Contributing

Contributions are welcome! Please see the [Development Guide](docs/DEVELOPMENT.md) for setup instructions, coding guidelines, and contribution workflow.

## License

This project is licensed under the [AGPL License](LICENSE) - see the license file for details.
