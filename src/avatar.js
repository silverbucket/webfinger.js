// -*- mode:js; js-indent-level:2 -*-
/*!
 * avatar.js
 * http://github.com/silverbucket/avatar.js
 *
 * Copyright 2012 Michiel de Jong <michiel@michielbdejong.com>
 * Copyright 2012 Nick Jennings <nick@silverbucket.net>
 *
 * Released under the MIT license
 * https://raw.github.com/silverbucket/avatar.js/master/LICENSE
 *
 */
(function(window, document, undefined) {

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

  function callWebFinger(emailAddress, host, protocol, URIEndPoint, cb) {
    if (!isValidDomain(host)) {
      cb('invalid host name');
      return;
    }

    var xhr = new XMLHttpRequest();

    xhr.open('GET', protocol+'://'+host+'/.well-known/'+URIEndPoint+'?resource=acct:'+emailAddress, true);
    console.log('URL: '+protocol+'://'+host+'/.well-known/'+URIEndPoint+'?resource=acct:'+emailAddress);

    xhr.onreadystatechange = function() {
      if(xhr.readyState==4) {
        //console.log('xhr.status: '+xhr.status);
        if(xhr.status==200) {
          console.log(xhr.responseText);
          if (isValidJSON(xhr.responseText)) {
            var links = JSON.parse(xhr.responseText).links;
            var linksLen = links.length;
            for(var i=0; i < linksLen; i++) {
              //console.log(links[i]);
              if(links[i].rel=='http://webfinger.net/rel/avatar') {
                //console.log('found');
                cb(null, links[i].href);
              }
            }
          } else {
            cb('invalid json response');
          }

        } else {
          if (URIEndPoint === 'host-meta.json') {
            callWebFinger(emailAddress, host, protocol, 'host-meta', cb);
          } else if (protocol === 'https') {
            callWebFinger(emailAddress, host, 'http', 'host-meta.json', cb);
          } else {
            cb('webfinger endpoint unreachable', xhr.status);
          }
        }
      }
      cb('avatar not found');
    };

    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send();
  }

  window.avatar = function(emailAddress, cb) {
    var parts = emailAddress.replace(/ /g,'').split('@');
    if (parts.length !== 2) { cb('invalid email address'); return false; }
    callWebFinger(emailAddress, parts[1], 'https', 'host-meta.json', cb);
  };

})(this, document);
