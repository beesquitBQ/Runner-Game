import { PlayerAnimationController } from "./PlayerAnimationController";
import { LANE_COUNT } from "../Core/GameConfig";

@component
export class PlayerController extends BaseScriptComponent {
  @input animController!: PlayerAnimationController;
  @input laneWidth: number = 20;
  @input laneSmoothness: number = 10;
  @input tiltAngle: number = 8;

  // Звичайний стрибок
  @input jumpHeight: number = 30;
  @input jumpDuration: number = 0.68;
  @input jumpForwardDistance: number = 20;

  // Супер-стрибок (батут)
  @input boostedJumpHeight: number = 65;
  @input boostedJumpDuration: number = 1.35;
  @input boostedForwardDistance: number = 40;

  // Невразливість
  @input landingGraceDuration: number = 0.35;
  @input invulnerabilityDuration: number = 1.2;
  @input characterVisualMesh?: SceneObject;

  private currentLane: number = 1;
  private targetX: number = 0;

  private currentFloorY: number = 0;
  private baseY: number = 0;
  private baseZ: number = 0;
  private floorStack: number[] = [];

  private airborne: boolean = false;
  private boosted: boolean = false;
  private jumpElapsed: number = 0;
  private activeJumpDuration: number = 0;
  private activeJumpHeight: number = 0;
  private activeForwardDist: number = 0;

  private landingGraceTimer: number = 0;
  private invulnerable: boolean = false;
  private invulnTimer: number = 0;
  private dead: boolean = false;
  private isGettingUp: boolean = false;

  onAwake(): void {
    (global as any).playerController = this;

    const pos = this.getTransform().getLocalPosition();
    this.baseY = pos.y;
    this.currentFloorY = pos.y;
    this.baseZ = pos.z;
    this.targetX = this.laneXForIndex(this.currentLane);

    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
  }

  laneXForIndex(i: number): number {
    return (i - 1) * this.laneWidth;
  }

  raiseFloor(height: number): void {
    if (!this.floorStack.includes(height)) {
      this.floorStack.push(height);
      this.recalcFloor();
    }
  }

  lowerFloor(height: number): void {
    const idx = this.floorStack.indexOf(height);
    if (idx >= 0) {
      this.floorStack.splice(idx, 1);
      this.recalcFloor();
    }
  }

  private recalcFloor(): void {
    const top = this.floorStack.length > 0 ? Math.max(...this.floorStack) : 0;
    this.currentFloorY = this.baseY + top;
  }

  getFloorHeight(): number {
    return this.currentFloorY - this.baseY;
  }

  resetToIdle(): void {
    this.dead = false;
    this.isGettingUp = false;
    this.airborne = false;
    this.boosted = false;
    this.invulnerable = false;
    this.landingGraceTimer = 0;
    this.currentLane = 1;
    this.targetX = this.laneXForIndex(1);
    this.floorStack = [];
    this.currentFloorY = this.baseY;

    const t = this.getTransform();
    t.setLocalPosition(new vec3(this.targetX, this.baseY, this.baseZ));
    t.setLocalRotation(quat.quatIdentity());

    if (this.characterVisualMesh) this.characterVisualMesh.enabled = true;
    if (this.animController) this.animController.playIdle();
  }

  startRunning(): void {
    if (this.animController) this.animController.playRun();
  }

  moveLane(direction: number): void {
    if (this.dead || this.isGettingUp) return;
    const next = Math.max(0, Math.min(LANE_COUNT - 1, this.currentLane + direction));
    this.currentLane = next;
    this.targetX = this.laneXForIndex(next);
  }

