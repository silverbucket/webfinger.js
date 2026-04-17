#!/usr/bin/env bun

/**
 * Verify documentation paths and artifact references are in sync with reality.
 *
 * Runs as part of `bun run lint`. Catches the class of drift described in
 * https://github.com/silverbucket/webfinger.js/issues/164 — docs referencing
 * paths or bundle filenames the repo no longer ships.
 *
 * What it checks, across README.md, CLAUDE.md and docs/*.md:
 *  1. Forbidden strings that almost always indicate stale docs.
 *  2. Every backticked repo-relative path (dist/, docs/, src/, spec/, scripts/)
 *     points to something that actually exists. For dist/ the reference must
 *     match the hard-coded set of artifacts produced by scripts/build.js.
 *
 * Exits non-zero with a readable report when anything fails.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const FILES = [
  'README.md',
  'CLAUDE.md',
  ...fs.readdirSync(path.join(ROOT, 'docs'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join('docs', f)),
];

// Must match the set produced by scripts/build.js.
const DIST_ARTIFACTS = new Set([
  'dist/webfinger.cjs',
  'dist/webfinger.js',
  'dist/webfinger.min.js',
  'dist/webfinger.mjs',
  'dist/webfinger.d.ts',
  'dist/webfinger.d.ts.map',
]);

const FORBIDDEN = [
  {
    pattern: /(^|[^/])\bdocs\/API\.md\b/g,
    reason: 'Generated API docs live at docs/api/API.md (note the nested api/ directory).',
  },
];

const PATH_REGEX = /`((?:dist|docs|src|spec|scripts)\/[\w./-]+)`/g;

const errors = [];

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

for (const relFile of FILES) {
  const absPath = path.join(ROOT, relFile);
  const content = fs.readFileSync(absPath, 'utf8');

  for (const { pattern, reason } of FORBIDDEN) {
    for (const match of content.matchAll(pattern)) {
      const hit = match[0].replace(/^[^a-zA-Z/]/, '');
      errors.push(`${relFile}:${lineOf(content, match.index)}: forbidden "${hit}" — ${reason}`);
    }
  }

  for (const match of content.matchAll(PATH_REGEX)) {
    const ref = match[1];
    const line = lineOf(content, match.index);

    if (ref.startsWith('dist/')) {
      if (!DIST_ARTIFACTS.has(ref)) {
        errors.push(
          `${relFile}:${line}: unknown dist artifact "${ref}" — expected one of: ${[...DIST_ARTIFACTS].join(', ')}`
        );
      }
      continue;
    }

    if (!fs.existsSync(path.join(ROOT, ref))) {
      errors.push(`${relFile}:${line}: missing path "${ref}"`);
    }
  }
}

if (errors.length) {
  console.error('verify-docs: stale documentation references detected:');
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(`verify-docs: \u2713 checked ${FILES.length} files`);
