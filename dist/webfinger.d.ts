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
    /** Enable WebFist fallback service for discovering WebFinger endpoints. */
    webfist_fallback: boolean;
    /** Enable host-meta and host-meta.json fallback endpoints. */
    uri_fallback: boolean;
    /** Request timeout in milliseconds. */
    request_timeout: number;
};
/**
 * JSON Resource Descriptor - Raw WebFinger response format
 */
export type JRD = {
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
 * Custom error class for WebFinger-specific errors
 */
export declare class WebFingerError extends Error {
    status?: number;
    constructor(message: string, status?: number);
}
/**
 * WebFinger client for discovering user information across domains.
 *
 * @example
 * ```typescript
 * const webfinger = new WebFinger({
 *   webfist_fallback: true,
 *   tls_only: true
 * });
 *
 * const result = await webfinger.lookup('user@domain.com');
 * console.log(result.idx.properties.name);
 * ```
 */
export default class WebFinger {
    private config;
    /**
     * Creates a new WebFinger client instance.
     *
     * @param cfg - Configuration options for the WebFinger client
     * @param cfg.tls_only - Use HTTPS only (default: true)
     * @param cfg.webfist_fallback - Enable WebFist fallback (default: false)
     * @param cfg.uri_fallback - Enable host-meta fallback (default: false)
     * @param cfg.request_timeout - Request timeout in milliseconds (default: 10000)
     */
    constructor(cfg?: Partial<WebFingerConfig>);
    private fetchJRD;
    private static isValidJSON;
    private static isLocalhost;
    private static processJRD;
    /**
     * Performs a WebFinger lookup for the given address.
     *
     * @param address - Email-like address (user@domain.com) or full URI to look up
     * @returns Promise resolving to WebFinger result with indexed links and properties
     * @throws {WebFingerError} When lookup fails or address is invalid
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