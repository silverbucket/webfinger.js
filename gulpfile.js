const gulp = require('gulp');
const minify = require('minify');
const fs = require('fs');
const pkg = require('./package.json');

const credits = "/* webfinger.js v" + pkg.version + " | (c) 2012 Nick Jennings | License: AGPL | https://github.com/silverbucket/webfinger.js */\n";

gulp.task('default', async function () {

  await minify('src/webfinger.js', {
    returnName  : true,
    log         : true
  }, function (error, data) {
    if (error) {
      throw new Error(error);
    }

    data = credits + data;
    fs.writeFile('src/webfinger.min.js', data);
  });

});