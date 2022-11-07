import { uIOhook, UiohookKeyboardEvent, UiohookMouseEvent, UiohookWheelEvent } from 'hasel-io-lib'

import ITracker from "./types/ITracker";
import UserInputAggregate from "./types/UserInputAggregate";
import {
  ExtendedKeystrokeEvent,
  ExtendedMouseClickEvent,
  ExtendedMouseMoveEvent,
  ExtendedMouseScrollEvent,
} from "./types/Events";

export class UserInputTracker implements ITracker {
  name = "UserInputTracker";
  isRunning = false;
  private ref: NodeJS.Timeout | undefined;

  onAggregated: (userInputAggregate: UserInputAggregate) => void;
  aggregatingInterval: number;

  private keystrokeBuffer: ExtendedKeystrokeEvent[] = [];
  private mouseClickBuffer: ExtendedMouseClickEvent[] = [];
  private mouseMovementBuffer: ExtendedMouseMoveEvent[] = [];
  private mouseScrollsBuffer: ExtendedMouseScrollEvent[] = [];

  /**
   *
   */
  constructor(
    onAggregated: (userInputAggregate: UserInputAggregate) => void,
    aggregatingInterval = 20000
  ) {
    this.onAggregated = onAggregated;
    this.aggregatingInterval = aggregatingInterval;

    // register hooks
    this.registerUserInputHooks();
  }

  start(): void {
    if (this.isRunning) {
      console.log(`${this.name} is already running!`);
      return;
    }

    console.log(`starting ${this.name}`);

    this.ref = setInterval(() => {
      // calculate aggregate and fire callback once done
      const aggregate = this.aggregate();
      this.onAggregated(aggregate);
    }, this.aggregatingInterval);

    uIOhook.start();
  }

  aggregate(): UserInputAggregate {
    const now = new Date();
    const tsEnd = new Date(now);
    const tsStart = new Date(
      now.setMilliseconds(now.getMilliseconds() - this.aggregatingInterval)
    );

    // init aggregate
    const aggregate: UserInputAggregate = {
      tsStart,
      tsEnd,
      keyTotal: 0,
      clickTotal: 0,
      movedDistance: 0,
      scrollDelta: 0,
    };

    // Keystrokes
    const keystrokes = this.keystrokeBuffer.filter(
      (e) => e.ts >= tsStart && e.ts < tsEnd
    );
    aggregate.keyTotal = keystrokes.length;

    // Mouse clicks
    const mouseclicks = this.mouseClickBuffer.filter(
      (e) => e.ts >= tsStart && e.ts < tsEnd
    );
    aggregate.clickTotal = mouseclicks.length;

    // Mouse movement distance
    const mousemoves = this.mouseMovementBuffer.filter(
      (e) => e.ts >= tsStart && e.ts < tsEnd
    );
    let distance = 0.0;

    for (let index = 1; index < mousemoves.length; index++) {
      const previous = mousemoves[index - 1];
      const current = mousemoves[index];

      const x1 = previous.x;
      const x2 = current.x;
      const y1 = previous.y;
      const y2 = current.y;

      distance += Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    aggregate.movedDistance = distance;

    // Mouse scroll distance
    const mousescrolls = this.mouseScrollsBuffer.filter(
      (e) => e.ts >= tsStart && e.ts < tsEnd
    );
    aggregate.scrollDelta = mousescrolls.reduce(
      (a, b) => a + Math.abs(b.amount * b.rotation),
      0
    );

    // remove saved entries from buffer
    this.keystrokeBuffer = this.keystrokeBuffer.filter((e) => e.ts >= tsEnd);
    this.mouseClickBuffer = this.mouseClickBuffer.filter((e) => e.ts >= tsEnd);
    this.mouseMovementBuffer = this.mouseMovementBuffer.filter(
      (e) => e.ts >= tsEnd
    );
    this.mouseScrollsBuffer = this.mouseScrollsBuffer.filter(
      (e) => e.ts >= tsEnd
    );

    return aggregate;
  }

  stop(): void {
    if (this.ref) clearInterval(this.ref);
    this.isRunning = false;
    uIOhook.stop();
  }

  terminate(): void {
    this.stop();
    uIOhook.stop();
  }

  private registerUserInputHooks() {
    uIOhook.on("click", (e: UiohookMouseEvent) => {
      const event = {
        ...e,
        ts: new Date(),
      };

      this.mouseClickBuffer.push(event);
    });

    uIOhook.on("keyup", (e: UiohookKeyboardEvent) => {
      const event = {
        ...e,
        ts: new Date(),
      };

      this.keystrokeBuffer.push(event);
    });

    uIOhook.on("mousemove", (e: UiohookMouseEvent) => {
      const event = {
        ...e,
        ts: new Date(),
      };
      this.mouseMovementBuffer.push(event);
    });

    uIOhook.on("wheel", (e: UiohookWheelEvent) => {
      const event = {
        ...e,
        ts: new Date(),
      };
      this.mouseScrollsBuffer.push(event);
    });
  }
}
