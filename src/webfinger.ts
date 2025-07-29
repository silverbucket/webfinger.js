/*!
 * webfinger.js
 *   http://github.com/silverbucket/webfinger.js
 *
 * Developed and Maintained by:
 *   Nick Jennings <nick@silverbucket.net>
 *
 * webfinger.js is released under the AGPL (see LICENSE).
 *
 * You don't have to do anything special to choose one license or the other and you don't
 * have to notify anyone which license you are using.
 * Please see the corresponding license file for details of these licenses.
 * You are free to use, modify and distribute this software, but all copyright
 * information must remain.
 *
 */

// URI to property name map
const LINK_URI_MAPS = {
  'http://webfist.org/spec/rel': 'webfist',
  'http://webfinger.net/rel/avatar': 'avatar',
  'remotestorage': 'remotestorage',
  'http://tools.ietf.org/id/draft-dejong-remotestorage': 'remotestorage',
  'remoteStorage': 'remotestorage',
  'http://www.packetizer.com/rel/share': 'share',
  'http://webfinger.net/rel/profile-page': 'profile',
  'me': 'profile',
  'vcard': 'vcard',
  'blog': 'blog',
  'http://packetizer.com/rel/blog': 'blog',
  'http://schemas.google.com/g/2010#updates-from': 'updates',
  'https://camlistore.org/rel/server': 'camilstore'
};

const LINK_PROPERTIES = {
  'avatar': [],
  'remotestorage': [],
  'blog': [],
  'vcard': [],
  'updates': [],
  'share': [],
  'profile': [],
  'webfist': [],
  'camlistore': []
};

// list of endpoints to try, fallback from beginning to end.
const URIS = ['webfinger', 'host-meta', 'host-meta.json'];

// IPv4 address regex patterns - validate octets 0-255
const IPV4_OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)'; // 0-255
const IPV4_REGEX = new RegExp(`^(?:${IPV4_OCTET}\\.){3}${IPV4_OCTET}$`);
const IPV4_CAPTURE_REGEX = new RegExp(`^(${IPV4_OCTET})\\.(${IPV4_OCTET})\\.(${IPV4_OCTET})\\.(${IPV4_OCTET})$`);

// Other validation regex patterns
const LOCALHOST_REGEX = /^localhost(?:\.localdomain)?(?::\d+)?$/;
const NUMERIC_PORT_REGEX = /^\d+$/;
const HOSTNAME_REGEX = /^[a-zA-Z0-9.-]+$/;
const LOCALHOST_127_REGEX = /^127\.(?:\d{1,3}\.){2}\d{1,3}$/;


/**
 * Configuration options for WebFinger client
 */
export type WebFingerConfig = {
  /** Use HTTPS only. When false, allows HTTP fallback for localhost. */
  tls_only: boolean,
  /** Enable host-meta and host-meta.json fallback endpoints. */
  uri_fallback: boolean,
  /** 
   * @deprecated WebFist is discontinued and will be removed in v3.0.0. Use standard WebFinger discovery instead.
   * Enable WebFist fallback service for discovering WebFinger endpoints. 
   */
  webfist_fallback: boolean,
  /** Request timeout in milliseconds. */
  request_timeout: number,
  /** Allow private/internal addresses (DANGEROUS - only for development). */
  allow_private_addresses: boolean
};

/**
 * JSON Resource Descriptor - Raw WebFinger response format
 */
export type JRD = {
  subject?: string,
  links: Array<Record<string, unknown>>,
  properties?: Record<string, unknown>,
  error?: string,
}

/**
 * Complete WebFinger lookup result with processed data
 */
export type WebFingerResult = {
  object: JRD,
  idx: {
    links: {
      [key: string]: Array<LinkObject>
    },
    properties: Record<string, unknown>,
  }
}

/**
 * Individual link object in WebFinger response
 */
export type LinkObject = {
  /** Target URL */
  href: string;
  /** Link relation type */
  rel: string;
  /** MIME type (optional) */
  type?: string;
  /** Additional properties */
  [key: string]: string | undefined;
}

