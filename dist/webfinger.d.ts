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
/**
 * Configuration options for WebFinger client
 */
export type WebFingerConfig = {
    /** Use HTTPS only. When false, allows HTTP fallback for localhost. */
    tls_only: boolean;
    /** Enable host-meta and host-meta.json fallback endpoints. */
    uri_fallback: boolean;
    /**
     * @deprecated WebFist is discontinued and will be removed in v3.0.0. Use standard WebFinger discovery instead.
     * Enable WebFist fallback service for discovering WebFinger endpoints.
     */
    webfist_fallback: boolean;
    /** Request timeout in milliseconds. */
    request_timeout: number;
    /** Allow private/internal addresses (DANGEROUS - only for development). */
    allow_private_addresses: boolean;
};
/**
 * JSON Resource Descriptor - Raw WebFinger response format
 */
export type JRD = {
    subject?: string;
    links: Array<Record<string, unknown>>;
    properties?: Record<string, unknown>;
    error?: string;
};
/**
 * Complete WebFinger lookup result with processed data
 */
export type WebFingerResult = {
    object: JRD;
    idx: {
        links: {
            [key: string]: Array<LinkObject>;
        };
        properties: Record<string, unknown>;
    };
};
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
};
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
export declare class WebFingerError extends Error {
    /** HTTP status code if the error originated from an HTTP response */
    status?: number;
    /**
     * Creates a new WebFingerError instance.
     *
     * @param message - Error message describing what went wrong
     * @param status - Optional HTTP status code if applicable
     */
    constructor(message: string, status?: number);
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
    static default: typeof WebFinger;
    private config;
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
    constructor(cfg?: Partial<WebFingerConfig>);
    private fetchJRD;
    private static isValidJSON;
    /**
     * Checks if a host is localhost (used for protocol selection).
     *
     * @private
     * @param host - The hostname to check
     * @returns True if the host is a localhost variant
     */
    private static isLocalhost;
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
    private static isPrivateAddress;
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
    private static validateHost;
    private static processJRD;
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
    private validateDNSResolution;
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
    lookup(address: string): Promise<WebFingerResult>;
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
    lookupLink(address: string, rel: string): Promise<LinkObject>;
}
//# sourceMappingURL=webfinger.d.ts.map