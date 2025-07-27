import { puppeteerLauncher } from '@web/test-runner-puppeteer';

export default {
  files: 'spec/browser/**/*.integration.js',
  nodeResolve: true,
  browsers: [
    puppeteerLauncher({
      launchOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    })
  ],
  coverage: false,
  concurrency: 1,
  rootDir: '.'
};