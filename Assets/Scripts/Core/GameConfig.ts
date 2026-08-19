// GameConfig.ts
// Общие константы, енумы и конфиг сложности для всего проекта.

export enum GameState {
  Idle = "Idle",       // до старта — играет idle-анимация, ждём тап по экрану
  Playing = "Playing", // активный забег
  Dying = "Dying",     // проигрывается анимация смерти + подъём
  GameOver = "GameOver", // показан экран Game Over, ждём тап для рестарта
}

export enum ObstacleKind {
  Small = "Small", // можно перепрыгнуть обычным прыжком
  Large = "Large", // можно только обойти (сменить полосу) либо перелететь на трамплине
}

export interface DifficultyConfig {
  baseSpeed: number;                 // стартовая скорость мира (см/сек)
  maxSpeed: number;                  // потолок скорости
  speedGainPerSecond: number;        // на сколько растёт скорость каждую секунду забега
  baseSpawnInterval: number;         // стартовый интервал между рядами препятствий (сек)
  minSpawnInterval: number;          // минимальный интервал (нижний предел сложности)
  spawnIntervalDecayPerSecond: number; // на сколько уменьшается интервал каждую секунду
}

export const DEFAULT_DIFFICULTY: DifficultyConfig = {
  baseSpeed: 30,
  maxSpeed: 90,
  speedGainPerSecond: 0.6,
  baseSpawnInterval: 1.4,
  minSpawnInterval: 0.65,
  spawnIntervalDecayPerSecond: 0.01,
};

export const START_LIVES = 3;
export const LANE_COUNT = 3;