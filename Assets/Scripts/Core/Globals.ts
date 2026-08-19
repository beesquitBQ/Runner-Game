// Globals.ts
// Lens Studio поддерживает глобальный объект `global` для обмена ссылками
// между скриптами без прямого прокидывания @input в каждый инстанс пула
// (см. официальные примеры: `global.someAsset = script.someAsset`).
//
// Мы регистрируем в нём три синглтона (GameManager, PlayerController,
// SpawnManager), чтобы объекты из пулов (Obstacle/Coin/Trampoline) могли
// быстро получить текущую скорость мира, состояние игрока и т.п.,
// не имея собственного @input на каждый вариант префаба.
//
// Файл только объявляет типы — импортируйте его (import) в любом файле,
// где используется global.playerController / global.gameManager / global.spawnManager,
// чтобы получить автодополнение и проверку типов.

import type { PlayerController } from "../Player/PlayerController";
import type { GameManager } from "./GameManager";
import type { SpawnManager } from "../World/SpawnManager";

declare global {
  var playerController: PlayerController | undefined;
  var gameManager: GameManager | undefined;
  var spawnManager: SpawnManager | undefined;
}

export {};