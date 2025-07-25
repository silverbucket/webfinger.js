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
type WebFingerConfig = {
    tls_only: boolean;
    webfist_fallback: boolean;
    uri_fallback: boolean;
    request_timeout: number;
};
type JRD = {
    links: Array<Record<string, unknown>>;
    properties?: Record<string, unknown>;
    error?: string;
};
type ResultObject = {
    object: JRD;
    idx: {
        links: {
            [key: string]: Array<Entry>;
        };
        properties: Record<string, unknown>;
    };
};
type Entry = {
    [key: string]: string;
};
/**
 * Class: WebFinger
 *
 * WebFinger constructor
 *
 * Returns:
 *
 *   return WebFinger object
 */
export default class WebFinger {
    private config;
    constructor(cfg?: Partial<WebFingerConfig>);
    private fetchJRD;
    private static isValidJSON;
    private static isLocalhost;
    private static processJRD;
    lookup(address: string): Promise<ResultObject>;
    lookupLink(address: string, rel: string): Promise<Entry>;
}
export {};
//# sourceMappingURL=webfinger.d.ts.map