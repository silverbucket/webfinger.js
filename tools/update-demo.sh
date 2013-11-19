#!/bin/sh

mkdir ../tmp
mkdir ../tmp/webfinger.js
cp demo/index.html ../tmp/webfinger.js/index.html &&
cp src/webfinger.js ../tmp/webfinger.js/webfinger.js &&
git push &&
git checkout gh-pages &&
cp ../tmp/webfinger.js/index.html demo/ &&
cp ../tmp/webfinger.js/webfinger.js src/ &&
git commit -m "updating gh-pages demo" . &&
git push &&
git checkout master

