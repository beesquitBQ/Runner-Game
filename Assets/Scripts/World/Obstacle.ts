// Obstacle.ts
import { ObstacleKind } from "../Core/GameConfig";
import { Poolable } from "../Utils/ObjectPool";
import { GameEvents, EVENTS } from "../Core/GameEvents";

@component
export class Obstacle extends BaseScriptComponent implements Poolable {
  @input kind: string = ObstacleKind.Small;
  @input recycleZ: number = -40;
  @input obstacleHeight: number = 18;
  @input depthZ: number = 14;

  private triggered: boolean = false;
  private isPlayerOnTop: boolean = false;

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
  }

  getKind(): string {
    return this.kind === ObstacleKind.Large ? ObstacleKind.Large : ObstacleKind.Small;
  }

  private onUpdate(): void {
    const sm = (global as any).spawnManager;
    if (!sm || !sm.getCurrentSpeed()) return;

    const t = this.getTransform();
    const pos = t.getLocalPosition();
    const dt = getDeltaTime();

    pos.z -= sm.getCurrentSpeed() * dt;
    t.setLocalPosition(pos);

    const player = (global as any).playerController;
    if (player) {
      const playerPos = player.getTransform().getLocalPosition();
      const distX = Math.abs(pos.x - playerPos.x);
      const distZ = Math.abs(pos.z - playerPos.z);

      if (distX < 12 && distZ < this.depthZ) {
        const isSmall = this.getKind() === ObstacleKind.Small;

        if (isSmall) {
          // Более лояльный порог прыжка: достаточно преодолеть 45% высоты препятствия
          const clearThreshold = this.obstacleHeight * 0.45;
          const playerRelativeY = playerPos.y - player.getFloorHeight();

          if (player.isAirborne() && playerRelativeY >= clearThreshold) {
            // Успешно перепрыгнул
          } else if (!this.triggered && !player.getIsInvulnerable()) {
            this.triggered = true;
            GameEvents.emit(EVENTS.PLAYER_HIT_SMALL, this);
          }
        } else {
          // Большое препятствие
          if (playerPos.y >= this.obstacleHeight - 3) {
            if (!this.isPlayerOnTop) {
              this.isPlayerOnTop = true;
              player.raiseFloor(this.obstacleHeight);
            }
          } else if (!this.triggered && !player.getIsInvulnerable()) {
            this.triggered = true;
            GameEvents.emit(EVENTS.PLAYER_HIT_LARGE, this);
          }
        }
      } else if (this.isPlayerOnTop && distZ >= this.depthZ) {
        this.isPlayerOnTop = false;
        player.lowerFloor(this.obstacleHeight);
      }
    }

    if (pos.z < this.recycleZ) {
      sm.recycleObstacle(this);
    }
  }

  onSpawn(): void {
    this.triggered = false;
    this.isPlayerOnTop = false;
  }

  onDespawn(): void {
    const player = (global as any).playerController;
    if (player && this.isPlayerOnTop) {
      player.lowerFloor(this.obstacleHeight);
    }
    this.isPlayerOnTop = false;
    this.triggered = false;
  }
}