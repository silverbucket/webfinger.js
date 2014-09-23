webfinger.js
============

A webfinger client that runs both in the browser and in node.js.

[![Build Status](https://secure.travis-ci.org/silverbucket/webfinger.js.png)](http://travis-ci.org/silverbucket/webfinger.js)
[![Code Climate](https://codeclimate.com/github/silverbucket/webfinger.js/badges/gpa.svg)](https://codeclimate.com/github/silverbucket/webfinger.js)
[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/silverbucket/webfinger.js/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

features
--------

* defaults to TLS only

* supports fallback to [WebFist](http://webfist.org)

* optional URI fallback (for older services which use host-meta or host-meta.json URI endpoints)


## initialize

### node.js
In node.js you should first require the module:

	var webfinger = require('webfinger.js');

### browser
When you include the `src/webfinger.js` script, a `webfinger` object will be exposed.

## use

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

other clients
-------------

The [pump.io](https://github.com/e14n/pump.io) project uses a node.js webfinger client library. See https://github.com/evanp/webfinger

license
-------
webfinger.js is released under the [AGPL](http://www.gnu.org/licenses/agpl.html). See [LICENSE](LICENSE)