/**
 * Custom error class for WebFinger-specific errors.
 *
 * This error is thrown for various WebFinger-related failures including:
 * - Network errors (timeouts, DNS failures)
 * - HTTP errors (404, 500, etc.)
 * - Security violations (SSRF protection, invalid hosts)
 * - Invalid response formats (malformed JSON, missing data)
 * - Input validation failures (invalid addresses, formats)
 *
 * @example
 * ```typescript
 * try {
 *   await webfinger.lookup('user@localhost');
 * } catch (error) {
 *   if (error instanceof WebFingerError) {
 *     console.log('WebFinger error:', error.message);
 *     console.log('HTTP status:', error.status); // May be undefined
 *   }
 * }
 * ```
 */
export class WebFingerError extends Error {
  /** HTTP status code if the error originated from an HTTP response */
  status?: number;

  /**
   * Creates a new WebFingerError instance.
   *
   * @param message - Error message describing what went wrong
   * @param status - Optional HTTP status code if applicable
   */
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'WebFingerError';
    this.status = status;
  }
}

/**
 * WebFinger client for discovering user information across domains.
 *
 * @example
 * ```typescript
 * const webfinger = new WebFinger({
 *   tls_only: true
 * });
 *
 * const result = await webfinger.lookup('user@domain.com');
 * console.log(result.idx.properties.name);
 * ```
 */
export default class WebFinger {
  private config: WebFingerConfig;

  /**
   * Creates a new WebFinger client instance.
   *
   * @param cfg - Configuration options for the WebFinger client
   * @param cfg.tls_only - Use HTTPS only (default: true)
   * @param cfg.uri_fallback - Enable host-meta fallback (default: false)
   * @param cfg.webfist_fallback - @deprecated Enable WebFist fallback (default: false)
   * @param cfg.request_timeout - Request timeout in milliseconds (default: 10000)
   * @param cfg.allow_private_addresses - Allow private/internal addresses (default: false, DANGEROUS)
   */
  constructor(cfg: Partial<WebFingerConfig> = {}) {
    this.config = {
      tls_only: (typeof cfg.tls_only !== 'undefined') ? cfg.tls_only : true,
      uri_fallback: (typeof cfg.uri_fallback !== 'undefined') ? cfg.uri_fallback : false,
      webfist_fallback: (typeof cfg.webfist_fallback !== 'undefined') ? cfg.webfist_fallback : false,
      request_timeout: (typeof cfg.request_timeout !== 'undefined') ? cfg.request_timeout : 10000,
      allow_private_addresses: (typeof cfg.allow_private_addresses !== 'undefined') ? cfg.allow_private_addresses : false
    };
    
    // Deprecation warning for WebFist
    if (this.config.webfist_fallback) {
      console.warn('⚠️  WebFinger: webfist_fallback is deprecated and will be removed in v3.0.0. WebFist service is discontinued. Use standard WebFinger discovery instead.');
    }
  }

  // make an HTTP request and look for JRD response, fails if request fails
  // or response not JSON.
  private async fetchJRD(url: string, redirectCount: number = 0): Promise<string> {
    // Prevent redirect loops (max 3 redirects)
    if (redirectCount > 3) {
      throw new WebFingerError('too many redirects');
    }

    const response = await fetch(url, {
      headers: {'Accept': 'application/jrd+json, application/json'},
      redirect: 'manual' // Handle redirects manually for security validation
    });

    // Handle redirect responses with security validation
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new WebFingerError('redirect without location header');
      }

      // Parse and validate redirect URL
      let redirectUrl: URL;
      try {
        redirectUrl = new URL(location, url); // Resolve relative URLs
      } catch {
        throw new WebFingerError('invalid redirect URL');
      }

      // Security: Validate redirect destination host
      const redirectHost = WebFinger.validateHost(redirectUrl.hostname + (redirectUrl.port ? ':' + redirectUrl.port : ''));

      // Security: Check if redirect target is private/internal address
      if (!this.config.allow_private_addresses && WebFinger.isPrivateAddress(redirectHost)) {
        throw new WebFingerError('redirect to private or internal address blocked');
      }

