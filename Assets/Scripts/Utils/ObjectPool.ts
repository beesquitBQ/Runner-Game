// ObjectPool.ts
export interface Poolable {
  onSpawn(): void;
  onDespawn(): void;
}

export class ObjectPool<T extends BaseScriptComponent & Poolable> {
  private available: T[] = [];
  private active: Set<T> = new Set();

  constructor(items: (T | null | undefined)[] | undefined, poolName: string = "Pool") {
    if (!items || items.length === 0) {
      print(`[ObjectPool] Внимание: Пул '${poolName}' пуст! Проверьте привязку объектов в инспекторе SpawnManager.`);
      return;
    }

    // Фильтруем пустые слоты (null/undefined), чтобы скрипт не падал
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && typeof item.getSceneObject === "function") {
        const so = item.getSceneObject();
        if (so) {
          so.enabled = false;
          this.available.push(item);
        }
      } else {
        print(`[ObjectPool] Пропущен пустой/некорректный элемент в пуле '${poolName}' под индексом [${i}].`);
      }
    }
  }

  spawn(): T | null {
    const item = this.available.pop();
    if (!item) {
      // Все объекты из пула сейчас на экране
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