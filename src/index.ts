function log(msg: string) {
	return warn(`[SIMPLE-CACHE | DEBUG] - ${msg}`)
}

interface SimpleCacheConfig {
	maxSize?: number;
	debug?: boolean;
}

/**
 * Simple LRU (Least Recently Used) cache with optional TTL (Time To Live) support.
 */
export default class SimpleCache<T = unknown> {
	private store: Map<string, { value: T; expiresAt: number | undefined }>;
	private order: string[];
	private maxSize: number;
	private debug: boolean;

	/**
	 * @description Create a new cache.
	 * @param maxSize max number of items before old ones get removed
	 */
	constructor(config: SimpleCacheConfig = {}) {
		this.store = new Map();
		this.order = [];
		this.maxSize = config.maxSize ?? 1000;
		this.debug = config.debug ?? false;
	}

	/**
	 * @description Save something in the cache.
	 * If key exists it replaces it.
	 */
	public set(key: string, value: T, ttl = 0): void {
		const expiresAt = ttl > 0 ? os.clock() + ttl : undefined;

		if (this.store.has(key)) {
			this.removeFromOrder(key);
		}

		this.store.set(key, { value, expiresAt });
		this.order.push(key);

		this.enforceLimit();

		if (this.debug) {
			log(`SET ${key}`);
		}
	}

	/**
	 * @description Get something from cache.
	 * @returns undefined if missing or expired.
	 */
	public get(key: string): T | undefined {
		const entry = this.store.get(key);
		if (!entry) return undefined;

		if (entry.expiresAt && os.clock() > entry.expiresAt) {
			this.delete(key);

			if (this.debug) {
				log(`EXPIRED ${key}`);
			}

			return undefined;
		}

		this.touch(key);

		if (this.debug) {
			log(`GET ${key}`);
		}

		return entry.value;
	}

	/**
	 * @description Check if a key exists.
	 */
	public has(key: string): boolean {
		return this.get(key) !== undefined;
	}

	/**
	 * @description Remove a key from cache.
	 */
	public delete(key: string): boolean {
		this.removeFromOrder(key);
		return this.store.delete(key);
	}

	/**
	 * @description Clear everything.
	 */
	public clear(): void {
		this.store.clear();
		this.order = [];

		if (this.debug) {
			log(`CLEAR`);
		}
	}

	/**
	 * @description How many items are in cache.
	 */
	public size(): number {
		return this.store.size();
	}

	/**
	 * @description Runs a function and caches the result.
	 * If it already exists, it won't run again.
	 */
	public async remember<R>(key: string, fn: () => Promise<R>, ttl = 0): Promise<R> {
		const cached = this.get(key);
		if (cached !== undefined) return cached as unknown as R;

		const result = await fn();
		this.set(key, result as unknown as T, ttl);
		return result as unknown as R;
	}

	/**
	 * @description Quick benchmark to see how fast it runs.
	 */
	public benchmark(iterations = 100000) {
		let hits = 0;
		let misses = 0;

		const start = os.clock();

		for (let i = 0; i < iterations; i++) {
			const key = "key_" + (i % 1000);

			const value = this.get(key);

			if (value !== undefined) {
				hits++;
			} else {
				misses++;
				this.set(key, i as unknown as T);
			}
		}

		const duration = os.clock() - start;

		return {
			totalOps: iterations,
			durationMs: duration * 1000,
			opsPerSecond: math.round((iterations / duration)),
			hits,
			misses,
		};
	}

	private touch(key: string): void {
		this.removeFromOrder(key);
		this.order.push(key);
	}

	private removeFromOrder(key: string): void {
		const index = this.order.indexOf(key);
		if (index !== -1) {
			this.order.remove(index + 1);
		}
	}

	private enforceLimit(): void {
		while (this.store.size() > this.maxSize) {
			const oldest = this.order.shift();

			if (oldest !== undefined) {
				this.store.delete(oldest);
			}
		}
	}
}