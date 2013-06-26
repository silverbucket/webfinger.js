webfinger.js
============

A browser-based webfinger client.

For a node.js webfinger client library see https://github.com/evanp/webfinger

features
--------

* defaults to TLS only

* supports fallback to [WebFist](http://webfist.org)

* optional uri fallback (for older services which use host-meta or host-meta.json URI endpoints)


example usage
-------------

When you include the `src/webfinger.js` script, a `webfinger` object will be exposed.

	webfinger('nick@silverbucket.net', {
		webfist_fallback: true,  // defaults to true
		tls_only: true,  // defaults to true
		uri_fallback: false,  // defaults to false
	}, function (err, p) {
		if (!err) {
			console.log(p);
		}
	});

**
// example output:
// {
//   properties: {
//     name: "Nick Jennings"
//   },
//     links: {
//       avatar: ['<url>'],
//       blog: ['<url>'],
//       vcard: ['<url']
//       ... etc.
//     }
//   }
// }
//
**

demo
----
see a working demo [here](http://silverbucket.github.com/webfinger.js/demo/)

license
-------
webfinger.js is released with dual licensing, using the [AGPL](http://www.gnu.org/licenses/agpl.html) and the [MIT](http://opensource.org/licenses/MIT) license.

You don't have to do anything special to choose one license or the other and you don't have to notify anyone which license you are using.
Please see the corresponding license file for details of these licenses.
You are free to use, modify and distribute this software, but all copyright information must remain.

