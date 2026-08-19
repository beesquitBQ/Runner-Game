import { Poolable } from "../Utils/ObjectPool";
import { GameEvents, EVENTS } from "../Core/GameEvents";

@component
export class Coin extends BaseScriptComponent implements Poolable {
  @input visuals?: SceneObject;
  @input recycleZ: number = -40;
  @input laneIndex: number = 1;

  private collected: boolean = false;

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
  }

  setLane(lane: number): void {
    this.laneIndex = lane;
  }

  private collect(): void {
    if (this.collected) return;
    this.collected = true;
    if (this.visuals) this.visuals.enabled = false;
    GameEvents.emit(EVENTS.COIN_COLLECTED, this);
  }

  private onUpdate(): void {
    const sm = (global as any).spawnManager;
    if (!sm || !sm.getCurrentSpeed()) return;

    const t = this.getTransform();
    const pos = t.getLocalPosition();
    const dt = getDeltaTime();

    pos.z -= sm.getCurrentSpeed() * dt;
    t.setLocalPosition(pos);

    // Перевірка збору монети гравцем
    if (!this.collected) {
      const player = (global as any).playerController;
      if (player) {
        const playerPos = player.getTransform().getLocalPosition();
        const distZ = Math.abs(pos.z - playerPos.z);
        const distX = Math.abs(pos.x - playerPos.x);

        if (distX < 12 && distZ < 15) {
          this.collect();
        }
      }
    }

    if (pos.z < this.recycleZ) {
      sm.recycleCoin(this);
    }
  }

  onSpawn(): void {
    this.collected = false;
    if (this.visuals) this.visuals.enabled = true;
  }

  onDespawn(): void {
    this.collected = true;
  }
}