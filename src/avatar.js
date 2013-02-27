// -*- mode:js; js-indent-level:2 -*-
/*!
 * webfinger.js
 * http://github.com/silverbucket/webfinger.js
 *
 * Copyright 2012-201 Nick Jennings <nick@silverbucket.net>
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
(function(window, document, undefined) {

  // list of endpoints to try, fallback from beginning to end.
  var uris = ['webfinger','host-meta', 'host-meta.json'];

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

  function callWebFinger(p, uriIndex, protocol) {
    //console.log('params:',p);
    //console.log('uriIndex:'+uriIndex+' protocol:'+protocol);
    p.TLS_ONLY = true; // never fallback to http
    if (!isValidDomain(p.host)) {
      p.callback('invalid host name');
      return;
    }

    var xhr = new XMLHttpRequest();

    if (uriIndex === undefined) {
      // try first URI first
      uriIndex = 0;
    }

    if (protocol === undefined) {
      // we use https by default
      protocol = 'https';
    }

    var profile = {};
    profile.properties = {
      'name': undefined
    };
    profile.links = {
    //profile = {
      'avatar': [],
      'remotestorage': [],
      'blog': [],
      'vcard': [],
      'updates': [],
      'share': [],
      'profile': []
    };

    console.log('URL: ' + protocol + '://' + p.host + '/.well-known/' +
                uris[uriIndex] + '?resource=acct:' + p.userAddress);

    xhr.open('GET', protocol + '://' + p.host + '/.well-known/' +
                    uris[uriIndex] + '?resource=acct:' + p.userAddress, true);

    xhr.onreadystatechange = function() {
      if(xhr.readyState==4) {
        //console.log('xhr.status: '+xhr.status);
        if(xhr.status==200) {
          console.log(xhr.responseText);
          if (isValidJSON(xhr.responseText)) {

            // process links
            var links = JSON.parse(xhr.responseText).links;
            for (var i = 0, len = links.length; i < len; i = i + 1) {
              //console.log(links[i]);
              switch (links[i].rel) {
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
            var props = JSON.parse(xhr.responseText).properties;
            for (var key in props) {
              if (props.hasOwnProperty(key)) {
                if (key === 'http://packetizer.com/ns/name') {
                  profile.properties['name'] = props[key];
                }
              }
            }

            p.callback(null, profile);
          } else {
            // invalid json response
            fallbackChecks();
          }
        } else {
          // request failed
          fallbackChecks();
        }
      }
    };

    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send();

    function fallbackChecks() {
      if (uriIndex !== uris.length - 1) {
        callWebFinger(p, uriIndex + 1, protocol);
      } else if ((!p.TLS_ONLY) && (protocol === 'https')) {
        // try normal http
        callWebFinger(p, uriIndex = 0, 'http');
      } else {
        p.callback('webfinger endpoint unreachable', xhr.status);
      }
    }
  }

  window.webfinger = function(userAddress, cb, TLS_ONLY) {
    var parts = userAddress.replace(/ /g,'').split('@');
    if (parts.length !== 2) { cb('invalid email address'); return false; }
    callWebFinger({
      userAddress: userAddress,
      TLS_ONLY: TLS_ONLY || 0,
      host: parts[1],
      callback: cb
    });
  };

})(this, document);
