// Загальні константи, переліки (enums) та конфігурація складності гри.

export enum GameState {
  Idle = "Idle",         // До старту — очікування тапу
  Playing = "Playing",   // Активний забіг
  Dying = "Dying",       // Анімація смерті або підйому
  GameOver = "GameOver", // Екран завершення гри
}

export enum ObstacleKind {
  Small = "Small", // Можна перестрибнути звичайним стрибком
  Large = "Large", // Можна лише обійти або перелетіти через батут
}

export interface DifficultyConfig {
  baseSpeed: number;                   // Початкова швидкість світу (см/с)
  maxSpeed: number;                    // Максимальна швидкість
  speedGainPerSecond: number;          // Приріст швидкості за секунду
  baseSpawnInterval: number;           // Початковий інтервал спавну (с)
  minSpawnInterval: number;            // Мінімальний ліміт інтервалу спавну (с)
  spawnIntervalDecayPerSecond: number; // Зменшення інтервалу за секунду
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