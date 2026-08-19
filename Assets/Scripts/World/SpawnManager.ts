import { ObjectPool } from "../Utils/ObjectPool";
import { Obstacle } from "./Obstacle";
import { Coin } from "./Coin";
import { Trampoline } from "./Trampoline";
import { DEFAULT_DIFFICULTY, DifficultyConfig, ObstacleKind, LANE_COUNT } from "../Core/GameConfig";

// Позначення в шаблонах:
// E: Порожньо
// C: Монета
// S: Мала перешкода
// L: Велика перешкода
// T: Батут
// ?: Випадково (50% монета / 50% порожньо)
// R: Випадково (Мала перешкода / Монета / Порожньо)

type RowData = [string, string, string];
type PatternData = RowData[];

const PATTERNS: PatternData[] = [
  // 1. Пряма лінія монет з бар'єрами по боках
  [
    ["S", "C", "S"],
    ["S", "C", "S"],
    ["E", "C", "E"]
  ],

  // 2. Шаховий порядок
  [
    ["S", "C", "E"],
    ["E", "S", "C"],
    ["C", "E", "S"]
  ],

  // 3. Батут перед великою стіною
  [
    ["E", "T", "E"],
    ["?", "L", "?"],
    ["C", "E", "C"]
  ],

  // 4. Батут із переходом на перешкоду
  [
    ["T", "S", "E"],
    ["L", "C", "C"],
    ["E", "E", "R"]
  ],

  // 5. Діагональний бар'єр
  [
    ["S", "E", "E"],
    ["E", "S", "E"],
    ["E", "E", "S"]
  ],

  // 6. Зигзаг із монет
  [
    ["C", "S", "S"],
    ["S", "C", "S"],
    ["S", "S", "C"],
    ["S", "C", "S"],
    ["C", "S", "S"]
  ],

  // 7. Блокада з одним проходом
  [
    ["S", "S", "E"],
    ["R", "C", "R"],
    ["E", "S", "S"]
  ],

  // 8. Подвійна доріжка монет
  [
    ["C", "E", "C"],
    ["C", "S", "C"],
    ["C", "E", "C"]
  ]
];

@component
export class SpawnManager extends BaseScriptComponent {
  @input smallObstacles!: Obstacle[];
  @input largeObstacles!: Obstacle[];
  @input coins!: Coin[];
  @input trampolines!: Trampoline[];

  @input spawnZ: number = 220;    // Дистанція спавну попереду камери
  @input laneWidth: number = 20;  // Відстань між центрами смуг
  @input rowDistance: number = 30; // Відстань між рядами

  private smallPool!: ObjectPool<Obstacle>;
  private largePool!: ObjectPool<Obstacle>;
  private coinPool!: ObjectPool<Coin>;
  private trampPool!: ObjectPool<Trampoline>;

  private config: DifficultyConfig = DEFAULT_DIFFICULTY;
  private currentSpeed: number = 0;
  private distanceAccumulator: number = 0;
  private isRunning: boolean = false;

  private currentPattern: PatternData = [];
  private patternRowIndex: number = 0;

  onAwake(): void {
    (global as any).spawnManager = this;

    this.smallPool = new ObjectPool(this.smallObstacles, "SmallObstacles");
    this.largePool = new ObjectPool(this.largeObstacles, "LargeObstacles");
    this.coinPool = new ObjectPool(this.coins, "Coins");
    this.trampPool = new ObjectPool(this.trampolines, "Trampolines");

    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
  }

  startGame(): void {
    this.currentSpeed = this.config.baseSpeed;
    this.distanceAccumulator = this.rowDistance;
    this.isRunning = true;
    this.loadNextPattern();
  }

  stopGame(): void {
    this.isRunning = false;
  }

  resetPools(): void {
    this.smallPool.despawnAll();
    this.largePool.despawnAll();
    this.coinPool.despawnAll();
    this.trampPool.despawnAll();
    this.distanceAccumulator = 0;
  }

  getCurrentSpeed(): number {
    if (!this.isRunning) return 0;
    const player = (global as any).playerController;
    const multiplier = (player && player.isBoosted()) ? 1.8 : 1.0;
    return this.currentSpeed * multiplier;
  }

  recycleObstacle(obs: Obstacle): void {
    if (obs.getKind() === ObstacleKind.Large) {
      this.largePool.despawn(obs);
    } else {
      this.smallPool.despawn(obs);
    }
  }

  recycleCoin(coin: Coin): void {
    this.coinPool.despawn(coin);
  }

  recycleTrampoline(tramp: Trampoline): void {
    this.trampPool.despawn(tramp);
  }

  private onUpdate(): void {
    if (!this.isRunning) return;

    const dt = getDeltaTime();

    this.currentSpeed = Math.min(
      this.config.maxSpeed,
      this.currentSpeed + this.config.speedGainPerSecond * dt
    );

    const stepDistance = this.currentSpeed * dt;
    this.distanceAccumulator += stepDistance;

    while (this.distanceAccumulator >= this.rowDistance) {
      this.distanceAccumulator -= this.rowDistance;
      this.spawnNextRow();
    }
  }

  private loadNextPattern(): void {
    const randIndex = Math.floor(Math.random() * PATTERNS.length);
    this.currentPattern = PATTERNS[randIndex];
    this.patternRowIndex = 0;
  }

  private spawnNextRow(): void {
    if (!this.currentPattern || this.patternRowIndex >= this.currentPattern.length) {
      this.loadNextPattern();
    }

    const row = this.currentPattern[this.patternRowIndex];

    for (let lane = 0; lane < LANE_COUNT; lane++) {
      let type = row[lane];
      let item: (BaseScriptComponent & { getTransform: () => Transform }) | null = null;

      if (type === "?") {
        type = Math.random() > 0.5 ? "C" : "E";
      } else if (type === "R") {
        const r = Math.random();
        if (r < 0.4) type = "S";
        else if (r < 0.7) type = "C";
        else type = "E";
      }

      if (type === "C") item = this.coinPool.spawn();
      else if (type === "S") item = this.smallPool.spawn();
      else if (type === "L") item = this.largePool.spawn();
      else if (type === "T") item = this.trampPool.spawn();

      if (item) {
        this.spawnAt(item, lane);
      }
    }

    this.patternRowIndex++;
  }

  private spawnAt(item: BaseScriptComponent & { getTransform: () => Transform }, laneIndex: number): void {
    const x = (laneIndex - 1) * this.laneWidth;
    item.getTransform().setLocalPosition(new vec3(x, 0, this.spawnZ));
  }
}