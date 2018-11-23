if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(['require', './../src/webfinger.js'], function (require, amdwf) {
  var tests = [
    {
      desc: 'ensure amd module is loaded correctly',
      run: function (env, test) {
        test.assertType(amdwf, 'function');
      }
    },
    {
      desc: 'ensure amd module can be used to create a wf object',
      run: function (env, test) {
        var wf = new amdwf();
        test.assertTypeAnd(wf, 'object');
        test.assertType(wf.lookup, 'function');
      }
    },

    {
      desc: 'calling with correct useraddress (needs internet connectivity)',
      run: function (env, test) {
        env.wf.lookup('nick@silverbucket.net', function (err, data) {
          test.assertAnd(err, null);
          test.assertTypeAnd(data, 'object');
          test.assertTypeAnd(data.idx, 'object');
          test.assertTypeAnd(data.object, 'object');
          test.assertTypeAnd(data.json, 'string');
          test.assertAnd(data.idx.properties.name , 'Nick Jennings');
          test.assertType(data.idx.links.remotestorage , 'object');
        });
      }
    },

    {
      desc: 'calling bogus lookupLink',
      run: function (env, test) {
        env.wf.lookupLink('nick@silverbucket.net', 'bogus', function (err, data) {
          test.assert(err, 'unsupported rel bogus');
        });
      }
    },

    {
      desc: 'calling absent lookupLink',
      run: function (env, test) {
        env.wf.lookupLink('nick@silverbucket.net', 'camlistore', function (err, data) {
          test.assert(err, 'no links found with rel="camlistore"');
        });
      }
    },

    {
      desc: 'calling existing lookupLink',
      run: function (env, test) {
        env.wf.lookupLink('nick@silverbucket.net', 'remotestorage', function (err, data) {
          test.assertAnd(err, null);
          test.assertTypeAnd(data, 'object');
          test.assertTypeAnd(data.href, 'string');
          test.assertType(data.properties, 'object');
        });
      }
    },

    {
      desc: 'calling with non-acct URI address',
      run: function (env, test) {
        env.wf.lookup('http://silverbucket.net/account/nick', function (err, data) {
          test.assertTypeAnd(err, 'object');
          test.assert(err.request, 'https://silverbucket.net/.well-known/webfinger?resource=http://silverbucket.net/account/nick');
        });
      }
    }

  ];


  var suites = [];

  var setup = function (env, test) {
    env.WebFinger = require('./../src/webfinger.js');
    env.wf = new env.WebFinger();
    test.assertTypeAnd(env.wf, 'object');
    test.assertType(env.wf.lookup, 'function');
  };

  var setup_XHR = function (env, test) {
    setup(env, test);
    XMLHttpRequest = require('xhr2');
  };

  suites.push({
    desc: "live webfinger.js tests using XHR",
    abortOnFail: true,
    setup: setup_XHR,
    tests: tests
  });

  var setup_fetch = function (env, test) {
    setup(env, test);
    fetch = require('node-fetch');
  };

  suites.push({
    desc: "live webfinger.js tests using fetch",
    abortOnFail: true,
    setup: setup_fetch,
    tests: tests
  });

  return suites;
});
