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
            test.assertTypeAnd(data, 'object');
            test.assertAnd(data.properties.name , 'Nick Jennings');
            test.assertType(data.JRD , 'string');
          });
        }
      }

    ]
  });

  return suites;
});