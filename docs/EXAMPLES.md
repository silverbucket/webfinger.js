# Usage Examples

Comprehensive examples for using webfinger.js in various scenarios.

## Basic Usage Examples

### ES6+ / TypeScript (Recommended)

```typescript
import WebFinger from 'webfinger.js';

const webfinger = new WebFinger({
  webfist_fallback: true,  // Enable WebFist fallback
  tls_only: true,         // HTTPS only (recommended)
  uri_fallback: true,     // Enable host-meta fallback
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

// Using async/await
(async () => {
  try {
    const result = await webfinger.lookup('nick@silverbucket.net');
    console.log('User info:', result.idx.properties);
    console.log('Links:', result.idx.links);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
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

## Advanced Usage Examples

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

### Error Handling Patterns

```typescript
import WebFinger, { WebFingerError } from 'webfinger.js';

async function robustLookup(address: string) {
  const webfinger = new WebFinger({
    webfist_fallback: true,
    uri_fallback: true,
    request_timeout: 15000
  });

  try {
    const result = await webfinger.lookup(address);
    return result;
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
    throw error;
  }
}
```

### Batch Processing

```typescript
async function lookupMultipleUsers(addresses: string[]) {
  const webfinger = new WebFinger();
  const results = await Promise.allSettled(
    addresses.map(addr => webfinger.lookup(addr))
  );

  return results.map((result, index) => ({
    address: addresses[index],
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason.message : null
  }));
}

// Usage
const users = ['user1@example.com', 'user2@example.com', 'invalid@nonexistent.com'];
const results = await lookupMultipleUsers(users);
results.forEach(result => {
  if (result.success) {
    console.log(`${result.address}:`, result.data?.idx.properties.name);
  } else {
    console.error(`${result.address}: ${result.error}`);
  }
});
```