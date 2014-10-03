// -*- mode:js; js-indent-level:2 -*-
/*!
 * webfinger.js
 *   version 2.0.0
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
if (typeof XMLHttpRequest === 'undefined') {
  XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
}
if (typeof document === 'undefined') {
  var document = {};
}
if (typeof window === 'undefined') {
  var window = {};
}

(function (window, document, undefined) {

  // URI to property name map
  var LINK_URI_MAPS = {
    'http://webfist.org/spec/rel': 'webfist',
    'http://webfinger.net/rel/avatar': 'avatar',
    'remotestorage': 'remotestorage',
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
    'camilstore': []
  };

  // list of endpoints to try, fallback from beginning to end.
  var URIS = ['webfinger', 'host-meta', 'host-meta.json'];
  var LOGABLE = false;
  if ((typeof console === 'object') && (typeof console.log === 'function')) {
    LOGABLE = true;
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
      debug:            (typeof config.debug !== 'undefined') ? config.debug : false,
      tls_only:         (typeof config.tls_only !== 'undefined') ? config.tls_only : true,
      webfist_fallback: (typeof config.webfist_fallback !== 'undefined') ? config.webfist_fallback : false,
      uri_fallback:     (typeof config.uri_fallback !== 'undefined') ? config.uri_fallback : false,
      request_timeout:  (typeof config.request_timeout !== 'undefined') ? config.request_timeout : 10000
    };
  }


  // make an http request and look for JRD response, fails if request fails
  // or response not json.
  WebFinger.prototype._fetchJRD = function (url, cb) {
    var self = this;
    self._log('Request URL: ' + url);
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          if (self._isValidJSON(xhr.responseText)) {
            cb(null, xhr.responseText);
          } else {
            cb({
              message: 'invalid json',
              url: url,
              status: xhr.status
            });
          }
        } else if (xhr.status === 404) {
          cb({
            message: 'webfinger endpoint unreachable',
            url: url,
            status: xhr.status
          });
        } else {
          cb({
            message: 'error during request',
            url: url,
            status: xhr.status
          });
        }
      }
    };

    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/jrd+json');
    xhr.send();
  };

  WebFinger.prototype._isValidJSON = function (str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  };

  WebFinger.prototype._isValidDomain = function (domain) {
    var pattern = /^[A-Za-z0-9.-]+\.[A-Za-z]{2,6}$/;
    return pattern.test(domain);
  };

  WebFinger.prototype._log = function () {
    var args = Array.prototype.splice.call(arguments, 0);
    if ((this.config.debug) && (LOGABLE)) {
      console.log.apply(window.console, args);
    }
  };

  // processes JRD object as if it's a webfinger response object
  // looks for known properties and adds them to profile datat struct.
  WebFinger.prototype._processJRD = function (JRD, cb) {
    var self = this;
    var parsedJRD = JSON.parse(JRD);
    if ((typeof parsedJRD !== 'object') ||
        (typeof parsedJRD.links !== 'object')) {
      if (typeof parsedJRD.error !== 'undefined') {
        cb({ message: parsedJRD.error });
      } else {
        cb({ message: 'received unknown response from server' });
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
        } else {
          self._log('URI ' + links[i].rel + ' has no corresponding link property ' + LINK_URI_MAPS[link.rel]);
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
    cb(null, result);
  };


  WebFinger.prototype.lookup = function (address, cb) {
    if (typeof address !== 'string') {
      throw new Error('first parameter must be a user address');
    } else if (typeof cb !== 'function') {
      throw new Error('second parameter must be a callback function');
    }

    var parts = address.replace(/ /g,'').split('@');
    if (parts.length !== 2) {
      cb({ message: 'invalid user address ( should be in the format of: user@host.com )' });
      return false;
    } else if (!this._isValidDomain(parts[1])) {
      cb({ message: 'invalid host name' });
      return false;
    }

    var self = this;
    var host = parts[1];    // host name for this useraddress
    var uri_index = 0;      // track which URIS we've tried already
    var protocol = 'https'; // we use https by default

    function _buildURL() {
      return protocol + '://' + host + '/.well-known/' +
             URIS[uri_index] + '?resource=acct:' + address;
    }

    // control flow for failures, what to do in various cases, etc.
    function _fallbackChecks(err) {
      if ((self.config.uri_fallback) && (host !== 'webfist.org') && (uri_index !== URIS.length - 1)) { // we have uris left to try
        uri_index = uri_index + 1;
        _call();
      } else if ((!self.config.tls_only) && (protocol === 'https')) { // try normal http
        uri_index = 0;
        protocol = 'http';
        _call();
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
        self._fetchJRD(_buildURL(), function (err, data) { // get link to users JRD
          if (err) {
            cb(err);
            return false;
          }
          self._processJRD(data, function (err, result) {
            if ((typeof result.idx.links.webfist === 'object') &&
                (typeof result.idx.links.webfist[0].href === 'string')) {
              self._fetchJRD(result.idx.links.webfist[0].href, function (err, JRD) {
                if (err) {
                  cb(err);
                } else {
                  self._processJRD(JRD, cb);
                }
              });
            }
          });
        });
      } else {
        cb(err);
        return false;
      }
    }

    function _call() {
      // make request
      self._fetchJRD(_buildURL(), function (err, JRD) {
        if (err) {
          _fallbackChecks(err);
        } else {
          self._processJRD(JRD, cb);
        }
      });
    }

    setTimeout(_call, 0);
  };

  window.WebFinger = WebFinger;

})(window, document);

if (typeof (define) === 'function' && define.amd) {
  define([], function () { return window.WebFinger; });
} else {
  try {
    module.exports = window.WebFinger;
  } catch (e) {}
}
