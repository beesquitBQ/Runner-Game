// PlayerAnimationController.ts
@component
export class PlayerAnimationController extends BaseScriptComponent {
  @input targetAnimationComponent?: Component;

  @input idleClipName: string = "Idle";
  @input runClipName: string = "Run";
  @input jumpClipName: string = "Jump";
  @input deathClipName: string = "Death";
  @input deadLoopClipName: string = "DeadLoop";
  @input getupClipName: string = "Getup";

  @input deathAnimDuration: number = 1.3;
  @input getupAnimDuration: number = 1.1;

  private currentTimer: DelayedCallbackEvent | null = null;
  private animPlayer: any = null;

  onAwake(): void {
    this.setupAnimationPlayer();
  }

  private setupAnimationPlayer(): void {
    if (!this.targetAnimationComponent) return;
    this.animPlayer = this.targetAnimationComponent as any;
  }

  private runDelayed(seconds: number, callback: () => void): void {
    if (this.currentTimer) {
      this.removeEvent(this.currentTimer);
      this.currentTimer = null;
    }

    this.currentTimer = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent;
    this.currentTimer.bind(() => {
      if (this.currentTimer) {
        this.removeEvent(this.currentTimer);
        this.currentTimer = null;
      }
      callback();
    });
    this.currentTimer.reset(seconds);
  }

  private clearTimer(): void {
    if (this.currentTimer) {
      this.removeEvent(this.currentTimer);
      this.currentTimer = null;
    }
  }

  // Принудительное и чистое переключение анимаций с обнулением весов старых клипов
  private forcePlayClip(targetClipName: string, loop: boolean = true): void {
    if (!this.animPlayer) {
      this.setupAnimationPlayer();
      if (!this.animPlayer) return;
    }

    const lowerTarget = targetClipName.toLowerCase();
    let played = false;

    try {
      // 1. Способ через массив clips в AnimationPlayer (Lens Studio v5)
      const clipsList = this.animPlayer.getClips ? this.animPlayer.getClips() : this.animPlayer.clips;

      if (clipsList && clipsList.length > 0) {
        for (let i = 0; i < clipsList.length; i++) {
          const clip = clipsList[i];
          if (!clip) continue;

          const clipName = (clip.name || "").toLowerCase();
          const isTarget = clipName === lowerTarget || clipName.includes(lowerTarget);

          if (isTarget) {
            // Включаем целевую анимацию на 100% веса с первого кадра
            if (typeof clip.weight !== "undefined") clip.weight = 1.0;
            if (typeof clip.time !== "undefined") clip.time = 0;
            if (typeof clip.play === "function") {
              clip.play(loop ? -1 : 1);
            }
            played = true;
          } else {
            // Принудительно глушим и сбрасываем все чужие анимации (особенно DeadLoop)
            if (typeof clip.weight !== "undefined") clip.weight = 0.0;
            if (typeof clip.stop === "function") {
              clip.stop();
            }
          }
        }
      }

      // 2. Дополнительный вызов нативного playClip для синхронизации
      if (typeof this.animPlayer.playClip === "function") {
        this.animPlayer.playClip(targetClipName);
      } else if (typeof this.animPlayer.playClipByName === "function") {
        this.animPlayer.playClipByName(targetClipName, 0);
      }
    } catch (err) {
      print(`[PlayerAnimationController] Ошибка переключения на '${targetClipName}': ${err}`);
    }
  }

  playIdle(): void {
    this.clearTimer();
    this.forcePlayClip(this.idleClipName, true);
  }

  playRun(): void {
    this.clearTimer();
    this.forcePlayClip(this.runClipName, true);
  }

  playJump(duration: number, onFinish: () => void): void {
    this.clearTimer();
    this.forcePlayClip(this.jumpClipName, false);
    this.runDelayed(duration, onFinish);
  }

  playDeath(onFinish: () => void): void {
    this.clearTimer();
    this.forcePlayClip(this.deathClipName, false);

    this.runDelayed(this.deathAnimDuration, () => {
      // Переключаем вес на лежачую позу
      this.forcePlayClip(this.deadLoopClipName, true);
      onFinish();
    });
  }

  playGetup(onFinish: () => void): void {
    this.clearTimer();
    // Принудительно выключаем DeadLoop и включаем Getup
    this.forcePlayClip(this.getupClipName, false);

    this.runDelayed(this.getupAnimDuration, () => {
      onFinish();
    });
  }
}