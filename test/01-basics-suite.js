if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(['require', './../src/webfinger.js'], function (require, amdwf) {
  var suites = [];

  suites.push({
    desc: "basic webfinger.js tests",
    setup: function (env, test) {
      env.WebFinger = require('./../src/webfinger.js');
      env.wf = new env.WebFinger();
      test.assertTypeAnd(env.wf, 'object');
      test.assertType(env.wf.lookup, 'function');
    },
    tests: [
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
        desc: 'calling function with no params fails',
        run: function (env, test) {
          test.throws(env.wf.lookup, Error, 'caught thrown exception');
        }
      },

      {
        desc: 'calling with invalid useraddress',
        run: function (env, test) {
          test.throws(function () { env.wf.lookup('asdfg'); }, Error, 'caught thrown exception');
        }
      },

      {
        desc: 'allow for port localhost without ssl',
        run: function (env, test) {
          env.wf.lookup('me@localhost:8001', function (err, data) {
            if (err) {
              test.assertAnd(err.url.indexOf('http://'), 0);
              test.assert(err.message, 'error during request');
            } else {
              test.done();
            }
          });
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
      }

    ]
  });

  return suites;
});
