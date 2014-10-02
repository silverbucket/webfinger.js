// -*- mode:js; js-indent-level:2 -*-
/*!
 * webfinger.js
 *   version 1.1.1
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
  var link_uri_maps = {
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
  var link_properties = {
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
  var uris = ['webfinger', 'host-meta', 'host-meta.json'];
  var DEBUG = false; // wrapper flag for log
  var LOGABLE = false;
  if ((typeof console === 'object') && (typeof console.log === 'function')) {
    LOGABLE = true;
  }

  function log() {
    var args = Array.prototype.splice.call(arguments, 0);
    if ((DEBUG) && (LOGABLE)) {
      console.log.apply(window.console, args);
    }
  }

  function isValidJSON(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  function isValidDomain(domain) {
    var pattern = /^[A-Za-z0-9.-]+\.[A-Za-z]{2,6}$/;
    return pattern.test(domain);
  }

  // make an http request and look for JRD response, fails if request fails
  // or response not json.
  function getJRD(url, timeout, cb) {
    log('Request URL: ' + url);
    var xhr = new XMLHttpRequest();

    xhr.onabort = xhr.onerror = function (e) {
      log('xhr error ' + url, e);
      cb({
        message: 'webfinger endpoint unreachable',
        url: url,
        status: xhr.status
      });
    };

    xhr.onload = function (o) {
      //log('xhr load ' + url, xhr);
      if (xhr.status === 200) {
        //log(xhr.responseText);
        if (isValidJSON(xhr.responseText)) {
          cb(null, xhr.responseText);
        } else {
          // invalid json response
          cb({
            message: 'invalid json',
            url: url,
            status: xhr.status
          });
        }
      } else {
        // request failed
        cb({
          message: 'webfinger endpoint unreachable',
          url: url,
          status: xhr.status
        });
      }
    };

    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/jrd+json, application/json');
    xhr.send();

    setTimeout(function () {
      if (xhr.readyState !== 4) {
        xhr.abort();
      }
    }, timeout);
  }

  // processes JRD object as if it's a webfinger response object
  // looks for known properties and adds them to profile datat struct.
  function processJRD(JRD, cb) {
    var parsedJRD = JSON.parse(JRD);
    if ((typeof parsedJRD !== 'object') ||
        (typeof parsedJRD.links !== 'object')) {

      if (typeof parsedJRD.error !== 'undefined') {
        cb({ message: parsedJRD.error });
      } else {
        cb({ message: 'received unknown response from server' });
      }
      return;
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
    result.idx.links = JSON.parse(JSON.stringify(link_properties));

    // process links
    links.map(function (link, i) {
      if (link_uri_maps.hasOwnProperty(link.rel)) {
        if (result.idx.links[link_uri_maps[link.rel]]) {
          var entry = {};
          Object.keys(link).map(function (item, n) {
            entry[item] = link[item];
          });
          result.idx.links[link_uri_maps[link.rel]].push(entry);
        } else {
          log('URI ' + links[i].rel + ' has no corresponding link property ' + link_uri_maps[link.rel]);
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
  }


  function callWebFinger(address, p, cb) {
    if (!isValidDomain(p.host)) {
      cb({ message: 'invalid host name' });
      return;
    }
    if (typeof p.tls_only === "undefined") {
      p.tls_only = true;
    }
    if (typeof p.uri_fallback === "undefined") {
      p.uri_fallback = false;
    }
    if (typeof p.uri_index === "undefined") {
      // try first URI first
      p.uri_index = 0;
    }
    if (typeof p.request_timeout === "undefined") {
      p.request_timeout = 5000;
    }

    if (typeof p.protocol === "undefined") {
      // we use https by default
      p.protocol = 'https';
    }

    // control flow for failures, what to do in various cases, etc.
    function fallbackChecks(err) {
      if ((p.uri_fallback) && (p.uri_index !== uris.length - 1)) { // we have uris left to try
        p.uri_index = p.uri_index + 1;
        callWebFinger(address, p, cb);
      } else if ((!p.tls_only) && (p.protocol === 'https')) { // try normal http
        p.uri_index = 0;
        p.protocol = 'http';
        callWebFinger(address, p, cb);
      } else if ((p.webfist_fallback) && (p.host !== 'webfist.org')) { // webfist attempt
        p.uri_index = 0;
        p.protocol = 'http';
        p.host = 'webfist.org';
        p.uri_fallback = false;
        // webfist will
        // 1. make a query to the webfist server for the users account
        // 2. from the response, get a link to the actual webfinger json data
        //    (stored somewhere in control of the user)
        // 3. make a request to that url and get the json
        // 4. process it like a normal webfinger response
        callWebFinger(address, p, function (err, result) { // get link to users JRD
          if (err) {
            cb(err);
          } else if ((typeof result.idx.links.webfist === 'object') &&
                     (typeof result.idx.links.webfist[0].href === 'string')) {
            getJRD(result.idx.links.webfist[0].href, p.request_timeout, function (err, JRD) {
              if (err) {
                cb(err);
              } else {
                processJRD(JRD, cb);
              }
            });
          }
        });
      } else {
        cb(err);
      }
    }

    var url = p.protocol + '://' + p.host + '/.well-known/' +
              uris[p.uri_index] + '?resource=acct:' + address;

    // make request
    getJRD(url, p.request_timeout, function (err, JRD) {
      if (err) {
        fallbackChecks(err);
      } else {
        processJRD(JRD, cb);
      }
    });
  }

  window.webfinger = function (address, o, cb) {
    if (typeof o === 'function') {
      cb = o;
      o = {};
    } else if (typeof cb !== 'function') {
      console.log('webfinger.js: no callback function specified. webfinger(address, options, callback)');
      return { error: 'no callback function specified' };
    }

    var parts = address.replace(/ /g,'').split('@');
    if (parts.length !== 2) {
      cb({ message: 'invalid user address ( user@host )' });
      return false;
    }

    DEBUG = (typeof o.debug !== 'undefined') ? o.debug : false;

    setTimeout(function () {
      var called_back = false;

      callWebFinger(address, {
        host: parts[1],
        tls_only: (typeof o.tls_only !== 'undefined') ? o.tls_only : true,
        webfist_fallback: (typeof o.webfist_fallback !== 'undefined') ? o.webfist_fallback : false,
        uri_fallback: (typeof o.uri_fallback !== 'undefined') ? o.uri_fallback : false,
        request_timeout: (typeof o.request_timeout !== 'undefined') ? o.request_timeout : 5000,
      }, function (err, resp) {
        if (called_back) {
          throw new Error(address + ' callback already called!');
        } else {
          called_back = true;
        }
        cb(err, resp);
      });
    });

  };

})(window, document);

if (typeof (define) === 'function' && define.amd) {
  define([], function () { return window.webfinger; });
} else {
  try {
    module.exports = window.webfinger;
  } catch (e) {}
}
