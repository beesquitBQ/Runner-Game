// SwipeInputController.ts
@component
export class SwipeInputController extends BaseScriptComponent {
  @input swipeThreshold: number = 0.05;
  @input invertHorizontal: boolean = true; // Отзеркаливание свайпов влево/вправо

  private startPos: vec2 | null = null;
  private isSwiping: boolean = false;

  onAwake(): void {
    this.createEvent("TouchStartEvent").bind((e: TouchStartEvent) => this.onTouchStart(e));
    this.createEvent("TouchMoveEvent").bind((e: TouchMoveEvent) => this.onTouchMove(e));
    this.createEvent("TouchEndEvent").bind((e: TouchEndEvent) => this.onTouchEnd(e));

    this.createEvent("TapEvent").bind(() => {
      (global as any).gameManager?.onTap();
    });
  }

  private onTouchStart(e: TouchStartEvent): void {
    this.startPos = e.getTouchPosition();
    this.isSwiping = false;
  }

  private onTouchMove(e: TouchMoveEvent): void {
    if (!this.startPos || this.isSwiping) return;

    const currentPos = e.getTouchPosition();
    let dx = currentPos.x - this.startPos.x;
    const dy = currentPos.y - this.startPos.y;

    if (this.invertHorizontal) {
      dx = -dx;
    }

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX >= this.swipeThreshold || absY >= this.swipeThreshold) {
      this.isSwiping = true;

      if (absX > absY) {
        if (dx > 0) (global as any).gameManager?.onSwipeRight();
        else (global as any).gameManager?.onSwipeLeft();
      } else {
        if (dy < 0) (global as any).gameManager?.onSwipeUp();
      }
    }
  }

  private onTouchEnd(e: TouchEndEvent): void {
    this.startPos = null;
    this.isSwiping = false;
  }
}