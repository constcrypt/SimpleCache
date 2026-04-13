# SimpleCache

A lightweight cache for **Instances** on Roblox. You add objects once, look them up by instance reference, `Name`, or optional `id`, move them in and out of the world with `use` / `release`, and tear everything down with `destroy`. It only pools and tracks `Instance` objects.

## Configuration

### `SimpleCacheConfig`

```ts
interface SimpleCacheConfig {
	releaseContainer?: Instance;
	batchSize?: number;
	debug?: boolean;
}
```

| Option | Description |
|--------|-------------|
| `releaseContainer` | Folder (or any `Instance`) where pooled instances are parented when released. If omitted, a folder named `SimpleCache` under `ReplicatedStorage` is created (or reused) automatically. |
| `batchSize` | How many queued activations to process per Heartbeat tick when using `useMany`. Defaults to `100` and is adjusted automatically based on frame time (roughly between `50` and `1000`). |
| `debug` | When `true`, the cache logs add, use, release, clean, and destroy activity. |

## API

### Constructor

```ts
const cache = new SimpleCache();
const cache = new SimpleCache({
	releaseContainer: myFolder,
	batchSize: 200,
	debug: true,
});
```

On construction, the cache subscribes to `RunService.Heartbeat` to drain the activation queue used by `useMany`.

### Identifiers

Methods that take an `identifier` accept either:

- The **cached `Instance`** itself, or  
- A **string** matching the instance’s optional `id` **or** its `Name`

The first matching entry in the internal list wins.

### `SimpleCache.add`

```ts
add<T extends Instance>(instance: T, parent?: Instance, id?: string): T
```

Registers an instance in the cache. If `parent` is given, `instance.Parent` is set immediately. Optional `id` enables lookup by that string in addition to `Name`.

Returns the same instance.

### `SimpleCache.get`

```ts
get(identifier: Instance | string): Instance | undefined
```

Returns the cached instance if it exists and is **available** (not currently “in use”). Does not change availability or parenting.

### `SimpleCache.use`

```ts
use(identifier: Instance | string, parent?: Instance): Instance | undefined
```

Marks the instance as in use, parents it to `parent` or **`Workspace`** if `parent` is omitted, and returns the instance. Returns `undefined` if nothing matches or the object is not available.

### `SimpleCache.useMany`

```ts
useMany(identifiers: Array<Instance | string>): void
```

Enqueues many instances for activation. Activations are processed in batches each frame according to `batchSize` (and the adaptive logic described above). Each item is activated with `use` (default parent `Workspace`).

### `SimpleCache.release`

```ts
release(identifier: Instance | string): boolean
```

If the instance is in the cache and **not** available (in use), marks it available again and parents it to the release container (`releaseContainer` or the default `ReplicatedStorage.SimpleCache` folder). Returns `true` on success, `false` if there is nothing to release or it was already available.

### `SimpleCache.isInUse`

```ts
isInUse(identifier: Instance | string): boolean
```

Returns whether a matching entry exists and is currently in use (`use` without a matching `release`).

### `SimpleCache.clean`

```ts
clean(): void
```

Clears the cache’s internal list **without** calling `Destroy` on instances. Instances are no longer tracked; you are responsible for them afterward.

### `SimpleCache.destroy`

```ts
destroy(): void
```

Calls `Destroy()` on every cached instance, then clears the list.

## Example

```ts
class ProjectilePool {
	private cache = new SimpleCache({
		debug: false,
	});

	constructor() {
		for (let i = 0; i < 20; i++) {
			const part = new Instance("Part");
			part.Name = `Projectile_${i}`;
			this.cache.add(part, undefined, `proj_${i}`);
		}
	}

	public fireFrom(origin: CFrame) {
		const proj = this.cache.use("proj_0");
		if (proj) {
			(proj as BasePart).CFrame = origin;
		}
	}

	public fireBurst(identifiers: Array<string>) {
		this.cache.useMany(identifiers);
	}

	public recycle(instance: Instance) {
		this.cache.release(instance);
	}

	public dispose() {
		this.cache.destroy();
	}
}
```

When you only need to drop tracking and not destroy pooled parts, call `clean()` instead of `destroy()`.
