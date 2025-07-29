import WebFinger from "webfinger.js";

new WebFinger({
  webfist_fallback: false,
  tls_only: true,
});

new WebFinger.default({
  webfist_fallback: false,
  tls_only: true,
});

