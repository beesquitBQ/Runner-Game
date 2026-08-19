// Оголошення глобальних типів для Lens Studio (об'єкт global).

import type { PlayerController } from "../Player/PlayerController";
import type { GameManager } from "./GameManager";
import type { SpawnManager } from "../World/SpawnManager";

declare global {
  var playerController: PlayerController | undefined;
  var gameManager: GameManager | undefined;
  var spawnManager: SpawnManager | undefined;
}

export {};