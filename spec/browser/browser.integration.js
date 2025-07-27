import { expect } from '@esm-bundle/chai';

async function loadWebFinger() {
  if (window.WebFinger) {
    return window.WebFinger;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/.tmp/webfinger.js';
    script.onload = () => resolve(window.WebFinger);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

describe('WebFinger Browser Tests', () => {
  let WebFinger;
  let webfinger;

  before(async () => {
    WebFinger = await loadWebFinger();
  });

  beforeEach(() => {
    webfinger = new WebFinger({
      webfist_fallback: true,
      uri_fallback: true,
      request_timeout: 5000
    });
  });

  describe('Module Loading', () => {
    it('should load WebFinger in browser', () => {
      expect(WebFinger).to.be.a('function');
    });

    it('should create a WebFinger instance', () => {
      const wf = new WebFinger();
      expect(wf).to.be.instanceOf(WebFinger);
      expect(wf.lookup).to.be.a('function');
      expect(wf.lookupLink).to.be.a('function');
    });
  });

  describe('Input Validation', () => {
    it('should reject when called with no parameters', async () => {
      try {
        await webfinger.lookup();
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.include('address is required');
      }
    });

    it('should reject invalid useraddress format', async () => {
      try {
        await webfinger.lookup('asdfg');
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.include('invalid useraddress format');
      }
    });
  });

  describe('Browser Environment', () => {
    it('should have access to fetch API', () => {
      expect(window.fetch).to.be.a('function');
    });

    it('should work with browser globals', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(window.location).to.exist;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(document).to.exist;
    });
  });

  describe('Configuration', () => {
    it('should create instance with custom configuration', () => {
      const customWf = new WebFinger({
        tls_only: false,
        webfist_fallback: true,
        uri_fallback: true,
        request_timeout: 15000
      });
      expect(customWf).to.be.instanceOf(WebFinger);
    });
  });
});