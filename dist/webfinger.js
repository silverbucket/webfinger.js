(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    // CommonJS/Node.js environment
    const result = factory();
    module.exports = result;
    module.exports.default = result;
  } else if (typeof define === 'function' && define.amd) {
    // AMD environment
    define([], factory);
  } else {
    // Browser environment
    root.WebFinger = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
'use strict';
// webfinger.js v3.0.4

// src/webfinger.ts
/*!
 * webfinger.js
 *   http://github.com/silverbucket/webfinger.js
 *
 * Developed and Maintained by:
 *   Nick Jennings <nick@silverbucket.net>
 *
 * webfinger.js is released under the MIT License (see LICENSE).
 *
 * You are free to use, modify, and distribute this software under the terms
 * of the MIT License. All copyright information must remain.
 *
 */
var LINK_URI_MAPS = {
  "http://webfinger.net/rel/avatar": "avatar",
  remotestorage: "remotestorage",
  "http://tools.ietf.org/id/draft-dejong-remotestorage": "remotestorage",
  remoteStorage: "remotestorage",
  "http://www.packetizer.com/rel/share": "share",
  "http://webfinger.net/rel/profile-page": "profile",
  me: "profile",
  vcard: "vcard",
  blog: "blog",
  "http://packetizer.com/rel/blog": "blog",
  "http://schemas.google.com/g/2010#updates-from": "updates",
  "https://camlistore.org/rel/server": "camilstore"
};
var LINK_PROPERTIES = {
  avatar: [],
  remotestorage: [],
  blog: [],
  vcard: [],
  updates: [],
  share: [],
  profile: [],
  camlistore: []
};
var URIS = ["webfinger", "host-meta", "host-meta.json"];
var IPV4_OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)";
var IPV4_REGEX = new RegExp(`^(?:${IPV4_OCTET}\\.){3}${IPV4_OCTET}$`);
var IPV4_CAPTURE_REGEX = new RegExp(`^(${IPV4_OCTET})\\.(${IPV4_OCTET})\\.(${IPV4_OCTET})\\.(${IPV4_OCTET})$`);
var LOCALHOST_REGEX = /^localhost(?:\.localdomain)?(?::\d+)?$/;
var NUMERIC_PORT_REGEX = /^\d+$/;
var HOSTNAME_REGEX = /^[a-zA-Z0-9.-]+$/;
var LOCALHOST_127_REGEX = /^127\.(?:\d{1,3}\.){2}\d{1,3}$/;

class WebFingerError extends Error {
  status;
  constructor(message, status) {
    super(message);
    this.name = "WebFingerError";
    this.status = status;
  }
}

