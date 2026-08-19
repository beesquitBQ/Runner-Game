export interface Poolable {
  onSpawn(): void;
  onDespawn(): void;
}

export class ObjectPool<T extends BaseScriptComponent & Poolable> {
  private available: T[] = [];
  private active: Set<T> = new Set();

  constructor(items: (T | null | undefined)[] | undefined, poolName: string = "Pool") {
    if (!items || items.length === 0) {
      print(`[ObjectPool] Увага: Пул '${poolName}' порожній.`);
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && typeof item.getSceneObject === "function") {
        const so = item.getSceneObject();
        if (so) {
          so.enabled = false;
          this.available.push(item);
        }
      } else {
        print(`[ObjectPool] Пропущено некоректний елемент у пулі '${poolName}' [${i}].`);
      }
    }
  }

  spawn(): T | null {
    const item = this.available.pop();
    if (!item) {
      return null;
    }

    const so = item.getSceneObject();
    if (so) {
      so.enabled = true;
    }

    this.active.add(item);
    item.onSpawn();
    return item;
  }

  despawn(item: T): void {
    if (!this.active.has(item)) return;

    this.active.delete(item);
    item.onDespawn();

    const so = item.getSceneObject();
    if (so) {
      so.enabled = false;
    }

    this.available.push(item);
  }

  despawnAll(): void {
    for (const item of [...this.active]) {
      this.despawn(item);
    }
  }

  get activeCount(): number {
    return this.active.size;
  }

  get availableCount(): number {
    return this.available.length;
  }
}