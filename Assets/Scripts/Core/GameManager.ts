// GameManager.ts
import { GameState, START_LIVES } from "./GameConfig";
import { GameEvents, EVENTS } from "./GameEvents";

@component
export class GameManager extends BaseScriptComponent {
  @input scoreText?: Text;
  @input coinsText?: Text;
  @input livesText?: Text;
  @input comboText?: Text;
  @input gameOverUI?: SceneObject;
  @input tapToStartUI?: SceneObject;

  // ЗВУКИ И МУЗЫКА (AudioComponent)
  @input bgmAudio?: AudioComponent;        // Фоновая музыка (зацикленная)
  @input coinAudio?: AudioComponent;       // Звук сбора монетки
  @input hitAudio?: AudioComponent;        // Звук получения урона
  @input gameOverAudio?: AudioComponent;   // Звук поражения

  private state: GameState = GameState.Idle;
  private score: number = 0;
  private coins: number = 0;
  private lives: number = START_LIVES;
  private comboCount: number = 0;

  onAwake(): void {
    (global as any).gameManager = this;

    GameEvents.on(EVENTS.COIN_COLLECTED, () => this.addCoin());
    GameEvents.on(EVENTS.PLAYER_HIT_SMALL, () => this.takeDamage(1));
    GameEvents.on(EVENTS.PLAYER_HIT_LARGE, () => this.takeDamage(START_LIVES));

    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
    this.updateUI();

    if (this.gameOverUI) this.gameOverUI.enabled = false;
    if (this.tapToStartUI) this.tapToStartUI.enabled = true;
  }

  private playSound(audio?: AudioComponent, loop: boolean = false): void {
    if (!audio) return;
    try {
      audio.stop(false);
      audio.play(loop ? -1 : 1);
    } catch (e) {}
  }

  private stopSound(audio?: AudioComponent): void {
    if (!audio) return;
    try {
      audio.stop(false);
    } catch (e) {}
  }

  private onUpdate(): void {
    if (this.state === GameState.Playing) {
      const sm = (global as any).spawnManager;
      const speed = sm ? sm.getCurrentSpeed() : 30;
      this.score += speed * getDeltaTime() * 0.15;
      this.updateUI();
    }
  }

  onTap(): void {
    if (this.state === GameState.Idle) {
      this.startGame();
    } else if (this.state === GameState.GameOver) {
      this.restartGameFlow();
    }
  }

  onSwipeLeft(): void {
    if (this.state === GameState.Playing) (global as any).playerController?.moveLane(-1);
  }

  onSwipeRight(): void {
    if (this.state === GameState.Playing) (global as any).playerController?.moveLane(1);
  }

  onSwipeUp(): void {
    if (this.state === GameState.Playing) (global as any).playerController?.jump(false);
  }

  private startGame(): void {
    this.state = GameState.Playing;
    if (this.gameOverUI) this.gameOverUI.enabled = false;
    if (this.tapToStartUI) this.tapToStartUI.enabled = false;

    // Включаем фоновую музыку
    this.playSound(this.bgmAudio, true);

    (global as any).playerController?.startRunning();
    (global as any).spawnManager?.startGame();
  }

  private restartGameFlow(): void {
    this.state = GameState.Dying;
    if (this.gameOverUI) this.gameOverUI.enabled = false;

    (global as any).spawnManager?.stopGame();
    (global as any).spawnManager?.resetPools();

    this.score = 0;
    this.coins = 0;
    this.lives = START_LIVES;
    this.comboCount = 0;
    this.updateUI();

    (global as any).playerController?.reviveAndRun(() => {
      this.state = GameState.Playing;
      this.playSound(this.bgmAudio, true);
      (global as any).spawnManager?.startGame();
    });
  }

  private addCoin(): void {
    if (this.state !== GameState.Playing) return;

    this.comboCount += 1;
    this.coins += 1;
    this.score += 5;

    // Звук звона монетки
    this.playSound(this.coinAudio, false);

    this.updateUI();
  }

  private takeDamage(amount: number): void {
    if (this.state !== GameState.Playing) return;

    this.lives -= amount;
    this.comboCount = 0;
    this.updateUI();

    // Звук удара
    this.playSound(this.hitAudio, false);

    if (this.lives <= 0) {
      this.die();
    } else {
      (global as any).playerController?.playHitReaction();
    }
  }

  private die(): void {
    this.state = GameState.Dying;
    (global as any).spawnManager?.stopGame();

    // Останавливаем музыку и играем поражение
    this.stopSound(this.bgmAudio);
    this.playSound(this.gameOverAudio, false);

    (global as any).playerController?.die(() => {
      this.state = GameState.GameOver;
      if (this.gameOverUI) this.gameOverUI.enabled = true;
    });
  }

  private updateUI(): void {
    if (this.scoreText) this.scoreText.text = `Score: ${Math.floor(this.score)}`;
    if (this.coinsText) this.coinsText.text = `Coins: ${this.coins}`;
    if (this.livesText) this.livesText.text = `Lives: ${this.lives}`;
    if (this.comboText) {
      this.comboText.text = this.comboCount >= 3 ? `Combo x${this.comboCount}!` : "";
    }
  }
}