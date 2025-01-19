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

type WebFingerConfig = {
  tls_only: boolean,
  webfist_fallback: boolean,
  uri_fallback: boolean,
  request_timeout: number
};

type JRD = {
  links: Array<string>,
  error?: string,
}

type ResultObject = {
  object: JRD,
  idx: {
    links: {
      [key: string]: Array<Entry>
    },
    properties: any,
  }
}

type Entry = {
  [key: string]: string
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

  constructor(cfg: WebFingerConfig) {
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
      throw Error('resource not found')
    } else if (!response.ok) {   // other HTTP status (redirects are handled transparently)
      throw Error('error during request');
    }

    const responseText = await response.text();

    if (WebFinger.isValidJSON(responseText)) {
      return responseText;
    } else {
      throw Error('invalid json')
    }
  };

  private static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  };

  private static isLocalhost (host: string): boolean {
    const local = /^localhost(\.localdomain)?(\:[0-9]+)?$/;
    return local.test(host);
  };

  // processes JRD object as if it's a WebFinger response object
  // looks for known properties and adds them to profile data struct.
  private static async processJRD(URL: string, JRDstring: string): Promise<ResultObject> {
    const parsedJRD: JRD = JSON.parse(JRDstring);
    if ((typeof parsedJRD !== 'object') ||
        (typeof parsedJRD.links !== 'object')) {
      if (typeof parsedJRD.error !== 'undefined') {
        throw Error(parsedJRD.error)
      } else {
        throw Error('unknown response from server');
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
    links.map(function (link: any) {
      if (LINK_URI_MAPS.hasOwnProperty(link.rel)) {
        if (result.idx.links[LINK_URI_MAPS[link.rel]]) {
          const entry: Entry = {};
          Object.keys(link).map(function (item) {
            entry[item] = link[item];
          });
          result.idx.links[LINK_URI_MAPS[link.rel]].push(entry);
        }
      }
    });

    // process properties
    const props = JSON.parse(JRDstring).properties;
    for (const key in props) {
      if (props.hasOwnProperty(key)) {
        if (key === 'http://packetizer.com/ns/name') {
          result.idx.properties.name = props[key];
        }
      }
    }

    return result;
  };

  async lookup(address: string): Promise<ResultObject> {
    let host = '';
    if (address.indexOf('://') > -1) {
      // other uri format
      host = address.replace(/ /g, '').split('/')[2];
    } else {
      // useraddress
      host = address.replace(/ /g, '').split('@')[1];
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
    const  __fallbackChecks = async (err: any)=>  {
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
        throw new Error(err)
      }
    }

    const __call = async (): Promise<ResultObject> => {
      // make request
      const URL = __buildURL();
      const JRD = await this.fetchJRD(URL).catch(__fallbackChecks);
      if (typeof JRD === "string") {
        return WebFinger.processJRD(URL, JRD);
      } else {
        throw new Error("unknown error");
      }
    }

    return __call();
  };

  async lookupLink(address: string, rel: string): Promise<Entry> {
    if (LINK_PROPERTIES.hasOwnProperty(rel)) {
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
