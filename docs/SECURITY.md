# Security

webfinger.js prioritizes security and includes comprehensive protection against common attack vectors that can affect WebFinger implementations.

## SSRF Protection

This library includes robust protection against Server-Side Request Forgery (SSRF) attacks by default:

- **Private address blocking**: Prevents requests to localhost, private IP ranges, and internal networks
- **DNS resolution protection**: Resolves domain names in Node.js environments to block domains that resolve to private IPs
- **Path injection prevention**: Validates host formats to prevent directory traversal attacks  
- **Redirect validation**: Prevents redirect-based SSRF attacks to private networks
- **ActivityPub compliance**: Follows [ActivityPub security guidelines](https://www.w3.org/TR/activitypub/#security-considerations) (Section B.3)

### Blocked Addresses

The following address ranges are blocked by default to prevent SSRF attacks:

#### Localhost
- `localhost`, `localhost.localdomain`
- `127.x.x.x` (IPv4 loopback)
- `::1` (IPv6 loopback)

#### Private IPv4 Ranges
- `10.x.x.x` (Class A private)
- `172.16.x.x` - `172.31.x.x` (Class B private)
- `192.168.x.x` (Class C private)

#### Link-Local Addresses
- `169.254.x.x` (IPv4 link-local)
- `fe80::/10` (IPv6 link-local)

#### Multicast Addresses
- `224.x.x.x` - `239.x.x.x` (IPv4 multicast)
- `ff00::/8` (IPv6 multicast)

### DNS Resolution Protection

In Node.js environments, the library performs DNS resolution to prevent attacks using domains that resolve to private IP addresses:

- **Domain resolution**: All domain names are resolved to IP addresses before making requests
- **Private IP detection**: Resolved IPs are checked against the private address blacklist
- **Attack prevention**: Blocks requests to public domains like `localtest.me` that resolve to `127.0.0.1`
- **Browser compatibility**: DNS resolution is skipped in browser environments where it's not available

**Example blocked domains:**
- `localtest.me` → `127.0.0.1` (blocked)
- `10.0.0.1.nip.io` → `10.0.0.1` (blocked)
- Custom domains configured to resolve to private networks

**Note**: This protection only applies in Node.js environments. Browser environments rely on the browser's built-in protections against private network access.

### Redirect Protection

The library implements manual redirect handling to validate redirect destinations:

- **Redirect limits**: Maximum of 3 redirects to prevent redirect loops
- **Destination validation**: All redirect targets are checked against the private address blacklist
- **Malformed response handling**: Invalid or missing Location headers are rejected
- **URL validation**: Redirect URLs are parsed and validated before following

This prevents attacks where a public domain's WebFinger endpoint redirects to private network resources.

## Development Override

⚠️ **CAUTION**: The following configuration should **ONLY** be used in development or testing environments!

```typescript
const webfinger = new WebFinger({
  allow_private_addresses: true  // Disables SSRF protection - DANGEROUS in production!
});

// This will now work (but should never be used in production)
await webfinger.lookup('user@localhost:3000');
```

### When to Use Development Override

- **Local development**: Testing against localhost services
- **Internal testing**: Validating against private network services
- **Unit testing**: Creating controlled test environments

### Production Security

**Never** set `allow_private_addresses: true` in production environments. This completely disables SSRF protection and opens your application to serious security vulnerabilities.

## Security Best Practices

When integrating webfinger.js into your application:

1. **Keep defaults**: Use the default secure configuration in production
2. **Validate inputs**: Always validate user-provided addresses before lookup
3. **Handle errors gracefully**: Don't expose internal network details in error messages
4. **Monitor requests**: Log WebFinger lookups for security monitoring
5. **Update regularly**: Keep the library updated to receive security patches

## Reporting Security Issues

If you discover a security vulnerability in webfinger.js, please report it responsibly:

1. **Do not** create a public GitHub issue
2. Email security concerns to the maintainer
3. Include detailed reproduction steps
4. Allow reasonable time for fixes before public disclosure

## Compliance

This library's security implementation follows:

- [ActivityPub Security Considerations](https://www.w3.org/TR/activitypub/#security-considerations) (Section B.3)
- [RFC 7033 WebFinger](https://tools.ietf.org/html/rfc7033) security guidelines
- Common SSRF prevention best practices

The security model is designed to be safe by default while providing necessary flexibility for legitimate use cases.