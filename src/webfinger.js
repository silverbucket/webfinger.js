/* global define */
/*!
 * webfinger.js
 *   version 2.3.2
 *   http://github.com/silverbucket/webfinger.js
 *
 * Developed and Maintained by:
 *   Nick Jennings <nick@silverbucket.net> 2012 - 2014
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

if (typeof XMLHttpRequest === 'undefined') {
  XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
}

(function (undefined) {

  // URI to property name map
  var LINK_URI_MAPS = {
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

  var LINK_PROPERTIES = {
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
  var URIS = ['webfinger', 'host-meta', 'host-meta.json'];

  function generateErrorObject(obj) {
    obj.toString = function () {
      return this.message;
    };
    return obj;
  }

  // given a URL ensures it's HTTPS. 
  // returns false for null string or non-HTTPS URL.
  function isSecure(url) {
    if (typeof url !== 'string') {
      return false;
    }
    var parts = url.split('://');
    if (parts[0] === 'https') {
      return true;
    }
    return false;
  }

  /**
   * Function: WebFinger
   *
   * WebFinger constructor
   *
   * Returns:
   *
   *   return WebFinger object
   */
  function WebFinger(config) {
    if (typeof config !== 'object') {
      config = {};
    }

    this.config = {
      tls_only:         (typeof config.tls_only !== 'undefined') ? config.tls_only : true,
      webfist_fallback: (typeof config.webfist_fallback !== 'undefined') ? config.webfist_fallback : false,
      uri_fallback:     (typeof config.uri_fallback !== 'undefined') ? config.uri_fallback : false,
      request_timeout:  (typeof config.request_timeout !== 'undefined') ? config.request_timeout : 10000
    };
  }

  // make an http request and look for JRD response, fails if request fails
  // or response not json.
  WebFinger.prototype.__fetchJRD = function (_url, errorHandler, sucessHandler) {
    var self = this;
    function __makeRequest(url) {
      var xhr = new XMLHttpRequest();
  
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            if (self.__isValidJSON(xhr.responseText)) {
              return sucessHandler(xhr.responseText);
            } else {
              return errorHandler(generateErrorObject({
                message: 'invalid json',
                url: url,
                status: xhr.status
              }));
            }
          } else if (xhr.status === 404) {
            return errorHandler(generateErrorObject({
              message: 'endpoint unreachable',
              url: url,
              status: xhr.status
            }));
          } else if ((xhr.status >= 301) && (xhr.status <= 302)) {
            var location = xhr.getResponseHeader('Location');
            if (isSecure(location)) {
              return __makeRequest(location); // follow redirect
            } else {
              return errorHandler(generateErrorObject({
                message: 'no redirect URL found',
                url: url,
                status: xhr.status
              }));
            }
          } else {
            return errorHandler(generateErrorObject({
              message: 'error during request',
              url: url,
              status: xhr.status
            }));
          }
        }
      };
  
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Accept', 'application/jrd+json, application/json');
      xhr.send();
    }
    
    return __makeRequest(_url);
  };

  WebFinger.prototype.__isValidJSON = function (str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  };

  WebFinger.prototype.__isLocalhost = function (host) {
    var local = /^localhost(\.localdomain)?(\:[0-9]+)?$/;
    return local.test(host);
  };

  // processes JRD object as if it's a webfinger response object
  // looks for known properties and adds them to profile datat struct.
  WebFinger.prototype.__processJRD = function (JRD, errorHandler, successHandler) {
    var parsedJRD = JSON.parse(JRD);
    if ((typeof parsedJRD !== 'object') ||
        (typeof parsedJRD.links !== 'object')) {
      if (typeof parsedJRD.error !== 'undefined') {
        return errorHandler(generateErrorObject({ message: parsedJRD.error }));
      } else {
        return errorHandler(generateErrorObject({ message: 'unknown response from server' }));
      }
      return false;
    }

    var links = parsedJRD.links;
    var result = {  // webfinger JRD - object, json, and our own indexing
      object: parsedJRD,
      json: JRD,
      idx: {}
    };

    result.idx.properties = {
      'name': undefined
    };
    result.idx.links = JSON.parse(JSON.stringify(LINK_PROPERTIES));

    // process links
    links.map(function (link, i) {
      if (LINK_URI_MAPS.hasOwnProperty(link.rel)) {
        if (result.idx.links[LINK_URI_MAPS[link.rel]]) {
          var entry = {};
          Object.keys(link).map(function (item, n) {
            entry[item] = link[item];
          });
          result.idx.links[LINK_URI_MAPS[link.rel]].push(entry);
        }
      }
    });

    // process properties
    var props = JSON.parse(JRD).properties;
    for (var key in props) {
      if (props.hasOwnProperty(key)) {
        if (key === 'http://packetizer.com/ns/name') {
          result.idx.properties.name = props[key];
        }
      }
    }
    return successHandler(result);
  };

  WebFinger.prototype.lookup = function (address, cb) {
    if (typeof address !== 'string') {
      throw new Error('first parameter must be a user address');
    } else if (typeof cb !== 'function') {
      throw new Error('second parameter must be a callback');
    }

    var self = this;
    var parts = address.replace(/ /g,'').split('@');
    var host = parts[1];    // host name for this useraddress
    var uri_index = 0;      // track which URIS we've tried already
    var protocol = 'https'; // we use https by default

    if (parts.length !== 2) {
      return cb(generateErrorObject({ message: 'invalid user address ' + address + ' ( expected format: user@host.com )' }));
    } else if (self.__isLocalhost(host)) {
      protocol = 'http';
    }

    function __buildURL() {
      return protocol + '://' + host + '/.well-known/' +
             URIS[uri_index] + '?resource=acct:' + address;
    }

    // control flow for failures, what to do in various cases, etc.
    function __fallbackChecks(err) {
      if ((self.config.uri_fallback) && (host !== 'webfist.org') && (uri_index !== URIS.length - 1)) { // we have uris left to try
        uri_index = uri_index + 1;
        return __call();
      } else if ((!self.config.tls_only) && (protocol === 'https')) { // try normal http
        uri_index = 0;
        protocol = 'http';
        return __call();
      } else if ((self.config.webfist_fallback) && (host !== 'webfist.org')) { // webfist attempt
        uri_index = 0;
        protocol = 'http';
        host = 'webfist.org';
        // webfist will
        // 1. make a query to the webfist server for the users account
        // 2. from the response, get a link to the actual webfinger json data
        //    (stored somewhere in control of the user)
        // 3. make a request to that url and get the json
        // 4. process it like a normal webfinger response
        self.__fetchJRD(__buildURL(), cb, function (data) { // get link to users JRD
          self.__processJRD(data, cb, function (result) {
            if ((typeof result.idx.links.webfist === 'object') &&
                (typeof result.idx.links.webfist[0].href === 'string')) {
              self.__fetchJRD(result.idx.links.webfist[0].href, cb, function (JRD) {
                self.__processJRD(JRD, cb, function (result) {
                  return cb(null, cb);
                });
              });
            }
          });
        });
      } else {
        return cb(err);
      }
    }

    function __call() {
      // make request
      self.__fetchJRD(__buildURL(), __fallbackChecks, function (JRD) {
        self.__processJRD(JRD, cb, function (result) { cb(null, result); });
      });
    }

    return setTimeout(__call, 0);
  };

  WebFinger.prototype.lookupLink = function (address, rel, cb) {
    if (LINK_PROPERTIES.hasOwnProperty(rel)) {
      this.lookup(address, function (err, p) {
        var links  = p.idx.links[rel];
        if (err) {
          return cb(err);
        } else if (links.length === 0) {
          return cb('no links found with rel="' + rel + '"');
        } else {
          return cb(null, links[0]);
        }
      });
    } else {
      return cb('unsupported rel ' + rel);
    }
  };

  if (typeof window === 'object') {
    window.WebFinger = WebFinger;
  } else if (typeof (define) === 'function' && define.amd) {
    define([], function () { return WebFinger; });
  } else {
    try {
      module.exports = WebFinger;
    } catch (e) {}
  }
})();

