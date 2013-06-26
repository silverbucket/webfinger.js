// -*- mode:js; js-indent-level:2 -*-
/*!
 * webfinger.js
 * http://github.com/silverbucket/webfinger.js
 *
 * Copyright 2012-2013 Nick Jennings <nick@silverbucket.net>
 *
 * With contributions from:
 * Michiel de Jong <michiel@michielbdejong.com>
 *
 * webfinger.js is released with dual licensing, using the GPL v3
 * (LICENSE-AGPL) and the MIT license (LICENSE-MIT).
 *
 * You don't have to do anything special to choose one license or the other and you don't
 * have to notify anyone which license you are using.
 * Please see the corresponding license file for details of these licenses.
 * You are free to use, modify and distribute this software, but all copyright
 * information must remain.
 *
 */
(function (window, document, undefined) {

  // list of endpoints to try, fallback from beginning to end.
  var uris = ['webfinger', 'host-meta', 'host-meta.json'];

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


  function callWebFinger(address, p, cb) {
    p.tls_only = true; // never fallback to http
    if (!isValidDomain(p.host)) {
      cb('invalid host name');
      return;
    }

    var xhr = new XMLHttpRequest();

    if (typeof p.uri_fallback === "undefined") {
      p.uri_fallback = false;
    }
    if (typeof p.uri_index === "undefined") {
      // try first URI first
      p.uri_index = 0;
    }

    if (typeof p.protocol === "undefined") {
      // we use https by default
      p.protocol = 'https';
    }

    // make request
    getJSON(p.protocol + '://' + p.host + '/.well-known/' +
        uris[p.uri_index] + '?resource=acct:' + address,
    function(err, json) {
      if (err) {
        fallbackChecks();
      } else {
        processJSON(json, cb);
      }
    });


    // make an http request and look for json response, fails if request fails
    // or response not json.
    function getJSON(url, cb) {
      console.log('URL: ' + url);
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            console.log(xhr.responseText);
            if (isValidJSON(xhr.responseText)) {
              cb(null, xhr.responseText);
            } else {
              // invalid json response
              cb('invalid jsoon');
            }
          } else {
            // request failed
            cb('request failed');
          }
        }
      };
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();
    }

    // processes json object as if it's a webfinger response object
    // looks for known properties and adds them to profile datat struct.
    function processJSON(json, cb) {
      var links = JSON.parse(json).links;
      if (!links) {
        var serverResp = JSON.parse(json);
        if (typeof serverResp.error !== 'undefined') {
          cb(serverResp.error);
        } else {
          cb('received unknown response from server');
        }
        return;
      }

      var profile = {};
      profile.properties = {
        'name': undefined
      };
      profile.links = {
        'avatar': [],
        'remotestorage': [],
        'blog': [],
        'vcard': [],
        'updates': [],
        'share': [],
        'profile': [],
        'webfist': []
      };

      // process links
      for (var i = 0, len = links.length; i < len; i = i + 1) {
        //console.log(links[i]);
        switch (links[i].rel) {
          case "http://webfist.org/spec/rel":
            profile.links['webfist'].push(links[i].href);
            break;
          case 'http://webfinger.net/rel/avatar':
            profile.links['avatar'].push(links[i].href);
            break;
          case 'remotestorage':
          case 'remoteStorage':
            profile.links['remotestorage'].push(links[i].href);
            break;
          case 'http://www.packetizer.com/rel/share':
            profile.links['share'].push(links[i].href);
            break;
          case 'http://webfinger.net/rel/profile-page':
            profile.links['profile'].push(links[i].href);
            break;
          case 'vcard':
            profile.links['vcard'].push(links[i].href);
            break;
          case 'blog':
          case 'http://packetizer.com/rel/blog':
            profile.links['blog'].push(links[i].href);
            break;
          case 'http://schemas.google.com/g/2010#updates-from':
            profile.links['updates'].push(links[i].href);
            break;
        }
      }

      // process properties
      var props = JSON.parse(json).properties;
      for (var key in props) {
        if (props.hasOwnProperty(key)) {
          if (key === 'http://packetizer.com/ns/name') {
            profile.properties['name'] = props[key];
          }
        }
      }
      cb(null, profile);
    }

    // control flow for failures, what to do in various cases, etc.
    function fallbackChecks() {
      if ((p.uri_fallback) && (p.uri_index !== uris.length - 1)) { // we have uris left to try
        p.uri_index = p.uri_index + 1;
        callWebFinger(address, p, cb);
      } else if ((!p.tls_only) && (protocol === 'https')) { // try normal http
        p.uri_index = 0;
        p.protocol = 'http';
        callWebFinger(address, p, cb);
      } else if ((p.webfist_fallback) && (p.host !== 'webfist.org')) { // webfirst attempt
        p.uri_index = 0;
        p.protocol = 'http';
        p.host = 'webfist.org';
        p.uri_fallback = false;
        // webfirst will
        // 1. make a query to the webfirst server for the users account
        // 2. from the response, get a link to the actual webfinger json data
        //    (stored somewhere in control of the user)
        // 3. make a request to that url and get the json
        // 4. process it like a normal webfinger response
        callWebFinger(address, p, function(err, profile) { // get link to users json
          if (err) {
            cb(err);
          } else if ((typeof profile.links.webfist === "object") &&
                     (profile.links.webfist[0])) {
            getJSON(profile.links.webfist[0], function (err, json) {
              if (err) {
                cb(err);
              } else {
                processJSON(json, cb);
              }
            });
          }
        });
      } else {
        cb('webfinger endpoint unreachable', xhr.status);
      }
    }
  }

  window.webfinger = function(address, o, cb) {
    if (typeof cb !== 'function') {
      console.log('webfinger.js: no callback function specified');
      return { error: "no callback function specified" };
    }

    var parts = address.replace(/ /g,'').split('@');
    if (parts.length !== 2) { cb('invalid email address'); return false; }

    callWebFinger(address, {
      host: parts[1],
      tls_only: (typeof o.tls_only !== 'undefined') ? o.tls_only : true,
      webfist_fallback: (typeof o.webfist_fallback !== 'undefined') ? o.webfist_fallback : true
    }, cb);
  };

})(this, document);
