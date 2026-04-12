import CacheLogger from "./logger";

interface CacheInstance {
  instance: Instance;
  parent?: Instance;
  id?: string;
}

/**
 * A lightweight cache for tracking and cleaning up Instances.
 * Works similarly to Trove, but only handles Instances.
 *
 * @example
 * const cache = new SimpleCache();
 */
export class SimpleCache {
  private objects = new Array<CacheInstance>();
  private cleaning = false;
  private debugging = false;

  /**
   * Internal helper used to find a cached entry.
   *
   * @param identifier Instance, name, or id used to find the object
   * @returns The matching cache entry if found
   *
   * @example
   * cache.get("myPart")
   */
  private resolve(identifier: Instance | string): CacheInstance | undefined {
    for (const obj of this.objects) {
      if (typeOf(identifier) === "Instance" && obj.instance === identifier) {
        return obj;
      }

      if (typeOf(identifier) === "string" && obj.id === identifier) {
        return obj;
      }

      if (typeOf(identifier) === "string" && obj.instance.Name === identifier) {
        return obj;
      }
    }

    return undefined;
  }

  /**
   * Adds an instance to the cache.
   *
   * @param instance The instance to store
   * @param parent Optional parent to assign immediately
   * @param id Optional id for easier lookup later
   * @returns The same instance that was added
   *
   * @example
   * const part = cache.add(new Instance("Part"), workspace, "mainPart");
   */
  public add<T extends Instance>(
    instance: T,
    parent?: Instance,
    id?: string,
  ): T {
    if (this.cleaning) CacheLogger.warn("Tried adding while cache is cleaning.");

    if (parent) {
      instance.Parent = parent;
    }

    this.objects.push({
      instance,
      parent,
      id,
    });

    if (this.debugging) CacheLogger.info(`Added "${instance.Name}" to cache.`);

    return instance;
  }

  /**
   * Removes an instance from the cache and destroys it.
   *
   * @param identifier Instance, name, or id
   * @returns True if something was removed, false if nothing matched
   *
   * @example
   * cache.remove("mainPart");
   */
  public remove(identifier: Instance | string): boolean {
    const index = this.objects.findIndex((obj) => {
      if (typeOf(identifier) === "Instance") {
        return obj.instance === identifier;
      }

      return obj.id === identifier || obj.instance.Name === identifier;
    });

    if (index === -1) {
      CacheLogger.warn(`Remove failed: "${tostring(identifier)}" not found.`);
      return false;
    }

    const entry = this.objects[index];
    this.objects.remove(index);

    entry.instance.Destroy();

    if (this.debugging) CacheLogger.info(`Removed "${entry.instance.Name}" from cache.`);

    return true;
  }

  /**
   * Checks if something exists in the cache.
   *
   * @param identifier Instance, name, or id
   * @returns True if found, otherwise false
   *
   * @example
   * cache.has("mainPart");
   */
  public has(identifier: Instance | string): boolean {
    return this.resolve(identifier) !== undefined;
  }

  /**
   * Gets an instance from the cache.
   *
   * @param identifier Instance, name, or id
   * @returns The instance if found
   *
   * @example
   * const part = cache.get("mainPart");
   */
  public get(identifier: Instance | string): Instance | undefined {
    return this.resolve(identifier)?.instance;
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

    if (this.debugging) CacheLogger.info(`Cleaning cache (${this.objects.size()} items)`);

    this.objects.clear();

    this.cleaning = false;
  }

  /**
   * Destroys everything in the cache and clears it.
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

    if (this.debugging) CacheLogger.info(`Destroying cache (${this.objects.size()} items)`);

    for (const obj of this.objects) {
      if (obj.instance.Parent) {
        obj.instance.Destroy();
      }
    }

    this.objects.clear();

    if (this.debugging) CacheLogger.info("Cache destroyed.");

    this.cleaning = false;
  }

  public setDebugMode(enabled: boolean) {
    this.debugging = enabled
  }
}