(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.WebFinger = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

console.log('webfinger.js v2.8.0 loaded');
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

class WebFingerError extends Error {
  status;
  constructor(message, status) {
    super(message);
    this.name = "WebFingerError";
    this.status = status;
  }
}

class WebFinger {
  config;
  constructor(cfg = {}) {
    this.config = {
      tls_only: typeof cfg.tls_only !== "undefined" ? cfg.tls_only : true,
      webfist_fallback: typeof cfg.webfist_fallback !== "undefined" ? cfg.webfist_fallback : false,
      uri_fallback: typeof cfg.uri_fallback !== "undefined" ? cfg.uri_fallback : false,
      request_timeout: typeof cfg.request_timeout !== "undefined" ? cfg.request_timeout : 1e4
    };
  }
  async fetchJRD(url) {
    const response = await fetch(url, {
      headers: { Accept: "application/jrd+json, application/json" }
    });
    if (response.status === 404) {
      throw new WebFingerError("resource not found", 404);
    } else if (!response.ok) {
      throw new WebFingerError("error during request", response.status);
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
    const local = /^localhost(\.localdomain)?(:[0-9]+)?$/;
    return local.test(host);
  }
  static async processJRD(URL, JRDstring) {
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
          const entry = {};
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
        uri_index = 0;
        protocol = "http";
        host = "webfist.org";
        const URL = __buildURL();
        const data = await this.fetchJRD(URL);
        const result = await WebFinger.processJRD(URL, data);
        if (typeof result.idx.links.webfist === "object") {
          const JRD = await this.fetchJRD(result.idx.links.webfist[0].href);
          return await WebFinger.processJRD(URL, JRD);
        }
      } else {
        throw err instanceof Error ? err : new WebFingerError(String(err));
      }
    };
    const __call = async () => {
      const URL = __buildURL();
      const JRD = await this.fetchJRD(URL).catch(__fallbackChecks);
      if (typeof JRD === "string") {
        return WebFinger.processJRD(URL, JRD);
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


return WebFinger;

}));