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

type WebFingerConfig = {
  tls_only: boolean,
  webfist_fallback: boolean,
  uri_fallback: boolean,
  request_timeout: number,
  allow_private_addresses: boolean
};

type JRD = {
  links: Array<Record<string, unknown>>,
  properties?: Record<string, unknown>,
  error?: string,
}

type ResultObject = {
  object: JRD,
  idx: {
    links: {
      [key: string]: Array<Entry>
    },
    properties: Record<string, unknown>,
  }
}

type Entry = {
  [key: string]: string
}

class WebFingerError extends Error {
  status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'WebFingerError';
    this.status = status;
  }
}

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
  private config: WebFingerConfig;

  constructor(cfg: Partial<WebFingerConfig> = {}) {
    this.config = {
      tls_only: (typeof cfg.tls_only !== 'undefined') ? cfg.tls_only : true,
      webfist_fallback: (typeof cfg.webfist_fallback !== 'undefined') ? cfg.webfist_fallback : false,
      uri_fallback: (typeof cfg.uri_fallback !== 'undefined') ? cfg.uri_fallback : false,
      request_timeout: (typeof cfg.request_timeout !== 'undefined') ? cfg.request_timeout : 10000,
      allow_private_addresses: (typeof cfg.allow_private_addresses !== 'undefined') ? cfg.allow_private_addresses : false
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
    return LOCALHOST_REGEX.test(host);
  };

  // Comprehensive security check for private/internal addresses
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

  // Validate and sanitize host to prevent path injection
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
  private static async processJRD(URL: string, JRDstring: string): Promise<ResultObject> {
    const parsedJRD: JRD = JSON.parse(JRDstring);
    if ((typeof parsedJRD !== 'object') ||
        (typeof parsedJRD.links !== 'object')) {
      if (typeof parsedJRD.error !== 'undefined') {
        throw new WebFingerError(parsedJRD.error)
      } else {
        throw new WebFingerError('unknown response from server');
      }
    }

    const result: ResultObject = {  // WebFinger JRD - object, json, and our own indexing
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
          const entry: Entry = {};
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

  async lookup(address: string): Promise<ResultObject> {
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

    const __call = async (): Promise<ResultObject> => {
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

  async lookupLink(address: string, rel: string): Promise<Entry> {
    if (Object.prototype.hasOwnProperty.call(LINK_PROPERTIES, rel)) {
      const p: ResultObject = await this.lookup(address);
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
