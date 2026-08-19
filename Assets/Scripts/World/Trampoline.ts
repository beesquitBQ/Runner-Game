// Trampoline.ts
import { Poolable } from "../Utils/ObjectPool";

@component
export class Trampoline extends BaseScriptComponent implements Poolable {
  @input recycleZ: number = -40;
  @input depthZ: number = 15;

  private triggered: boolean = false;

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
  }

  private onUpdate(): void {
    const sm = (global as any).spawnManager;
    if (!sm || !sm.getCurrentSpeed()) return;

    const t = this.getTransform();
    const pos = t.getLocalPosition();
    const dt = getDeltaTime();

    pos.z -= sm.getCurrentSpeed() * dt;
    t.setLocalPosition(pos);

    // Координатная проверка наступания на трамплин
    if (!this.triggered) {
      const player = (global as any).playerController;
      if (player) {
        const playerPos = player.getTransform().getLocalPosition();
        const distX = Math.abs(pos.x - playerPos.x);
        const distZ = Math.abs(pos.z - playerPos.z);

        if (distX < 12 && distZ < this.depthZ) {
          this.triggered = true;
          // Активируем мощный высокий прыжок
          player.jump(true);
        }
      }
    }

    if (pos.z < this.recycleZ) {
      sm.recycleTrampoline(this);
    }
  }

  onSpawn(): void {
    this.triggered = false;
  }

  onDespawn(): void {
    this.triggered = true;
  }
}