class WebFinger {
  static default;
  config;
  constructor(cfg = {}) {
    this.config = {
      tls_only: typeof cfg.tls_only !== "undefined" ? cfg.tls_only : true,
      uri_fallback: typeof cfg.uri_fallback !== "undefined" ? cfg.uri_fallback : false,
      request_timeout: typeof cfg.request_timeout !== "undefined" ? cfg.request_timeout : 1e4,
      allow_private_addresses: typeof cfg.allow_private_addresses !== "undefined" ? cfg.allow_private_addresses : false
    };
  }
  async fetchJRD(url, redirectCount = 0) {
    if (redirectCount > 3) {
      throw new WebFingerError("too many redirects");
    }
    const abortController = new AbortController;
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, this.config.request_timeout);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/jrd+json, application/json" },
        redirect: "manual",
        signal: abortController.signal
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new WebFingerError("redirect without location header");
        }
        let redirectUrl;
        try {
          redirectUrl = new URL(location, url);
        } catch {
          throw new WebFingerError("invalid redirect URL");
        }
        try {
          await this.resolveAndValidateHost(redirectUrl.host);
        } catch (err) {
          if (err instanceof WebFingerError) {
            throw new WebFingerError("redirect to private or internal address blocked");
          }
          throw err;
        }
        clearTimeout(timeoutId);
        return this.fetchJRD(redirectUrl.toString(), redirectCount + 1);
      }
      if (response.status === 404) {
        throw new WebFingerError("resource not found", 404);
      } else if (!response.ok) {
        throw new WebFingerError("error during request", response.status);
      }
      const contentType = response.headers.get("content-type") || "";
      const lowerContentType = contentType.toLowerCase();
      const mainType = lowerContentType.split(";")[0].trim();
      if (mainType === "application/jrd+json") {} else if (mainType === "application/json") {
        console.debug(`WebFinger: Server uses "application/json" instead of RFC 7033 recommended "application/jrd+json".`);
      } else {
        console.warn(`WebFinger: Server returned unexpected content-type "${contentType}". ` + 'Expected "application/jrd+json" per RFC 7033.');
      }
      const responseText = await response.text();
      if (WebFinger.isValidJSON(responseText)) {
        return responseText;
      } else {
        throw new WebFingerError("invalid json");
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new WebFingerError("request timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  static isValidJSON(str) {
    try {
      JSON.parse(str);
    } catch {
      return false;
    }
    return true;
  }
  static isLocalhost(host) {
    return LOCALHOST_REGEX.test(host);
  }
  static isPrivateAddress(host) {
    let cleanHost = host;
    if (cleanHost.startsWith("[") && cleanHost.includes("]:")) {
      cleanHost = cleanHost.substring(1, cleanHost.lastIndexOf("]:"));
    } else if (cleanHost.startsWith("[") && cleanHost.endsWith("]")) {
      cleanHost = cleanHost.substring(1, cleanHost.length - 1);
    } else if (cleanHost.includes(":")) {
      const colonCount = (cleanHost.match(/:/g) || []).length;
      if (colonCount === 1) {
        const parts = cleanHost.split(":");
        const hostPart = parts[0];
        const portPart = parts[1];
        if (portPart && !NUMERIC_PORT_REGEX.test(portPart)) {
          throw new WebFingerError("invalid host format");
        }
        if (hostPart.match(IPV4_REGEX) || hostPart.match(HOSTNAME_REGEX)) {
          cleanHost = hostPart;
        }
      }
    }
    if (cleanHost === "localhost" || cleanHost === "127.0.0.1" || cleanHost.match(LOCALHOST_127_REGEX) || cleanHost === "::1" || cleanHost === "localhost.localdomain") {
      return true;
    }
    const ipv4Match = cleanHost.match(IPV4_CAPTURE_REGEX);
    if (ipv4Match) {
      const [, aStr, bStr, cStr, dStr] = ipv4Match;
      const a = Number(aStr);
      const b = Number(bStr);
      const c = Number(cStr);
      const d = Number(dStr);
      if (isNaN(a) || isNaN(b) || isNaN(c) || isNaN(d)) {
        return true;
      }
      if (a === 10)
        return true;
      if (a === 172 && b >= 16 && b <= 31)
        return true;
      if (a === 192 && b === 168)
        return true;
      if (a === 169 && b === 254)
        return true;
      if (a >= 224 && a <= 239)
        return true;
      if (a >= 240)
        return true;
    }
    if (cleanHost.includes(":")) {
      const colonCount = (cleanHost.match(/:/g) || []).length;
      if (colonCount > 1 || colonCount === 1 && !cleanHost.match(/^[a-zA-Z0-9.-]+:\d+$/)) {
        if (cleanHost.match(/^(fc|fd)[0-9a-f]{2}:/i) || cleanHost.match(/^fe80:/i) || cleanHost.match(/^ff[0-9a-f]{2}:/i)) {
          return true;
        }
      }
    }
    return false;
  }
  static getExplicitPort(host) {
    if (host.startsWith("[")) {
      const ipv6PortSeparator = host.lastIndexOf("]:");
      if (ipv6PortSeparator !== -1) {
        const port = host.substring(ipv6PortSeparator + 2);
        if (!NUMERIC_PORT_REGEX.test(port)) {
          throw new WebFingerError("invalid host format");
        }
        return port;
      }
      return;
    }
    const colonCount = (host.match(/:/g) || []).length;
    if (colonCount === 1) {
      const [, port = ""] = host.split(":");
      if (!port || !NUMERIC_PORT_REGEX.test(port)) {
        throw new WebFingerError("invalid host format");
      }
      return port;
    }
    return;
  }
  static parseAddress(address) {
    const cleaned = address.replace(/ /g, "");
    if (cleaned.includes("://")) {
      let url;
      try {
        url = new URL(cleaned);
      } catch {
        throw new WebFingerError("invalid URI format");
      }
      if (!url.hostname) {
        throw new WebFingerError("could not determine host from address");
      }
      return { host: url.host };
    }
    const parts = cleaned.split("@");
    if (parts.length !== 2 || !parts[1]) {
      throw new WebFingerError("invalid useraddress format");
    }
    return { host: parts[1] };
  }
  async resolveAndValidateHost(rawHost) {
    const normalized = WebFinger.normalizeHost(rawHost);
    if (!this.config.allow_private_addresses) {
      if (WebFinger.isPrivateAddress(normalized.host)) {
        throw new WebFingerError("private or internal addresses are not allowed");
      }
      await this.validateDNSResolution(normalized.hostname);
    }
    return normalized;
  }
  static normalizeHost(host) {
    const hostParts = host.split("/");
    const cleanHost = hostParts[0];
    if (!cleanHost || cleanHost.length === 0) {
      throw new WebFingerError("invalid host format");
    }
    if (/[?# @]/.test(cleanHost)) {
      throw new WebFingerError("invalid characters in host");
    }
    const explicitPort = WebFinger.getExplicitPort(cleanHost);
    let parsedHost;
    try {
      parsedHost = new URL(`http://${cleanHost}`);
    } catch {
      throw new WebFingerError("invalid host format");
    }
    const hostname2 = parsedHost.hostname;
    const normalizedHost = explicitPort ? `${hostname2}:${explicitPort}` : parsedHost.host || hostname2;
    return {
      host: normalizedHost,
      hostname: hostname2
    };
  }
  static async processJRD(URL2, JRDstring) {
    const parsedJRD = JSON.parse(JRDstring);
    if (typeof parsedJRD !== "object" || typeof parsedJRD.links !== "object") {
      if (typeof parsedJRD.error !== "undefined") {
        throw new WebFingerError(parsedJRD.error);
      } else {
        throw new WebFingerError("unknown response from server");
      }
    }
    const result = {
      object: parsedJRD,
      idx: {
        properties: {
          name: undefined
        },
        links: JSON.parse(JSON.stringify(LINK_PROPERTIES))
      }
    };
    const links = Array.isArray(parsedJRD.links) ? parsedJRD.links : [];
    links.map(function(link) {
      if (Object.prototype.hasOwnProperty.call(LINK_URI_MAPS, String(link.rel))) {
        const mappedKey = LINK_URI_MAPS[String(link.rel)];
        if (result.idx.links[mappedKey]) {
          const entry = {
            href: String(link.href || ""),
            rel: String(link.rel || "")
          };
          Object.keys(link).map(function(item) {
            if (typeof link[item] === "object" && link[item] !== null) {
              entry[item] = link[item];
            } else {
              entry[item] = String(link[item]);
            }
          });
          result.idx.links[mappedKey].push(entry);
        }
      }
    });
    const props = parsedJRD.properties || {};
    for (const key in props) {
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        if (key === "http://packetizer.com/ns/name") {
          result.idx.properties.name = props[key];
        }
      }
    }
    return result;
  }
  async validateDNSResolution(hostname) {
    if (hostname.match(IPV4_REGEX) || hostname.includes(":") || hostname === "localhost") {
      return;
    }
    const isNodeJS = typeof process !== "undefined" && process.versions?.node;
    if (isNodeJS) {
      try {
        const dnsImport = eval('import("dns")');
        const dns = await dnsImport.then((m) => m.promises).catch(() => null);
        if (dns) {
          try {
            const [ipv4Results, ipv6Results] = await Promise.allSettled([
              dns.resolve4(hostname).catch(() => []),
              dns.resolve6(hostname).catch(() => [])
            ]);
            const ipv4Addresses = ipv4Results.status === "fulfilled" ? ipv4Results.value : [];
            const ipv6Addresses = ipv6Results.status === "fulfilled" ? ipv6Results.value : [];
            for (const ip of [...ipv4Addresses, ...ipv6Addresses]) {
              if (WebFinger.isPrivateAddress(ip)) {
                throw new WebFingerError(`hostname ${hostname} resolves to private address ${ip}`);
              }
            }
          } catch (error) {
            if (error instanceof WebFingerError) {
              throw error;
            }
          }
        }
      } catch (outerError) {
        if (outerError instanceof WebFingerError) {
          throw outerError;
        }
      }
    }
  }
  async lookup(address) {
    if (!address) {
      throw new WebFingerError("address is required");
    }
    const { host: rawHost } = WebFinger.parseAddress(address);
    const { host } = await this.resolveAndValidateHost(rawHost);
    let uri_index = 0;
    let protocol = "https";
    if (WebFinger.isLocalhost(host)) {
      protocol = "http";
    }
    const __buildURL = () => {
      let uri = "";
      if (!address.split("://")[1]) {
        uri = "acct:";
      }
      return protocol + "://" + host + "/.well-known/" + URIS[uri_index] + "?resource=" + uri + address;
    };
    const __fallbackChecks = async (err) => {
      if (this.config.uri_fallback && uri_index !== URIS.length - 1) {
        uri_index = uri_index + 1;
        return __call();
      } else if (!this.config.tls_only && protocol === "https") {
        uri_index = 0;
        protocol = "http";
        return __call();
      } else {
        throw err instanceof Error ? err : new WebFingerError(String(err));
      }
    };
    const __call = async () => {
      const URL2 = __buildURL();
      try {
        const JRD = await this.fetchJRD(URL2);
        return WebFinger.processJRD(URL2, JRD);
      } catch (err) {
        return await __fallbackChecks(err);
      }
    };
    return __call();
  }
  async lookupLink(address, rel) {
    if (Object.prototype.hasOwnProperty.call(LINK_PROPERTIES, rel)) {
      const p = await this.lookup(address);
      const links = p.idx.links[rel];
      if (links.length === 0) {
        return Promise.reject('no links found with rel="' + rel + '"');
      } else {
        return Promise.resolve(links[0]);
      }
    } else {
      return Promise.reject("unsupported rel " + rel);
    }
  }
}
WebFinger.default = WebFinger;

// Return the WebFinger class (defined above)
return WebFinger;

}));