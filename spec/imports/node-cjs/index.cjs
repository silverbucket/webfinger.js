const WebFinger = require("webfinger.js");

const wf1 = new WebFinger({ tls_only: true });
console.log("require() default:", typeof wf1.lookup === "function" ? "OK" : "FAIL");

const wf2 = new WebFinger.default({ tls_only: true });
console.log("require().default:", typeof wf2.lookup === "function" ? "OK" : "FAIL");