      // Follow the redirect
      return this.fetchJRD(redirectUrl.toString(), redirectCount + 1);
    }

    if (response.status === 404) {
      throw new WebFingerError('resource not found', 404)
    } else if (!response.ok) {
      throw new WebFingerError('error during request', response.status);
    }

    // Check Content-Type for RFC 7033 compliance (informational only)
    const contentType = response.headers.get('content-type') || '';
    const lowerContentType = contentType.toLowerCase();

    // Parse main media type (before semicolon for charset/boundary params)
    const mainType = lowerContentType.split(';')[0].trim();

    if (mainType === 'application/jrd+json') {
      // Perfect - RFC 7033 compliant
    } else if (mainType === 'application/json') {
      console.debug(
        `WebFinger: Server uses "application/json" instead of RFC 7033 recommended "application/jrd+json".`
      );
    } else {
      console.warn(
        `WebFinger: Server returned unexpected content-type "${contentType}". ` +
        'Expected "application/jrd+json" per RFC 7033.'
      );
    }

    const responseText = await response.text();

    if (WebFinger.isValidJSON(responseText)) {
      return responseText;
    } else {
      throw new WebFingerError('invalid json')
    }
  };

  private static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
    } catch {
      return false;
    }
    return true;
  };

  /**
   * Checks if a host is localhost (used for protocol selection).
   *
   * @private
   * @param host - The hostname to check
   * @returns True if the host is a localhost variant
   */
  private static isLocalhost (host: string): boolean {
    return LOCALHOST_REGEX.test(host);
  };

  /**
   * Comprehensive security check for private/internal addresses to prevent SSRF attacks.
   *
   * Blocks the following address ranges:
   * - Localhost: localhost, 127.x.x.x, ::1, localhost.localdomain
   * - Private IPv4: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
   * - Link-local: 169.254.x.x, fe80::/10
   * - Multicast: 224.x.x.x-239.x.x.x, ff00::/8
   *
   * @private
   * @param host - The hostname or IP address to check (may include port)
   * @returns True if the address is private/internal and should be blocked
   * @throws {WebFingerError} When host format is invalid
   */
  private static isPrivateAddress(host: string): boolean {
    // Handle IPv6 addresses in brackets
    let cleanHost = host;
    if (cleanHost.startsWith('[') && cleanHost.includes(']:')) {
      // Extract IPv6 from [ipv6]:port format
      cleanHost = cleanHost.substring(1, cleanHost.lastIndexOf(']:'));
    } else if (cleanHost.startsWith('[') && cleanHost.endsWith(']')) {
      // Extract IPv6 from [ipv6] format
      cleanHost = cleanHost.substring(1, cleanHost.length - 1);
    } else if (cleanHost.includes(':')) {
      // Check if this is an IPv6 address (contains multiple colons) or IPv4/hostname with port
      const colonCount = (cleanHost.match(/:/g) || []).length;
      if (colonCount === 1) {
        // Single colon - check if it's hostname:port or ipv4:port (not IPv6)
        const parts = cleanHost.split(':');
        const hostPart = parts[0];
        const portPart = parts[1];

        // Validate that port is numeric if present
        if (portPart && !NUMERIC_PORT_REGEX.test(portPart)) {
          // Invalid port, treat as invalid host
          throw new WebFingerError('invalid host format');
        }

        // Check if the host part looks like IPv4 or hostname (not IPv6)
        if (hostPart.match(IPV4_REGEX) || // IPv4 pattern
            hostPart.match(HOSTNAME_REGEX)) { // Hostname pattern
          cleanHost = hostPart;
        }
        // Otherwise keep as is (might be short IPv6 like ::1)
      }
      // Otherwise it's IPv6, keep as is
    }

    // Check for localhost variants
    if (cleanHost === 'localhost' ||
        cleanHost === '127.0.0.1' ||
        cleanHost.match(LOCALHOST_127_REGEX) ||
        cleanHost === '::1' ||
        cleanHost === 'localhost.localdomain') {
      return true;
    }

    // Check for private IPv4 ranges (only if it looks like IPv4)
    const ipv4Match = cleanHost.match(IPV4_CAPTURE_REGEX);
    if (ipv4Match) {
      const [, aStr, bStr, cStr, dStr] = ipv4Match;
      const a = Number(aStr);
      const b = Number(bStr);
      const c = Number(cStr);
      const d = Number(dStr);

      // Note: Regex already validates 0-255 range, but we still check for NaN as defense-in-depth
      if (isNaN(a) || isNaN(b) || isNaN(c) || isNaN(d)) {
        // This should not happen with our regex, but treat as potentially dangerous
        return true;
      }

      // 10.0.0.0/8 (Private)
      if (a === 10) return true;

      // 172.16.0.0/12 (Private)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16 (Private)
      if (a === 192 && b === 168) return true;

      // 169.254.0.0/16 (Link-local)
      if (a === 169 && b === 254) return true;

      // 224.0.0.0/4 (Multicast)
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 (Reserved)
      if (a >= 240) return true;
    }

    // Check for private IPv6 ranges (only if cleanHost still contains colons after processing above)
    if (cleanHost.includes(':')) {
      // IPv6 private ranges - verify this is actually IPv6, not hostname:port that wasn't processed
      const colonCount = (cleanHost.match(/:/g) || []).length;
      if (colonCount > 1 || // Multiple colons = definitely IPv6
          (colonCount === 1 && !cleanHost.match(/^[a-zA-Z0-9.-]+:\d+$/))) { // Single colon but not hostname:port format
        if (cleanHost.match(/^(fc|fd)[0-9a-f]{2}:/i) || // Unique local addresses
            cleanHost.match(/^fe80:/i) || // Link-local
            cleanHost.match(/^ff[0-9a-f]{2}:/i)) { // Multicast
          return true;
        }
      }
    }

    return false;
  };

  /**
   * Validates and sanitizes host to prevent path injection attacks.
   *
   * Removes path components and validates hostname format to prevent:
   * - Directory traversal attacks via path injection
   * - Query parameter injection
   * - Fragment injection
   * - Invalid characters in hostnames
   *
   * @private
   * @param host - Raw host string that may contain path components
   * @returns Cleaned hostname with only valid hostname and port
   * @throws {WebFingerError} When host format is invalid or contains dangerous characters
   */
  private static validateHost(host: string): string {
    // Remove any path components - only keep hostname and port
    const hostParts = host.split('/');
    const cleanHost = hostParts[0];

    // Validate hostname format
    if (!cleanHost || cleanHost.length === 0) {
      throw new WebFingerError('invalid host format');
    }

    // Check for invalid characters that could indicate injection
    if (cleanHost.includes('?') || cleanHost.includes('#') || cleanHost.includes(' ')) {
      throw new WebFingerError('invalid characters in host');
    }

    return cleanHost;
  };

  // processes JRD object as if it's a WebFinger response object
  // looks for known properties and adds them to profile data struct.
  private static async processJRD(URL: string, JRDstring: string): Promise<WebFingerResult> {
    const parsedJRD: JRD = JSON.parse(JRDstring);
    if ((typeof parsedJRD !== 'object') ||
        (typeof parsedJRD.links !== 'object')) {
      if (typeof parsedJRD.error !== 'undefined') {
        throw new WebFingerError(parsedJRD.error)
      } else {
        throw new WebFingerError('unknown response from server');
      }
    }

    const result: WebFingerResult = {  // WebFinger JRD - object, json, and our own indexing
      object: parsedJRD,
      idx: {
        properties: {
          'name': undefined
        },
        links: JSON.parse(JSON.stringify(LINK_PROPERTIES))
      }
    };

    // JRD links
    const links = Array.isArray(parsedJRD.links) ? parsedJRD.links : [];

    // process JRD links
    links.map(function (link: Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(LINK_URI_MAPS, String(link.rel))) {
        const mappedKey = LINK_URI_MAPS[String(link.rel) as keyof typeof LINK_URI_MAPS];
        if (result.idx.links[mappedKey]) {
          const entry: LinkObject = {
            href: String(link.href || ''),
            rel: String(link.rel || '')
          };
          Object.keys(link).map(function (item) {
            entry[item] = String(link[item]);
          });
          result.idx.links[mappedKey].push(entry);
        }
      }
    });

    // process properties
    const props = parsedJRD.properties || {};
    for (const key in props) {
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        if (key === 'http://packetizer.com/ns/name') {
          result.idx.properties.name = props[key];
        }
      }
    }

    return result;
  };

  /**
   * Resolves a hostname to IP addresses and validates they are not private addresses.
   *
   * This prevents DNS-based SSRF attacks where public domains resolve to private
   * IP addresses (e.g., yoogle.com -> 127.0.0.1). Only performs DNS resolution
   * in Node.js/Bun environments where the dns module is available.
   *
   * @private
   * @param hostname - The hostname to resolve (without port)
   * @returns Promise<void> - Resolves if all IPs are public, throws if any private IPs found
   * @throws {WebFingerError} When hostname resolves to private/internal addresses
   */

  private async validateDNSResolution(hostname: string): Promise<void> {
    // Skip DNS resolution for IP addresses (already validated by isPrivateAddress)
    if (hostname.match(IPV4_REGEX) ||
        hostname.includes(':') || // IPv6 addresses contain colons
        hostname === 'localhost') {
      return;
    }

    // Perform DNS resolution if in Node.js/Bun environment
    const isNodeJS = typeof process !== 'undefined' && process.versions?.node;

    if (isNodeJS) {
      try {
        // Dynamic import for Node.js dns module (not available in browsers)
        // Use eval to prevent bundlers from trying to resolve this import
        const dnsImport = eval('import("dns")');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dns = await dnsImport.then((m: any) => m.promises).catch(() => null);

        if (dns) {
          try {
            // Resolve both A and AAAA records
            const [ipv4Results, ipv6Results] = await Promise.allSettled([
              dns.resolve4(hostname).catch(() => []),
              dns.resolve6(hostname).catch(() => [])
            ]);

            const ipv4Addresses = ipv4Results.status === 'fulfilled' ? ipv4Results.value : [];
            const ipv6Addresses = ipv6Results.status === 'fulfilled' ? ipv6Results.value : [];

            // Check all resolved IP addresses
            for (const ip of [...ipv4Addresses, ...ipv6Addresses]) {
              if (WebFinger.isPrivateAddress(ip)) {
                throw new WebFingerError(`hostname ${hostname} resolves to private address ${ip}`);
              }
            }
          } catch (error) {
            if (error instanceof WebFingerError) {
              throw error;
            }
            // DNS resolution failed - this might be a legitimate DNS error
            // We'll allow it to proceed as blocking all DNS failures would be too restrictive
          }
        }
      } catch (outerError) {
        // Re-throw WebFingerErrors (security errors should not be swallowed)
        if (outerError instanceof WebFingerError) {
          throw outerError;
        }
        // DNS module not available or import failed.
        // Already have blacklist protection above
      }
    }
  }

  /**
   * Performs a WebFinger lookup for the given address with comprehensive SSRF protection.
   *
   * This method includes comprehensive security measures:
   * - Blocks private/internal IP addresses by default
   * - Validates host format to prevent path injection
   * - Validates DNS resolution to block domains that resolve to private IPs
   * - Validates redirect destinations to prevent redirect-based SSRF attacks
   * - Follows ActivityPub security guidelines
   * - Limits redirect chains to prevent redirect loops
   *
   * @param address - Email-like address (user@domain.com) or full URI to look up
   * @returns Promise resolving to WebFinger result with indexed links and properties
   * @throws {WebFingerError} When lookup fails, address is invalid, or SSRF protection blocks the request
   *
   * @example
   * ```typescript
   * try {
   *   const result = await webfinger.lookup('nick@silverbucket.net');
   *   console.log('Name:', result.idx.properties.name);
   *   console.log('Avatar:', result.idx.links.avatar?.[0]?.href);
   * } catch (error) {
   *   console.error('Lookup failed:', error.message);
   * }
   * ```
   *
   * @example Security - Blocked addresses and redirects
   * ```typescript
   * // These will throw WebFingerError due to SSRF protection:
   * await webfinger.lookup('user@localhost');     // Direct access blocked
   * await webfinger.lookup('user@127.0.0.1');    // Direct access blocked
   * await webfinger.lookup('user@192.168.1.1');  // Direct access blocked
   * // Domains that resolve to private IPs are blocked via DNS resolution (Node.js/Bun)
   * // Redirects to private addresses are also blocked automatically
   * ```
   */
  async lookup(address: string): Promise<WebFingerResult> {
    if (!address) {
      throw new WebFingerError('address is required');
    }

    let host = '';
    if (address.indexOf('://') > -1) {
      // other uri format
      const parts = address.replace(/ /g, '').split('/');
      if (parts.length < 3) {
        throw new WebFingerError('invalid URI format');
      }
      host = parts[2];
    } else {
      // useraddress
      const parts = address.replace(/ /g, '').split('@');
      if (parts.length !== 2 || !parts[1]) {
        throw new WebFingerError('invalid useraddress format');
      }
      host = parts[1];
    }

    if (!host) {
      throw new WebFingerError('could not determine host from address');
    }

    // Security: Validate and sanitize the host
    host = WebFinger.validateHost(host);

    // Security: Check for private/internal addresses to prevent SSRF
    if (!this.config.allow_private_addresses && WebFinger.isPrivateAddress(host)) {
      throw new WebFingerError('private or internal addresses are not allowed');
    }

    // Security: Additional DNS resolution validation for domains that might resolve to private IPs
    if (!this.config.allow_private_addresses) {
      // Extract hostname without port for DNS validation
      const hostname = host.includes(':') ? host.split(':')[0] : host;
      await this.validateDNSResolution(hostname);
    }
    let uri_index = 0;      // track which URIS we've tried already
    let protocol = 'https'; // we use https by default

    if (WebFinger.isLocalhost(host)) {
      protocol = 'http';
    }

    const __buildURL = () => {
      let uri = '';
      if (!address.split('://')[1]) {
        // the URI has not been defined, default to acct
        uri = 'acct:';
      }
      return protocol + '://' + host + '/.well-known/' +
          URIS[uri_index] + '?resource=' + uri + address;
    }

    // control flow for failures, what to do in various cases, etc.
    const  __fallbackChecks = async (err: Error)=>  {
      if ((this.config.uri_fallback) && (host !== 'webfist.org') && (uri_index !== URIS.length - 1)) { // we have uris left to try
        uri_index = uri_index + 1;
        return __call();
      } else if ((!this.config.tls_only) && (protocol === 'https')) { // try normal http
        uri_index = 0;
        protocol = 'http';
        return __call();
      } else if ((this.config.webfist_fallback) && (host !== 'webfist.org')) { // webfist attempt (DEPRECATED)
        console.warn('⚠️  WebFinger: Using deprecated WebFist fallback. WebFist service is discontinued and this feature will be removed in v3.0.0.');
        uri_index = 0;
        protocol = 'http';
        host = 'webfist.org';
        // webfist will
        // 1. make a query to the webfist server for the users account
        // 2. from the response, get a link to the actual WebFinger json data
        //    (stored somewhere in control of the user)
        // 3. make a request to that url and get the json
        // 4. process it like a normal WebFinger response
        const URL = __buildURL();
        const data = await this.fetchJRD(URL); // get link to users JRD
        const result = await WebFinger.processJRD(URL, data)
        if (typeof result.idx.links.webfist === 'object') {
          const JRD = await this.fetchJRD(result.idx.links.webfist[0].href);
          return await WebFinger.processJRD(URL, JRD);
        }
      } else {
        throw err instanceof Error ? err : new WebFingerError(String(err))
      }
    }

    const __call = async (): Promise<WebFingerResult> => {
      // make request
      const URL = __buildURL();
      const JRD = await this.fetchJRD(URL).catch(__fallbackChecks);
      if (typeof JRD === "string") {
        return WebFinger.processJRD(URL, JRD);
      } else {
        throw new WebFingerError("unknown error");
      }
    }

    return __call();
  };

  /**
   * Looks up a specific link relation for the given address.
   *
   * @param address - Email-like address (user@domain.com) or full URI
   * @param rel - Link relation type (e.g., 'avatar', 'blog', 'remotestorage')
   * @returns Promise resolving to the first matching link object
   * @throws {WebFingerError} When lookup fails
   * @throws {Error} When no links found for the specified relation
   *
   * @example
   * ```typescript
   * try {
   *   const storage = await webfinger.lookupLink('user@example.com', 'remotestorage');
   *   console.log('Storage endpoint:', storage.href);
   * } catch (error) {
   *   console.log('No RemoteStorage found');
   * }
   * ```
   */
  async lookupLink(address: string, rel: string): Promise<LinkObject> {
    if (Object.prototype.hasOwnProperty.call(LINK_PROPERTIES, rel)) {
      const p: WebFingerResult = await this.lookup(address);
      const links = p.idx.links[rel];
      if (links.length === 0) {
        return Promise.reject('no links found with rel="' + rel + '"');
      } else {
        return Promise.resolve(links[0]);
      }
    } else {
      return Promise.reject('unsupported rel ' + rel);
    }
  };
}
