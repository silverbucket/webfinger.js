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

console.log('webfinger.js v2.8.1 loaded');
// src/webfinger.ts
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
var LINK_URI_MAPS = {
  "http://webfist.org/spec/rel": "webfist",
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
  webfist: [],
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
      webfist_fallback: typeof cfg.webfist_fallback !== "undefined" ? cfg.webfist_fallback : false,
      request_timeout: typeof cfg.request_timeout !== "undefined" ? cfg.request_timeout : 1e4,
      allow_private_addresses: typeof cfg.allow_private_addresses !== "undefined" ? cfg.allow_private_addresses : false
    };
    if (this.config.webfist_fallback) {
      console.warn("⚠️  WebFinger: webfist_fallback is deprecated and will be removed in v3.0.0. WebFist service is discontinued. Use standard WebFinger discovery instead.");
    }
  }
  async fetchJRD(url, redirectCount = 0) {
    if (redirectCount > 3) {
      throw new WebFingerError("too many redirects");
    }
    const response = await fetch(url, {
      headers: { Accept: "application/jrd+json, application/json" },
      redirect: "manual"
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
      const redirectHost = WebFinger.validateHost(redirectUrl.hostname + (redirectUrl.port ? ":" + redirectUrl.port : ""));
      if (!this.config.allow_private_addresses && WebFinger.isPrivateAddress(redirectHost)) {
        throw new WebFingerError("redirect to private or internal address blocked");
      }
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
  static validateHost(host) {
    const hostParts = host.split("/");
    const cleanHost = hostParts[0];
    if (!cleanHost || cleanHost.length === 0) {
      throw new WebFingerError("invalid host format");
    }
    if (cleanHost.includes("?") || cleanHost.includes("#") || cleanHost.includes(" ")) {
      throw new WebFingerError("invalid characters in host");
    }
    return cleanHost;
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
            entry[item] = String(link[item]);
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
    let host = "";
    if (address.indexOf("://") > -1) {
      const parts = address.replace(/ /g, "").split("/");
      if (parts.length < 3) {
        throw new WebFingerError("invalid URI format");
      }
      host = parts[2];
    } else {
      const parts = address.replace(/ /g, "").split("@");
      if (parts.length !== 2 || !parts[1]) {
        throw new WebFingerError("invalid useraddress format");
      }
      host = parts[1];
    }
    if (!host) {
      throw new WebFingerError("could not determine host from address");
    }
    host = WebFinger.validateHost(host);
    if (!this.config.allow_private_addresses && WebFinger.isPrivateAddress(host)) {
      throw new WebFingerError("private or internal addresses are not allowed");
    }
    if (!this.config.allow_private_addresses) {
      const hostname2 = host.includes(":") ? host.split(":")[0] : host;
      await this.validateDNSResolution(hostname2);
    }
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
      if (this.config.uri_fallback && host !== "webfist.org" && uri_index !== URIS.length - 1) {
        uri_index = uri_index + 1;
        return __call();
      } else if (!this.config.tls_only && protocol === "https") {
        uri_index = 0;
        protocol = "http";
        return __call();
      } else if (this.config.webfist_fallback && host !== "webfist.org") {
        console.warn("⚠️  WebFinger: Using deprecated WebFist fallback. WebFist service is discontinued and this feature will be removed in v3.0.0.");
        uri_index = 0;
        protocol = "http";
        host = "webfist.org";
        const URL2 = __buildURL();
        const data = await this.fetchJRD(URL2);
        const result = await WebFinger.processJRD(URL2, data);
        if (typeof result.idx.links.webfist === "object") {
          const JRD = await this.fetchJRD(result.idx.links.webfist[0].href);
          return await WebFinger.processJRD(URL2, JRD);
        }
      } else {
        throw err instanceof Error ? err : new WebFingerError(String(err));
      }
    };
    const __call = async () => {
      const URL2 = __buildURL();
      const JRD = await this.fetchJRD(URL2).catch(__fallbackChecks);
      if (typeof JRD === "string") {
        return WebFinger.processJRD(URL2, JRD);
      } else {
        throw new WebFingerError("unknown error");
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