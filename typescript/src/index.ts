import ioHook from "iohook";

import ITracker from "./types/ITracker";
import UserInputAggregate from "./types/UserInputAggregate";
import {
  ExtendedKeystrokeEvent,
  ExtendedMouseClickEvent,
  ExtendedMouseMoveEvent,
  ExtendedMouseScrollEvent,
  KeystrokeEvent,
  MouseClickEvent,
  MouseMoveEvent,
  MouseScrollEvent,
} from "./types/Events";

export class UserInputTracker implements ITracker {
  name = "UserInputTracker";
  isRunning = false;
  private ref: NodeJS.Timeout | undefined;

  onAggregated: (userInputAggregate: UserInputAggregate) => void;
  aggregatingInterval: number;

  private _prevEndTs: Date | undefined;

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
  }

  start(): void {
    if (this.isRunning) {
      console.log(`${this.name} is already running!`);
      return;
    }

    console.log(`starting ${this.name}`);

    // register hooks
    this.registerUserInputHooks();

    this.ref = setInterval(() => {
      // calculate aggregate and fire callback once done
      const aggregate = this.aggregate();
      this.onAggregated(aggregate);

      console.log(this.keystrokeBuffer);
      console.log(this.mouseClickBuffer);
      console.log(this.mouseScrollsBuffer);
      console.log(this.mouseMovementBuffer);
    }, this.aggregatingInterval);
  }

  aggregate(): UserInputAggregate {
    let tsStart: Date;
    let tsEnd: Date;

    if (!this._prevEndTs) {
      const now = new Date();
      tsEnd = new Date(now);
      tsStart = new Date(
        now.setMilliseconds(now.getMilliseconds() - this.aggregatingInterval)
      );
    } else {
      tsStart = this._prevEndTs;
      const tsStartCopy = new Date(tsStart);
      tsEnd = new Date(
        tsStartCopy.setMilliseconds(
          tsStartCopy.getMilliseconds() + this.aggregatingInterval
        )
      );
    }

    this._prevEndTs = tsEnd;

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
    ioHook.stop();
  }

  terminate(): void {
    this.stop();
    ioHook.stop();
    ioHook.unload();
  }

  private registerUserInputHooks() {
    ioHook.on("mouseclick", (e: MouseClickEvent) => {
      const event = {
        ...e,
        ts: new Date(),
      };

      this.mouseClickBuffer.push(event);
    });

    ioHook.on("keyup", (e: KeystrokeEvent) => {
      const event = {
        ...e,
        ts: new Date(),
      };

      this.keystrokeBuffer.push(event);
    });

    ioHook.on("mousemove", (e: MouseMoveEvent) => {
      const event = {
        ...e,
        ts: new Date(),
      };
      this.mouseMovementBuffer.push(event);
    });

    ioHook.on("mousewheel", (e: MouseScrollEvent) => {
      const event = {
        ...e,
        ts: new Date(),
      };
      this.mouseScrollsBuffer.push(event);
    });

    ioHook.start();
  }
}
