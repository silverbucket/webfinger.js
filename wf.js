/*jslint browser: true, indent: 4 */
var WebFinger = (function() {
    "use strict";

    return function WebFingerConstructor() {
        this.extractDomain = function(resource) {
            var parsedResource = resource.match(/(\S+)@(\S+)/);
            if (null === parsedResource) {
                // did not match regexp
                throw "resource not valid";
            }
            return parsedResource[2];
        };

        this.finger = function(resource, callback) {
            var domain = this.extractDomain(resource),
                webFingerUri = 'https://' + domain + '/.well-known/webfinger?resource=acct:' + resource,
                httpRequest = new XMLHttpRequest();

            httpRequest.onreadystatechange = function() {
                if (4 === httpRequest.readyState) {
                    if (200 === httpRequest.status) {
                        callback(JSON.parse(httpRequest.responseText));
                    } else if (404 === httpRequest.status) {
                        throw "resource not found";
                    } else {
                        throw "there was a problem with the request";
                    }
                }
            };

            httpRequest.open('GET', webFingerUri, true);
            httpRequest.setRequestHeader('Accept', 'application/jrd+json');
            httpRequest.send();
        };
    };
}());