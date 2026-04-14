# SimpleCache

SimpleCache is a small in-memory cache for `roblox-ts` with:

- **LRU eviction** (Least Recently Used): when the cache is full, the least recently accessed item is removed
- **optional TTL** (Time To Live): items can expire automatically after `n` seconds

Use it to avoid repeating expensive work (computations, HTTP calls, DataStore reads, etc.).

## Install

```bash
npm i @rbxts/simple-cache
```

## Configs
```ts
interface SimpleCacheConfig {
	maxSize?: number; // default 1000
	debug?: boolean; // default false
}
```
- `maxSize`: maximum number of entries before LRU eviction kicks in
- `debug`: when `true`, logs cache actions using `warn()`

## Configs usage
```ts
new SimpleCache({
	maxSize?: number;
	debug?: boolean;
})
```

## Basic usage

```ts
import SimpleCache from "@rbxts/simple-cache";

const cache = new SimpleCache({ maxSize: 500, debug: false });

cache.set("score:blue", 1);
cache.set("score:red", 2);
print(`Blue: ${cache.get("score:blue")} - Red: ${cache.get("score:red")}`); // Blue: 1 - Red: 2
```

### TTL (Time To Live)

TTL is in **seconds**. When a value is expired, `get` returns `undefined` (and `has` becomes `false`).

```ts
DashActivated.Connect((p: Player) => {
	cache.set(`cooldown:Dash_${p.Name}`, true, 3); // expires after 3 seconds
	print(cache.get(`cooldown:Dash_${p.Name}`)) // true

	task.wait(3)

	print(cache.get(`cooldown:Dash_${p.Name}`)) // undefined
})
```

### remember (cache async work)

`remember` runs an async function once and caches its result. If the value is already cached (and not expired),
it returns the cached value and does **not** run the function again.

```ts
type Profile = { level: number };

const profiles = new SimpleCache<Profile>({ maxSize: 200 });

const profile = await profiles.remember(
	"profile:123",
	async () => {
		// ...
		return { level: 7 };
	},
	60, // keep for 60 seconds
);
```

## API

```ts
new SimpleCache<T>(config?: { maxSize?: number; debug?: boolean })

set(key: string, value: T, ttl?: number): void

get(key: string): T | undefined

has(key: string): boolean

delete(key: string): boolean

clear(): void

size(): number

remember<R>(key: string, fn: () => Promise<R>, ttl?: number): Promise<R>

benchmark(iterations?: number): {
	totalOps: number;
	durationMs: number;
	opsPerSecond: number;
	hits: number;
	misses: number;
}
```

### set

Stores a value under a key.

```ts
set(key: string, value: T, ttl?: number): void
```

- If `key` already exists, its value is replaced and it becomes “most recently used”.
- `ttl` is optional and measured in **seconds**. When provided and `> 0`, the entry expires after `ttl` seconds.

### get

Retrieves a value by key.

```ts
get(key: string): T | undefined
```

- Returns `undefined` if the key is missing or the entry is expired.
- Updates recency (LRU): a successful `get` marks the entry as “most recently used”.

### has

Checks whether a valid (non-expired) value exists for the key.

```ts
has(key: string): boolean
```

- Returns `true` only when `get(key)` would return a value.
- Note: this method calls `get` internally, so it also updates recency (LRU) when the key exists.

### delete

Removes a key from the cache.

```ts
delete(key: string): boolean
```

- Returns `true` if an entry was removed.

### clear

Removes all entries.

```ts
clear(): void
```

### size

Returns the current number of stored entries.

```ts
size(): number
```

### remember

Caches the result of an async function.

```ts
remember<R>(key: string, fn: () => Promise<R>, ttl?: number): Promise<R>
```

- If `key` is cached (and not expired), returns the cached value immediately.
- Otherwise runs `fn()`, stores its result, then returns it.
- `ttl` is optional (seconds), same as `set`.

### benchmark

Runs a simple hit/miss benchmark against the cache (useful for quick sanity/perf checks).

```ts
benchmark(iterations?: number): {
	totalOps: number;
	durationMs: number;
	opsPerSecond: number;
	hits: number;
	misses: number;
}
```

- `iterations` defaults to `100000`.
- Returns totals plus hit/miss counts and approximate throughput.