# API Documentation

Complete API reference for webfinger.js with TypeScript support.

## Table of Contents

- [WebFinger Class](#webfinger-class)
- [Configuration Options](#configuration-options)
- [Methods](#methods)
- [Types](#types)
- [Error Handling](#error-handling)
- [Examples](#examples)

## WebFinger Class

The main WebFinger client class for performing WebFinger lookups.

```typescript
import WebFinger from 'webfinger.js';

const client = new WebFinger(config);
```

### Constructor

```typescript
constructor(config?: WebFingerConfig)
```

Creates a new WebFinger client instance.

**Parameters:**
- `config` - Optional configuration object

**Example:**
```typescript
const webfinger = new WebFinger({
  tls_only: true,
  webfist_fallback: true,
  uri_fallback: true,
  request_timeout: 15000
});
```

## Configuration Options

### WebFingerConfig Interface

```typescript
interface WebFingerConfig {
  /**
   * Use HTTPS only. When false, allows HTTP fallback for localhost.
   * @default true
   */
  tls_only?: boolean;

  /**
   * Enable WebFist fallback service for discovering WebFinger endpoints.
   * @default false
   */
  webfist_fallback?: boolean;

  /**
   * Enable host-meta and host-meta.json fallback endpoints.
   * @default false  
   */
  uri_fallback?: boolean;

  /**
   * Request timeout in milliseconds.
   * @default 10000
   */
  request_timeout?: number;
}
```

## Methods

### lookup()

Performs a WebFinger lookup for the given address.

```typescript
async lookup(address: string): Promise<WebFingerResult>
```

**Parameters:**
- `address: string` - Email-like address (e.g., `user@domain.com`) or full URI

**Returns:**
- `Promise<WebFingerResult>` - Complete WebFinger response with indexed data

**Throws:**
- `WebFingerError` - When lookup fails or address is invalid

**Example:**
```typescript
try {
  const result = await webfinger.lookup('nick@silverbucket.net');
  console.log('Display name:', result.idx.properties.name);
  console.log('Avatar URL:', result.idx.links.avatar?.[0]?.href);
} catch (error) {
  if (error instanceof WebFingerError) {
    console.error('WebFinger error:', error.message, 'Status:', error.status);
  }
}
```

### lookupLink()

Looks up a specific link relation for the given address.

```typescript
async lookupLink(address: string, rel: string): Promise<LinkObject>
```

**Parameters:**
- `address: string` - Email-like address or URI
- `rel: string` - Link relation type (see [Supported Relations](#supported-relations))

**Returns:**
- `Promise<LinkObject>` - First matching link object

**Throws:**
- `WebFingerError` - When lookup fails
- `Error` - When no links found for the specified relation

**Example:**
```typescript
try {
  const storage = await webfinger.lookupLink('user@example.com', 'remotestorage');
  console.log('Storage endpoint:', storage.href);
} catch (error) {
  console.log('No RemoteStorage endpoint found');
}
```

## Types

### WebFingerResult

The complete response from a WebFinger lookup.

```typescript
interface WebFingerResult {
  /** Raw JSON Resource Descriptor from the server */
  object: JRD;
  
  /** Processed and indexed data for easy access */
  idx: {
    properties: {
      /** Display name of the user */
      name?: string;
    };
    links: {
      /** Profile image links */
      avatar: LinkObject[];
      /** Blog or website links */
      blog: LinkObject[];
      /** Social profile page links */
      profile: LinkObject[];
      /** RemoteStorage endpoints */
      remotestorage: LinkObject[];
      /** vCard data links */
      vcard: LinkObject[];
      /** File sharing links */
      share: LinkObject[];
      /** Activity stream updates */
      updates: LinkObject[];
      /** WebFist fallback links */
      webfist: LinkObject[];
      /** Camlistore endpoints */
      camlistore: LinkObject[];
    };
  };
}
```

### LinkObject

Represents a single link relation in the WebFinger response.

```typescript
interface LinkObject {
  /** Target URL */
  href: string;
  
  /** Link relation type */
  rel: string;
  
  /** MIME type (optional) */
  type?: string;
  
  /** Additional link properties */
  properties?: Record<string, any>;
  
  /** Link template (for templated links) */
  template?: string;
  
  /** Link titles in different languages */
  titles?: Record<string, string>;
}
```

### WebFingerError

Custom error class for WebFinger-specific errors.

```typescript
class WebFingerError extends Error {
  /** HTTP status code (when available) */
  status?: number;
  
  constructor(message: string, status?: number);
}
```

## Supported Relations

The following link relations are automatically indexed:

| Relation | Key | Description |
|----------|-----|-------------|
| `http://webfinger.net/rel/avatar` | `avatar` | Profile images |
| `http://webfinger.net/rel/profile-page` | `profile` | Profile pages |
| `me` | `profile` | Self-identification |
| `blog` | `blog` | Blog or website |
| `http://packetizer.com/rel/blog` | `blog` | Blog (alternative) |
| `vcard` | `vcard` | vCard data |
| `remotestorage` | `remotestorage` | RemoteStorage |
| `http://tools.ietf.org/id/draft-dejong-remotestorage` | `remotestorage` | RemoteStorage (spec) |
| `http://www.packetizer.com/rel/share` | `share` | File sharing |
| `http://schemas.google.com/g/2010#updates-from` | `updates` | Activity updates |
| `http://webfist.org/spec/rel` | `webfist` | WebFist fallback |
| `https://camlistore.org/rel/server` | `camlistore` | Camlistore server |

## Error Handling

### Common Error Types

```typescript
try {
  const result = await webfinger.lookup('invalid-address');
} catch (error) {
  if (error instanceof WebFingerError) {
    switch (error.status) {
      case 404:
        console.error('User not found');
        break;
      case 500:
        console.error('Server error');
        break;
      default:
        console.error('WebFinger error:', error.message);
    }
  } else {
    console.error('Network or parsing error:', error.message);
  }
}
```

### Error Status Codes

- `404` - Resource not found (user doesn't exist or no WebFinger support)
- `400` - Bad request (invalid address format)
- `500` - Server error
- `undefined` - Network error, timeout, or parsing error

## Examples

### TypeScript with Full Type Safety

```typescript
import WebFinger, { WebFingerResult, LinkObject, WebFingerError } from 'webfinger.js';

class ProfileService {
  private webfinger: WebFinger;

  constructor() {
    this.webfinger = new WebFinger({
      webfist_fallback: true,
      uri_fallback: true
    });
  }

  async getUserProfile(address: string): Promise<UserProfile | null> {
    try {
      const result: WebFingerResult = await this.webfinger.lookup(address);
      
      return {
        address,
        name: result.idx.properties.name || 'Unknown User',
        avatar: this.extractUrl(result.idx.links.avatar),
        website: this.extractUrl(result.idx.links.blog),
        profile: this.extractUrl(result.idx.links.profile)
      };
    } catch (error) {
      if (error instanceof WebFingerError && error.status === 404) {
        return null; // User not found
      }
      throw error; // Re-throw other errors
    }
  }

  private extractUrl(links: LinkObject[]): string | undefined {
    return links.length > 0 ? links[0].href : undefined;
  }
}

interface UserProfile {
  address: string;
  name: string;
  avatar?: string;
  website?: string;
  profile?: string;
}

// Usage
const profileService = new ProfileService();
const profile = await profileService.getUserProfile('nick@silverbucket.net');
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';
import WebFinger, { WebFingerResult, WebFingerError } from 'webfinger.js';

function useWebFinger(address: string | null) {
  const [result, setResult] = useState<WebFingerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const webfinger = new WebFinger();
    setLoading(true);
    setError(null);

    webfinger.lookup(address)
      .then(setResult)
      .catch((err: WebFingerError) => {
        setError(err.message);
        setResult(null);
      })
      .finally(() => setLoading(false));
  }, [address]);

  return { result, loading, error };
}

// Component usage
function UserCard({ userAddress }: { userAddress: string }) {
  const { result, loading, error } = useWebFinger(userAddress);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!result) return null;

  return (
    <div>
      <h3>{result.idx.properties.name || userAddress}</h3>
      {result.idx.links.avatar?.[0] && (
        <img src={result.idx.links.avatar[0].href} alt="Avatar" />
      )}
    </div>
  );
}
```