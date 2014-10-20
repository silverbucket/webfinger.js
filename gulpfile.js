var gulp    = require('gulp');
var minify  = require('minify');
var fs      = require('fs');
var pkg     = require('./package.json');
var credits = "/* webfinger.js v" + pkg.version + " | (c) 2012-2014 Nick Jennings | License: AGPL | https://github.com/silverbucket/webfinger.js */\n";

gulp.task('default', function() {

  minify('src/webfinger.js', {
    returnName  : true,
    log         : true
  }, function (error, name) {
    if (error) {
      throw new Error(error);
    }

    fs.readFile(name, function (err, data) {
      if (error) {
        throw new Error(error);
      }

      data = credits + data;
      fs.writeFile('src/webfinger.min.js', data);
    });
  });

});
