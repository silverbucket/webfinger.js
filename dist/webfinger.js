"use strict";
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
console.log('webfinger.js v2.8.0 loaded');
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
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
class WebFingerError extends Error {
    constructor(message, status) {
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
class WebFinger {
    constructor(cfg = {}) {
        this.config = {
            tls_only: (typeof cfg.tls_only !== 'undefined') ? cfg.tls_only : true,
            webfist_fallback: (typeof cfg.webfist_fallback !== 'undefined') ? cfg.webfist_fallback : false,
            uri_fallback: (typeof cfg.uri_fallback !== 'undefined') ? cfg.uri_fallback : false,
            request_timeout: (typeof cfg.request_timeout !== 'undefined') ? cfg.request_timeout : 10000
        };
    }
    // make an HTTP request and look for JRD response, fails if request fails
    // or response not json.
    fetchJRD(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(url, {
                headers: { 'Accept': 'application/jrd+json, application/json' },
            });
            if (response.status === 404) {
                throw new WebFingerError('resource not found', 404);
            }
            else if (!response.ok) { // other HTTP status (redirects are handled transparently)
                throw new WebFingerError('error during request', response.status);
            }
            const responseText = yield response.text();
            if (WebFinger.isValidJSON(responseText)) {
                return responseText;
            }
            else {
                throw new WebFingerError('invalid json');
            }
        });
    }
    ;
    static isValidJSON(str) {
        try {
            JSON.parse(str);
        }
        catch (_a) {
            return false;
        }
        return true;
    }
    ;
    static isLocalhost(host) {
        const local = /^localhost(\.localdomain)?(:[0-9]+)?$/;
        return local.test(host);
    }
    ;
    // processes JRD object as if it's a WebFinger response object
    // looks for known properties and adds them to profile data struct.
    static processJRD(URL, JRDstring) {
        return __awaiter(this, void 0, void 0, function* () {
            const parsedJRD = JSON.parse(JRDstring);
            if ((typeof parsedJRD !== 'object') ||
                (typeof parsedJRD.links !== 'object')) {
                if (typeof parsedJRD.error !== 'undefined') {
                    throw new WebFingerError(parsedJRD.error);
                }
                else {
                    throw new WebFingerError('unknown response from server');
                }
            }
            const result = {
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
            links.map(function (link) {
                if (Object.prototype.hasOwnProperty.call(LINK_URI_MAPS, String(link.rel))) {
                    const mappedKey = LINK_URI_MAPS[String(link.rel)];
                    if (result.idx.links[mappedKey]) {
                        const entry = {};
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
        });
    }
    ;
    lookup(address) {
        return __awaiter(this, void 0, void 0, function* () {
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
            }
            else {
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
            let uri_index = 0; // track which URIS we've tried already
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
            };
            // control flow for failures, what to do in various cases, etc.
            const __fallbackChecks = (err) => __awaiter(this, void 0, void 0, function* () {
                if ((this.config.uri_fallback) && (host !== 'webfist.org') && (uri_index !== URIS.length - 1)) { // we have uris left to try
                    uri_index = uri_index + 1;
                    return __call();
                }
                else if ((!this.config.tls_only) && (protocol === 'https')) { // try normal http
                    uri_index = 0;
                    protocol = 'http';
                    return __call();
                }
                else if ((this.config.webfist_fallback) && (host !== 'webfist.org')) { // webfist attempt
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
                    const data = yield this.fetchJRD(URL); // get link to users JRD
                    const result = yield WebFinger.processJRD(URL, data);
                    if (typeof result.idx.links.webfist === 'object') {
                        const JRD = yield this.fetchJRD(result.idx.links.webfist[0].href);
                        return yield WebFinger.processJRD(URL, JRD);
                    }
                }
                else {
                    throw err instanceof Error ? err : new WebFingerError(String(err));
                }
            });
            const __call = () => __awaiter(this, void 0, void 0, function* () {
                // make request
                const URL = __buildURL();
                const JRD = yield this.fetchJRD(URL).catch(__fallbackChecks);
                if (typeof JRD === "string") {
                    return WebFinger.processJRD(URL, JRD);
                }
                else {
                    throw new WebFingerError("unknown error");
                }
            });
            return __call();
        });
    }
    ;
    lookupLink(address, rel) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Object.prototype.hasOwnProperty.call(LINK_PROPERTIES, rel)) {
                const p = yield this.lookup(address);
                const links = p.idx.links[rel];
                if (links.length === 0) {
                    return Promise.reject('no links found with rel="' + rel + '"');
                }
                else {
                    return Promise.resolve(links[0]);
                }
            }
            else {
                return Promise.reject('unsupported rel ' + rel);
            }
        });
    }
    ;
}
exports.default = WebFinger;

// Browser global export
if (typeof window !== 'undefined') {
  window.WebFinger = exports.default;
}