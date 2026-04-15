**webfinger.js v3.0.2**

***

# webfinger.js v3.0.2

## Classes

### default

Defined in: [src/webfinger.ts:177](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L177)

WebFinger client for discovering user information across domains.

## Constructor

**`new WebFinger(cfg?)`**

Creates a new WebFinger client instance.

### Parameters

- **cfg** `Partial<WebFingerConfig>` _(optional)_ - Configuration options for the WebFinger client
  - **tls_only** `boolean` _(default: true)_ - Use HTTPS only. When false, allows HTTP fallback for localhost
  - **uri_fallback** `boolean` _(default: false)_ - Enable host-meta and host-meta.json fallback endpoints
  - **request_timeout** `number` _(default: 10000)_ - Request timeout in milliseconds
  - **allow_private_addresses** `boolean` _(default: false)_ - Allow private/internal addresses (DANGEROUS - only for development)

#### Example

```typescript
const webfinger = new WebFinger({
  tls_only: true
});

const result = await webfinger.lookup('user@domain.com');
console.log(result.idx.properties.name);
```

#### Methods

##### lookup()

> **lookup**(`address`): `Promise`\<[`WebFingerResult`](#webfingerresult)\>

Defined in: [src/webfinger.ts:587](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L587)

Performs a WebFinger lookup for the given address with comprehensive SSRF protection.

This method includes comprehensive security measures:
- Blocks private/internal IP addresses by default
- Validates host format to prevent path injection
- Validates DNS resolution to block domains that resolve to private IPs
- Validates redirect destinations to prevent redirect-based SSRF attacks
- Follows ActivityPub security guidelines
- Limits redirect chains to prevent redirect loops

###### Parameters

###### address

`string`

Email-like address (user@domain.com) or full URI to look up

###### Returns

`Promise`\<[`WebFingerResult`](#webfingerresult)\>

Promise resolving to WebFinger result with indexed links and properties

###### Throws

When lookup fails, address is invalid, or SSRF protection blocks the request

###### Examples

```typescript
try {
  const result = await webfinger.lookup('nick@silverbucket.net');
  console.log('Name:', result.idx.properties.name);
  console.log('Avatar:', result.idx.links.avatar?.[0]?.href);
} catch (error) {
  console.error('Lookup failed:', error.message);
}
```

```typescript
// These will throw WebFingerError due to SSRF protection:
await webfinger.lookup('user@localhost');     // Direct access blocked
await webfinger.lookup('user@127.0.0.1');    // Direct access blocked
await webfinger.lookup('user@192.168.1.1');  // Direct access blocked
// Domains that resolve to private IPs are blocked via DNS resolution (Node.js/Bun)
// Redirects to private addresses are also blocked automatically
```

##### lookupLink()

> **lookupLink**(`address`, `rel`): `Promise`\<[`LinkObject`](#linkobject)\>

Defined in: [src/webfinger.ts:691](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L691)

Looks up a specific link relation for the given address.

###### Parameters

###### address

`string`

Email-like address (user@domain.com) or full URI

###### rel

`string`

Link relation type (e.g., 'avatar', 'blog', 'remotestorage')

###### Returns

`Promise`\<[`LinkObject`](#linkobject)\>

Promise resolving to the first matching link object

###### Throws

When lookup fails

###### Throws

When no links found for the specified relation

###### Example

```typescript
try {
  const storage = await webfinger.lookupLink('user@example.com', 'remotestorage');
  console.log('Storage endpoint:', storage.href);
} catch (error) {
  console.log('No RemoteStorage found');
}
```

***

### WebFingerError

Defined in: [src/webfinger.ts:133](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L133)

Custom error class for WebFinger-specific errors.

This error is thrown for various WebFinger-related failures including:
- Network errors (timeouts, DNS failures)
- HTTP errors (404, 500, etc.)
- Security violations (SSRF protection, invalid hosts)
- Invalid response formats (malformed JSON, missing data)
- Input validation failures (invalid addresses, formats)

#### Example

```typescript
try {
  await webfinger.lookup('user@localhost');
} catch (error) {
  if (error instanceof WebFingerError) {
    console.log('WebFinger error:', error.message);
    console.log('HTTP status:', error.status); // May be undefined
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new WebFingerError**(`message`, `status?`): [`WebFingerError`](#webfingererror)

Defined in: [src/webfinger.ts:143](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L143)

Creates a new WebFingerError instance.

###### Parameters

###### message

`string`

Error message describing what went wrong

###### status?

`number`

Optional HTTP status code if applicable

###### Returns

[`WebFingerError`](#webfingererror)

###### Overrides

`Error.constructor`

#### Methods

##### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Defined in: node\_modules/@types/node/globals.d.ts:51

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack;  // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

###### Parameters

###### targetObject

`object`

###### constructorOpt?

`Function`

###### Returns

`void`

###### Inherited from

`Error.captureStackTrace`

##### prepareStackTrace()

> `static` **prepareStackTrace**(`err`, `stackTraces`): `any`

Defined in: node\_modules/@types/node/globals.d.ts:55

###### Parameters

###### err

`Error`

###### stackTraces

`CallSite`[]

###### Returns

`any`

###### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

###### Inherited from

`Error.prepareStackTrace`

#### Properties

##### cause?

> `optional` **cause?**: `unknown`

Defined in: node\_modules/typescript/lib/lib.es2022.error.d.ts:24

###### Inherited from

`Error.cause`

##### message

> **message**: `string`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1075

###### Inherited from

`Error.message`

##### name

> **name**: `string`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1074

###### Inherited from

`Error.name`

##### stack?

> `optional` **stack?**: `string`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1076

###### Inherited from

`Error.stack`

##### status?

> `optional` **status?**: `number`

Defined in: [src/webfinger.ts:135](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L135)

HTTP status code if the error originated from an HTTP response

##### stackTraceLimit

> `static` **stackTraceLimit**: `number`

Defined in: node\_modules/@types/node/globals.d.ts:67

The `Error.stackTraceLimit` property specifies the number of stack frames
collected by a stack trace (whether generated by `new Error().stack` or
`Error.captureStackTrace(obj)`).

The default value is `10` but may be set to any valid JavaScript number. Changes
will affect any stack trace captured _after_ the value has been changed.

If set to a non-number value, or set to a negative number, stack traces will
not capture any frames.

###### Inherited from

`Error.stackTraceLimit`

## Type Aliases

### JRD

> **JRD** = `object`

Defined in: [src/webfinger.ts:77](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L77)

JSON Resource Descriptor - Raw WebFinger response format

#### Properties

##### error?

> `optional` **error?**: `string`

Defined in: [src/webfinger.ts:81](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L81)

##### links

> **links**: `Record`\<`string`, `unknown`\>[]

Defined in: [src/webfinger.ts:79](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L79)

##### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

Defined in: [src/webfinger.ts:80](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L80)

##### subject?

> `optional` **subject?**: `string`

Defined in: [src/webfinger.ts:78](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L78)

***

### LinkObject

> **LinkObject** = `object`

Defined in: [src/webfinger.ts:100](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L100)

Individual link object in WebFinger response

#### Indexable

> \[`key`: `string`\]: `string` \| `undefined`

Additional properties

#### Properties

##### href

> **href**: `string`

Defined in: [src/webfinger.ts:102](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L102)

Target URL

##### rel

> **rel**: `string`

Defined in: [src/webfinger.ts:104](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L104)

Link relation type

##### type?

> `optional` **type?**: `string`

Defined in: [src/webfinger.ts:106](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L106)

MIME type (optional)

***

### WebFingerConfig

> **WebFingerConfig** = `object`

Defined in: [src/webfinger.ts:63](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L63)

Configuration options for WebFinger client

#### Properties

##### allow\_private\_addresses

> **allow\_private\_addresses**: `boolean`

Defined in: [src/webfinger.ts:71](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L71)

Allow private/internal addresses (DANGEROUS - only for development).

##### request\_timeout

> **request\_timeout**: `number`

Defined in: [src/webfinger.ts:69](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L69)

Request timeout in milliseconds.

##### tls\_only

> **tls\_only**: `boolean`

Defined in: [src/webfinger.ts:65](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L65)

Use HTTPS only. When false, allows HTTP fallback for localhost.

##### uri\_fallback

> **uri\_fallback**: `boolean`

Defined in: [src/webfinger.ts:67](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L67)

Enable host-meta and host-meta.json fallback endpoints.

***

### WebFingerResult

> **WebFingerResult** = `object`

Defined in: [src/webfinger.ts:87](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L87)

Complete WebFinger lookup result with processed data

#### Properties

##### idx

> **idx**: `object`

Defined in: [src/webfinger.ts:89](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L89)

###### links

> **links**: `object`

###### Index Signature

\[`key`: `string`\]: [`LinkObject`](#linkobject)[]

###### properties

> **properties**: `Record`\<`string`, `unknown`\>

##### object

> **object**: [`JRD`](#jrd)

Defined in: [src/webfinger.ts:88](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L88)
