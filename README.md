# webfinger.js

A webfinger client that runs both in the browser and in node.js.

[![Build Status](https://secure.travis-ci.org/silverbucket/webfinger.js.png)](http://travis-ci.org/silverbucket/webfinger.js)
[![Code Climate](https://codeclimate.com/github/silverbucket/webfinger.js/badges/gpa.svg)](https://codeclimate.com/github/silverbucket/webfinger.js)
[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/silverbucket/webfinger.js/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

## Features

* defaults to TLS only

* optional URI fallback (for older services which use `host-meta` or `host-meta.json` URI endpoints)

* optional support for [WebFist](http://webfist.org)

## Initialize

### node.js
In node.js you should first require the module:

	var WebFinger = require('webfinger.js');

### Browser
When you include the `src/webfinger.js` script, a `WebFinger` object will be exposed.

## Use

	var webfinger = new WebFinger({
		webfist_fallback: true,  // defaults to false
		tls_only: true,          // defaults to true
		uri_fallback: false,     // defaults to false
		request_timeout: 10000,  // defaults to 10000
		debug: false             // defaults to false
	});

	webfinger.lookup('nick@silverbucket.net', function (err, p) {
		if (err) {
            console.log('error: ', err.message);
        } else {
			console.log(p);
		}
	});


	// example output:
	// {
	//   idx: {
    //     properties: {
	//       name: "Nick Jennings"
	//     },
	//     links: {
	//       avatar: [{ href: '<url>' }],
	//       blog: [{ href: '<url>' }],
	//       vcard: [href: '<url' }]
	//       ... etc.
	//     },
	//   }
    //   json: { ... raw json output ... }
    //   object: { ... unformatted but parsed into native javascript object ... }
	// }


## Demo
See a working demo [here](http://silverbucket.github.com/webfinger.js/demo/)

## Other Clients

The [pump.io](https://github.com/e14n/pump.io) project uses a node.js webfinger client library. See https://github.com/evanp/webfinger

## license
`webfinger.js` is released under the [AGPL](http://www.gnu.org/licenses/agpl.html). See [LICENSE](LICENSE)
