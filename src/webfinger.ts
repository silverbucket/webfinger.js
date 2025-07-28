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

/**
 * Configuration options for WebFinger client
 */
export type WebFingerConfig = {
  /** Use HTTPS only. When false, allows HTTP fallback for localhost. */
  tls_only: boolean,
  /** Enable WebFist fallback service for discovering WebFinger endpoints. */
  webfist_fallback: boolean,
  /** Enable host-meta and host-meta.json fallback endpoints. */
  uri_fallback: boolean,
  /** Request timeout in milliseconds. */
  request_timeout: number
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
 * Custom error class for WebFinger-specific errors
 */
export class WebFingerError extends Error {
  status?: number;
  
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
 *   webfist_fallback: true,
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
   * @param cfg.webfist_fallback - Enable WebFist fallback (default: false)
   * @param cfg.uri_fallback - Enable host-meta fallback (default: false) 
   * @param cfg.request_timeout - Request timeout in milliseconds (default: 10000)
   */
  constructor(cfg: Partial<WebFingerConfig> = {}) {
    this.config = {
      tls_only: (typeof cfg.tls_only !== 'undefined') ? cfg.tls_only : true,
      webfist_fallback: (typeof cfg.webfist_fallback !== 'undefined') ? cfg.webfist_fallback : false,
      uri_fallback: (typeof cfg.uri_fallback !== 'undefined') ? cfg.uri_fallback : false,
      request_timeout: (typeof cfg.request_timeout !== 'undefined') ? cfg.request_timeout : 10000
    };
  }

  // make an HTTP request and look for JRD response, fails if request fails
  // or response not json.
  private async fetchJRD(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {'Accept': 'application/jrd+json, application/json'},
    });

    if (response.status === 404) {
      throw new WebFingerError('resource not found', 404)
    } else if (!response.ok) {   // other HTTP status (redirects are handled transparently)
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

  private static isLocalhost (host: string): boolean {
    const local = /^localhost(\.localdomain)?(:[0-9]+)?$/;
    return local.test(host);
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
      } else if ((this.config.webfist_fallback) && (host !== 'webfist.org')) { // webfist attempt
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
