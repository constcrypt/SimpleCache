import CacheLogger from "./logger";
import { ReplicatedStorage, Workspace, RunService } from "@rbxts/services";

interface CacheInstance {
	instance: Instance;
	available: boolean;
	parent?: Instance;
	id?: string;
}

export interface SimpleCacheConfig {
	releaseContainer?: Instance;
	batchSize?: number;
	debug?: boolean;
}

/**
 * A lightweight cache for tracking and cleaning up Instances
 * also used for pooling.
 *
 * @example
 * const cache = new SimpleCache();
 */
export class SimpleCache {
	private objects = new Array<CacheInstance>();
	private cleaning = false;

	private releaseContainer: Instance;

	private activationQueue = new Array<Instance | string>();
	private running = false;

	private batchSize: number;
	private debugging: boolean;

	/**
	 * Creates a new SimpleCache instance.
	 *
	 * @param config Optional configuration for cache behavior
	 *
	 * @example
	 * const cache = new SimpleCache({ batchSize: 200, debug: true });
	 */
	constructor(config?: SimpleCacheConfig) {
		this.batchSize = config?.batchSize ?? 100;
		this.debugging = config?.debug ?? false;

		const folder = config?.releaseContainer;

		if (folder) {
			this.releaseContainer = folder as Instance;
		} else {
			let existing = ReplicatedStorage.FindFirstChild("SimpleCache") as Folder;

			if (!existing) {
				existing = new Instance("Folder");
				existing.Name = "SimpleCache";
				existing.Parent = ReplicatedStorage;
			}

			this.releaseContainer = existing;
		}

		RunService.Heartbeat.Connect((dt) => {
			this.processQueue(dt);
		});
	}

	private resolve(identifier: Instance | string): CacheInstance | undefined {
		for (const obj of this.objects) {
			if (typeOf(identifier) === "Instance" && obj.instance === identifier) {
				return obj;
			}

			if (typeOf(identifier) === "string") {
				if (obj.id === identifier || obj.instance.Name === identifier) {
					return obj;
				}
			}
		}

		return undefined;
	}

	/**
	 * Adds an instance to the cache.
	 *
	 * @param instance Instance to cache
	 * @param parent Optional initial parent
	 * @param id Optional identifier for fast lookup
	 * @returns The same instance that was cached
	 *
	 * @example
	 * cache.add(new Instance("Part"), workspace, "id_1");
	 */
	public add<T extends Instance>(instance: T, parent?: Instance, id?: string): T {
		if (this.cleaning) CacheLogger.warn("Tried adding while cache is cleaning.");

		if (parent) {
			instance.Parent = parent;
		}

		this.objects.push({
			instance,
			available: true,
			parent,
			id,
		});

		if (this.debugging) {
			CacheLogger.info(`Added "${instance.Name}" to cache.`);
		}

		return instance;
	}

	/**
	 * Gets an instance without changing its state.
	 *
	 * @param identifier Instance, name, or id
	 * @returns Cached instance or undefined
	 *
	 * @example
	 * cache.get("id_1");
	 */
	public get(identifier: Instance | string): Instance | undefined {
		const obj = this.resolve(identifier);
		if (!obj || !obj.available) return undefined;

		return obj.instance;
	}

	/**
	 * Activates an instance and moves it into the world.
	 *
	 * @param identifier Instance, name, or id
	 * @param parent Optional parent (defaults to Workspace)
	 * @returns Activated instance or undefined
	 *
	 * @example
	 * cache.use("id_1");
	 * cache.use("id_2", someFolder);
	 */
	public use(identifier: Instance | string, parent?: Instance): Instance | undefined {
		const obj = this.resolve(identifier);
		if (!obj || !obj.available) return undefined;

		obj.available = false;

		const targetParent = parent ?? Workspace;
		obj.instance.Parent = targetParent;

		if (this.debugging) {
			CacheLogger.info(`Using "${obj.instance.Name}"`);
		}

		return obj.instance;
	}

	/**
	 * Queues multiple instances for batch activation.
	 *
	 * @param identifiers List of instance ids or instances
	 *
	 * @example
	 * cache.useMany(["id_1", "id_2"]);
	 */
	public useMany(identifiers: Array<Instance | string>) {
		for (const id of identifiers) {
			this.activationQueue.push(id);
		}
	}

	private processQueue(dt: number) {
		if (this.activationQueue.size() === 0) return;

		if (dt > 0.03) {
			this.batchSize = math.max(50, this.batchSize - 25);
		} else if (dt < 0.015) {
			this.batchSize = math.min(1000, this.batchSize + 25);
		}

		const count = math.min(this.batchSize, this.activationQueue.size());

		for (let i = 0; i < count; i++) {
			const id = this.activationQueue.shift();
			if (!id) continue;

			this.use(id);
		}
	}

	/**
	 * Releases an instance back into the pool.
	 *
	 * @param identifier Instance, name, or id
	 * @returns True if successfully released
	 *
	 * @example
	 * cache.release("id_1");
	 */
	public release(identifier: Instance | string): boolean {
		const obj = this.resolve(identifier);

		if (!obj || obj.available) return false;

		obj.available = true;
		obj.instance.Parent = this.releaseContainer;

		if (this.debugging) {
			CacheLogger.info(`Released "${obj.instance.Name}"`);
		}

		return true;
	}

	/**
	 * Checks if an instance is currently in use.
	 *
	 * @param identifier Instance, name, or id
	 * @returns True if in use
	 */
	public isInUse(identifier: Instance | string): boolean {
		const obj = this.resolve(identifier);
		return obj !== undefined && !obj.available;
	}

	/**
	 * Clears the cache without destroying instances.
	 *
	 * @example
	 * cache.clean();
	 */
	public clean() {
		if (this.cleaning) {
			CacheLogger.warn("Tried cleaning while already cleaning.");
			return;
		}

		this.cleaning = true;

		this.objects.clear();

		if (this.debugging) {
			CacheLogger.info("Cache cleaned.");
		}

		this.cleaning = false;
	}

	/**
	 * Destroys all cached instances and clears the cache.
	 *
	 * @example
	 * cache.destroy();
	 */
	public destroy() {
		if (this.cleaning) {
			CacheLogger.warn("Tried destroying while already cleaning.");
			return;
		}

		this.cleaning = true;

		for (const obj of this.objects) {
			obj.instance.Destroy();
		}

		this.objects.clear();

		if (this.debugging) {
			CacheLogger.info("Cache destroyed.");
		}

		this.cleaning = false;
	}
}