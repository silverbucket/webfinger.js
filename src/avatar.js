// -*- mode:js; js-indent-level:2 -*-
/*!
 * avatar.js
 * http://github.com/silverbucket/avatar.js
 *
 * Copyright 2012 Michiel de Jong <michiel@michielbdejong.com>
 * Copyright 2012 Nick Jennings <nick@silverbucket.net>
 *
 * avatar.js is released with dual licensing, using the GPL v3
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
  var uris = {
    '0': 'webfinger',
    '1': 'host-meta',
    '2': 'host-meta.json'
  };

  // list of protocols to try
  var protocols = {
    '0': 'https',
    '1': 'http'
  };

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
    //profile.properties = {
    //  'name': undefined
    //};
    //profile.links = {
    profile = {
      'avatar': [],
      'remotestorage': [],
      'blog': [],
      'vcard': [],
      'updates': [],
      'share': [],
      'profile': []
    };

    console.log('URL: '+protocol+'://'+p.host+'/.well-known/'+uris[uriIndex]+'?resource=acct:'+p.userAddress);
    xhr.open('GET', protocol+'://'+p.host+'/.well-known/'+uris[uriIndex]+'?resource=acct:'+p.userAddress, true);

    xhr.onreadystatechange = function() {
      if(xhr.readyState==4) {
        //console.log('xhr.status: '+xhr.status);
        if(xhr.status==200) {
          console.log(xhr.responseText);
          if (isValidJSON(xhr.responseText)) {
            var links = JSON.parse(xhr.responseText).links;
            var linksLen = links.length;
            for (var i = 0; i < linksLen; i = i + 1) {
              //console.log(links[i]);
              switch (links[i].rel) {
                case 'http://webfinger.net/rel/avatar':
                  profile['avatar'].push(links[i].href);
                  break;
                case 'remotestorage':
                case 'remoteStorage':
                  profile['remotestorage'].push(links[i].href);
                  break;
                case 'http://www.packetizer.com/rel/share':
                  profile['share'].push(links[i].href);
                  break;
                case 'http://webfinger.net/rel/profile-page':
                  profile['profile'].push(links[i].href);
                  break;
                case 'vcard':
                  profile['vcard'].push(links[i].href);
                  break;
                case 'blog':
                case 'http://packetizer.com/rel/blog':
                  profile['blog'].push(links[i].href);
                  break;
                case 'http://schemas.google.com/g/2010#updates-from':
                  profile['updates'].push(links[i].href);
                  break;
              }
            }

            /*var properties = JSON.parse(xhr.responseText).properties;
            var propertiesLen = properties.length;
            for(i = 0; i < propertiesLen; i = i + 1) {
              //console.log(links[i]);
              switch (links[i].rel) {
                case 'http://webfinger.net/rel/avatar':
                  profile['avatar'].push(links[i].href);
                  break;
                case 'remotestorage':
                case 'remoteStorage':
                  profile['remotestorage'].push(links[i].href);
                  break;
                case 'http://www.packetizer.com/rel/share':
                  profile['share'].push(links[i].href);
                  break;
                case 'http://webfinger.net/rel/profile-page':
                  profile['profile'].push(links[i].href);
                  break;
                case 'vcard':
                  profile['vcard'].push(links[i].href);
                  break;
                case 'blog':
                case 'http://packetizer.com/rel/blog':
                  profile['blog'].push(links[i].href);
                  break;
                case 'http://schemas.google.com/g/2010#updates-from':
                  profile['updates'].push(links[i].href);
                  break;
              }
            }*/

            p.callback(null, profile);
            //p.callback('avatar not found');
          } else {
            //p.callback('invalid json response');
            if (uriIndex !== uris.length - 1) {
              callWebFinger(p, uriIndex + 1);
            } else if ((!p.TLS_ONLY) && (protocol === 'https')) {
              // try normal http
              callWebFinger(p, uriIndex = 0, 'http');
            } else {
              p.callback('webfinger endpoint unreachable', xhr.status);
            }
          }
        } else {
          if (uriIndex !== uris.length - 1) {
            callWebFinger(p, uriIndex + 1);
          } else if ((!p.TLS_ONLY) && (protocol === 'https')) {
            // try normal http
            callWebFinger(p, uriIndex = 0, 'http');
          } else {
            p.callback('webfinger endpoint unreachable', xhr.status);
          }
        }
      }
    };

    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send();
  }

  window.avatar = function(userAddress, cb, TLS_ONLY) {
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