  jump(boosted: boolean = false): void {
    if (this.dead || this.isGettingUp || this.airborne) return;

    this.airborne = true;
    this.boosted = boosted;
    this.jumpElapsed = 0;
    this.activeJumpDuration = boosted ? this.boostedJumpDuration : this.jumpDuration;
    this.activeJumpHeight = boosted ? this.boostedJumpHeight : this.jumpHeight;
    this.activeForwardDist = boosted ? this.boostedForwardDistance : this.jumpForwardDistance;

    if (this.animController) {
      this.animController.playJump(this.activeJumpDuration, () => {
        if (!this.dead && !this.isGettingUp) {
          this.animController.playRun();
        }
      });
    }
  }

  isAirborne(): boolean {
    return this.airborne;
  }

  isBoosted(): boolean {
    return this.boosted;
  }

  getIsInvulnerable(): boolean {
    return this.invulnerable || this.boosted || this.landingGraceTimer > 0;
  }

  playHitReaction(): void {
    this.invulnerable = true;
    this.invulnTimer = 0;
  }

  die(onAnimComplete: () => void): void {
    if (this.dead) return;
    this.dead = true;
    this.airborne = false;
    this.boosted = false;
    this.invulnerable = false;
    this.landingGraceTimer = 0;
    this.floorStack = [];
    this.currentFloorY = this.baseY;

    if (this.characterVisualMesh) this.characterVisualMesh.enabled = true;
    this.getTransform().setLocalRotation(quat.quatIdentity());

    if (this.animController) {
      this.animController.playDeath(() => onAnimComplete());
    } else {
      onAnimComplete();
    }
  }

  reviveAndRun(onReadyToRun: () => void): void {
    this.isGettingUp = true;
    this.dead = false;
    this.airborne = false;
    this.boosted = false;
    this.invulnerable = false;
    this.landingGraceTimer = 0;

    if (this.animController) {
      this.animController.playGetup(() => {
        this.isGettingUp = false;
        this.animController.playRun();
        onReadyToRun();
      });
    } else {
      this.isGettingUp = false;
      onReadyToRun();
    }
  }

  private onUpdate(): void {
    const dt = getDeltaTime();
    const t = this.getTransform();
    const pos = t.getLocalPosition();

    // 1. Зміна смуги з нахилом корпусу
    if (!this.dead) {
      const prevX = pos.x;
      pos.x = MathUtils.lerp(pos.x, this.targetX, 1 - Math.exp(-this.laneSmoothness * dt));
      const deltaX = pos.x - prevX;

      const tilt = Math.max(-15, Math.min(15, -deltaX * this.tiltAngle * 10));
      const tiltRad = (tilt * Math.PI) / 180;
      t.setLocalRotation(quat.fromEulerVec(new vec3(0, 0, tiltRad)));
    }

    // 2. Логіка траєкторії стрибка
    if (this.airborne) {
      this.jumpElapsed += dt;
      const progress = Math.min(this.jumpElapsed / this.activeJumpDuration, 1);

      pos.y = this.currentFloorY + Math.sin(Math.PI * progress) * this.activeJumpHeight;
      pos.z = this.baseZ + Math.sin(Math.PI * progress) * this.activeForwardDist;

      if (progress >= 1) {
        this.airborne = false;
        this.boosted = false;
        pos.y = this.currentFloorY;
        pos.z = this.baseZ;
        this.landingGraceTimer = this.landingGraceDuration;
      }
    } else if (!this.dead) {
      pos.y = MathUtils.lerp(pos.y, this.currentFloorY, 1 - Math.exp(-15 * dt));
      pos.z = this.baseZ;
    }

    t.setLocalPosition(pos);

    if (this.landingGraceTimer > 0) {
      this.landingGraceTimer -= dt;
    }

    // 3. Миготіння моделі під час невразливості
    if (this.invulnerable) {
      this.invulnTimer += dt;
      if (this.characterVisualMesh) {
        this.characterVisualMesh.enabled = Math.floor(this.invulnTimer * 12) % 2 === 0;
      }
      if (this.invulnTimer >= this.invulnerabilityDuration) {
        this.invulnerable = false;
        if (this.characterVisualMesh) this.characterVisualMesh.enabled = true;
      }
    }
  }
}