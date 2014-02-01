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
      }

    ]
  });

  return suites;
});