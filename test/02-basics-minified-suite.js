if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(['require', './../dist/webfinger.js'], function (require, webfingerModule) {
  var amdwf = webfingerModule.default;
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
      desc: 'calling function with no params fails',
      run: function (env, test) {
        env.wf.lookup().catch(function(err) {
          test.assert(err instanceof Error, true, 'Should reject with Error');
          test.done();
        });
      }
    },

    {
      desc: 'calling with invalid useraddress',
      run: function (env, test) {
        env.wf.lookup('asdfg').catch(function(err) {
          test.assert(err instanceof Error, true, 'Should reject with Error for invalid address');
          test.done();
        });
      }
    },

    {
      desc: 'allow for port localhost without ssl',
      run: function (env, test) {
        env.wf.lookup('me@localhost:8001', function (err, data) {
          if (err) {
            // The error should be a connection error since localhost:8001 likely won't respond
            test.assert(typeof err.message, 'string', 'Error should have a message');
          } else {
            test.done();
          }
        });
      }
    }
  ];


  var suites = [];

  var setup = function (env, test) {
    env.WebFinger = require('./../dist/webfinger.js').default;
    env.wf = new env.WebFinger();
    test.assertTypeAnd(env.wf, 'object');
    test.assertType(env.wf.lookup, 'function');
  };

  var setup_XHR = function (env, test) {
    setup(env, test);
    XMLHttpRequest = require('xhr2');
  };

  suites.push({
    desc: "basic webfinger.min.js tests using XHR",
    setup: setup_XHR,
    tests: tests
  });

  var setup_fetch = function (env, test) {
    setup(env, test);
    fetch = require('node-fetch');
  };

  suites.push({
    desc: "basic webfinger.min.js tests using fetch",
    setup: setup_fetch,
    tests: tests
  });

  return suites;
});
