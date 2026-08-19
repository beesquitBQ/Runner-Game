// GameEvents.ts
// Лёгкая шина событий (pub/sub), не завязанная на конкретные SceneObject.
// Используется, чтобы Obstacle/Coin/Trampoline могли сообщать GameManager
// о столкновениях/сборе монет, не имея прямой ссылки друг на друга.

type Handler<T> = (payload: T) => void;

class EventBus {
  private listeners: Map<string, Handler<any>[]> = new Map();

  on<T>(event: string, handler: Handler<T>): void {
    const arr = this.listeners.get(event) ?? [];
    arr.push(handler);
    this.listeners.set(event, arr);
  }

  off<T>(event: string, handler: Handler<T>): void {
    const arr = this.listeners.get(event);
    if (!arr) return;
    this.listeners.set(
      event,
      arr.filter((h) => h !== handler)
    );
  }

  emit<T>(event: string, payload?: T): void {
    const arr = this.listeners.get(event);
    if (!arr) return;
    // копия массива на случай, если обработчик сам подписывается/отписывается
    for (const h of [...arr]) {
      h(payload as T);
    }
  }
}

export const GameEvents = new EventBus();

export const EVENTS = {
  PLAYER_HIT_SMALL: "PLAYER_HIT_SMALL",
  PLAYER_HIT_LARGE: "PLAYER_HIT_LARGE",
  COIN_COLLECTED: "COIN_COLLECTED",
} as const;
