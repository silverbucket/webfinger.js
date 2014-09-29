if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(['require'], function (require) {
  var suites = [];

  suites.push({
    desc: "basic webfinger.js tests",
    setup: function (env, test) {
      env.webfinger = require('./../src/webfinger.js');
      test.assertType(env.webfinger, 'function');
    },
    tests: [
      {
        desc: 'calling function with no params fails',
        run: function (env, test) {
          var obj = env.webfinger();
          test.assertType(obj.error, 'string');
        }
      },
      {
        desc: 'calling with invalid useraddress',
        run: function (env, test) {
          var obj = env.webfinger('asdfg');
          test.assertType(obj.error, 'string');
        }
      },
      {
        desc: 'calling with correct useraddress (needs internet connectivity)',
        run: function (env, test) {
          env.webfinger('nick@silverbucket.net', function (err, data) {
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