webfinger.js
============

A browser-based webfinger client.

[![Code Climate](https://codeclimate.com/github/silverbucket/webfinger.js.png)](https://codeclimate.com/github/silverbucket/webfinger.js)
[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/silverbucket/webfinger.js/trend.png)](https://bitdeli.com/free "Bitdeli Badge")


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
		tls_only: true,          // defaults to true
		uri_fallback: false,     // defaults to false
		debug: false             // defaults to false
	}, function (err, p) {
		if (!err) {
			console.log(p);
		}
	});



	// example output:
	// {
	//   properties: {
	//     name: "Nick Jennings"
	//   },
	//   links: {
	//     avatar: ['<url>'],
	//     blog: ['<url>'],
	//     vcard: ['<url']
	//     ... etc.
	//   },
	//   JRD: { ... raw JRD output ... }
	// }


demo
----
see a working demo [here](http://silverbucket.github.com/webfinger.js/demo/)

license
-------
webfinger.js is released under the [AGPL](http://www.gnu.org/licenses/agpl.html). See [LICENSE](LICENSE)