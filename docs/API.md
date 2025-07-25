**webfinger.js v2.8.0**

***

# webfinger.js v2.8.0

## Classes

### default

Defined in: [src/webfinger.ts:127](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L127)

WebFinger client for discovering user information across domains.

#### Example

```typescript
const webfinger = new WebFinger({
  webfist_fallback: true,
  tls_only: true
});

const result = await webfinger.lookup('user@domain.com');
console.log(result.idx.properties.name);
```

#### Constructors

##### Constructor

> **new default**(`cfg`): [`default`](#default)

Defined in: [src/webfinger.ts:139](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L139)

Creates a new WebFinger client instance.

###### Parameters

###### cfg

`Partial`\<[`WebFingerConfig`](#webfingerconfig)\> = `{}`

Configuration options for the WebFinger client

###### Returns

[`default`](#default)

#### Methods

##### lookup()

> **lookup**(`address`): `Promise`\<[`WebFingerResult`](#webfingerresult)\>

Defined in: [src/webfinger.ts:258](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L258)

Performs a WebFinger lookup for the given address.

###### Parameters

###### address

`string`

Email-like address (user@domain.com) or full URI to look up

###### Returns

`Promise`\<[`WebFingerResult`](#webfingerresult)\>

Promise resolving to WebFinger result with indexed links and properties

###### Throws

When lookup fails or address is invalid

###### Example

```typescript
try {
  const result = await webfinger.lookup('nick@silverbucket.net');
  console.log('Name:', result.idx.properties.name);
  console.log('Avatar:', result.idx.links.avatar?.[0]?.href);
} catch (error) {
  console.error('Lookup failed:', error.message);
}
```

##### lookupLink()

> **lookupLink**(`address`, `rel`): `Promise`\<[`LinkObject`](#linkobject)\>

Defined in: [src/webfinger.ts:364](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L364)

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

Defined in: [src/webfinger.ts:103](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L103)

Custom error class for WebFinger-specific errors

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new WebFingerError**(`message`, `status?`): [`WebFingerError`](#webfingererror)

Defined in: [src/webfinger.ts:106](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L106)

###### Parameters

###### message

`string`

###### status?

`number`

###### Returns

[`WebFingerError`](#webfingererror)

###### Overrides

`Error.constructor`

#### Properties

##### cause?

> `optional` **cause**: `unknown`

Defined in: node\_modules/typescript/lib/lib.es2022.error.d.ts:26

###### Inherited from

`Error.cause`

##### message

> **message**: `string`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1077

###### Inherited from

`Error.message`

##### name

> **name**: `string`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1076

###### Inherited from

`Error.name`

##### stack?

> `optional` **stack**: `string`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1078

###### Inherited from

`Error.stack`

##### status?

> `optional` **status**: `number`

Defined in: [src/webfinger.ts:104](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L104)

## Type Aliases

### JRD

> **JRD** = `object`

Defined in: [src/webfinger.ts:67](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L67)

JSON Resource Descriptor - Raw WebFinger response format

#### Properties

##### error?

> `optional` **error**: `string`

Defined in: [src/webfinger.ts:70](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L70)

##### links

> **links**: `Record`\<`string`, `unknown`\>[]

Defined in: [src/webfinger.ts:68](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L68)

##### properties?

> `optional` **properties**: `Record`\<`string`, `unknown`\>

Defined in: [src/webfinger.ts:69](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L69)

***

### LinkObject

> **LinkObject** = `object`

Defined in: [src/webfinger.ts:89](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L89)

Individual link object in WebFinger response

#### Indexable

\[`key`: `string`\]: `undefined` \| `string`

Additional properties

#### Properties

##### href

> **href**: `string`

Defined in: [src/webfinger.ts:91](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L91)

Target URL

##### rel

> **rel**: `string`

Defined in: [src/webfinger.ts:93](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L93)

Link relation type

##### type?

> `optional` **type**: `string`

Defined in: [src/webfinger.ts:95](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L95)

MIME type (optional)

***

### WebFingerConfig

> **WebFingerConfig** = `object`

Defined in: [src/webfinger.ts:53](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L53)

Configuration options for WebFinger client

#### Properties

##### request\_timeout

> **request\_timeout**: `number`

Defined in: [src/webfinger.ts:61](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L61)

Request timeout in milliseconds.

##### tls\_only

> **tls\_only**: `boolean`

Defined in: [src/webfinger.ts:55](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L55)

Use HTTPS only. When false, allows HTTP fallback for localhost.

##### uri\_fallback

> **uri\_fallback**: `boolean`

Defined in: [src/webfinger.ts:59](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L59)

Enable host-meta and host-meta.json fallback endpoints.

##### webfist\_fallback

> **webfist\_fallback**: `boolean`

Defined in: [src/webfinger.ts:57](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L57)

Enable WebFist fallback service for discovering WebFinger endpoints.

***

### WebFingerResult

> **WebFingerResult** = `object`

Defined in: [src/webfinger.ts:76](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L76)

Complete WebFinger lookup result with processed data

#### Properties

##### idx

> **idx**: `object`

Defined in: [src/webfinger.ts:78](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L78)

###### links

> **links**: `object`

###### Index Signature

\[`key`: `string`\]: [`LinkObject`](#linkobject)[]

###### properties

> **properties**: `Record`\<`string`, `unknown`\>

##### object

> **object**: [`JRD`](#jrd)

Defined in: [src/webfinger.ts:77](https://github.com/silverbucket/webfinger.js/blob/master/src/webfinger.ts#L77)
