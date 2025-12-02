import { uIOhook, UiohookKeyboardEvent, UiohookMouseEvent, UiohookWheelEvent } from 'uiohook-napi';

import ITracker from './types/ITracker';
import UserInputAggregate from './types/UserInputAggregate';
import {
  ExtendedKeystrokeEvent,
  ExtendedMouseClickEvent,
  ExtendedMouseMoveEvent,
  ExtendedMouseScrollEvent,
  KeystrokeCategory
} from './types/Events';

type UserInputTrackerOptions = {
  collectKeyDetails?: boolean;
  classifyKey?: (e: UiohookKeyboardEvent) => KeystrokeCategory;
};

export class UserInputTracker implements ITracker {
  name = 'User Input Monitor';
  isRunning = false;
  private ref: NodeJS.Timeout | undefined;

  onAggregated: (userInputAggregate: UserInputAggregate) => void;
  aggregatingInterval: number;

  private keystrokeBuffer: ExtendedKeystrokeEvent[] = [];
  private mouseClickBuffer: ExtendedMouseClickEvent[] = [];
  private mouseMovementBuffer: ExtendedMouseMoveEvent[] = [];
  private mouseScrollsBuffer: ExtendedMouseScrollEvent[] = [];

  private collectKeyDetails: boolean;
  private classifyKey: (e: UiohookKeyboardEvent) => KeystrokeCategory;

  constructor(
    onAggregated: (userInputAggregate: UserInputAggregate) => void,
    aggregatingInterval = 20000,
    options: UserInputTrackerOptions = {}
  ) {
    this.onAggregated = onAggregated;
    this.aggregatingInterval = aggregatingInterval;

    this.collectKeyDetails = options?.collectKeyDetails ?? false;
    this.classifyKey = options.classifyKey ?? defaultClassifier;

    // register hooks
    this.registerUserInputHooks();
  }

  start(): void {
    if (this.isRunning) {
      console.log(`${this.name} is already running!`);
      return;
    }

    console.log(`starting ${this.name}`);

    this.isRunning = true;

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
    const tsStart = new Date(now.setMilliseconds(now.getMilliseconds() - this.aggregatingInterval));

    // init aggregate
    const aggregate: UserInputAggregate = {
      tsStart,
      tsEnd,
      keyTotal: 0,
      clickTotal: 0,
      movedDistance: 0,
      scrollDelta: 0
    };

    // Keystrokes
    const keystrokes = this.keystrokeBuffer.filter((e) => e.ts >= tsStart && e.ts < tsEnd);
    aggregate.keyTotal = keystrokes.length;
    aggregate.keysTotal = keystrokes.length;

    if (this.collectKeyDetails) {
      let keysLetter = 0;
      let keysNumber = 0;
      let keysNavigate = 0;
      let keysDelete = 0;
      let keysModifier = 0;
      let keysSpace = 0;
      let keysTab = 0;
      let keyEnter = 0;
      let keysOther = 0;

      // Keystrokes
      for (const k of keystrokes) {
        switch (k.category ?? 'other') {
          case 'letter':
            keysLetter++;
            break;
          case 'number':
            keysNumber++;
            break;
          case 'navigate':
            keysNavigate++;
            break;
          case 'delete':
            keysDelete++;
            break;
          case 'modifier':
            keysModifier++;
            break;
          case 'space':
            keysSpace++;
            break;
          case 'tab':
            keysTab++;
            break;
          case 'enter':
            keyEnter++;
            break;
          default:
            keysOther++;
            break;
        }
      }

      aggregate.keysLetter = keysLetter;
      aggregate.keysNumber = keysNumber;
      aggregate.keysNavigate = keysNavigate;
      aggregate.keysDelete = keysDelete;
      aggregate.keysModifier = keysModifier;
      aggregate.keysSpace = keysSpace;
      aggregate.keysTab = keysTab;
      aggregate.keyEnter = keyEnter;
      aggregate.keysOther = keysOther;
    }

    // Mouse clicks
    const mouseclicks = this.mouseClickBuffer.filter((e) => e.ts >= tsStart && e.ts < tsEnd);
    aggregate.clickTotal = mouseclicks.length;

    // Mouse movement distance
    const mousemoves = this.mouseMovementBuffer.filter((e) => e.ts >= tsStart && e.ts < tsEnd);
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
    const mousescrolls = this.mouseScrollsBuffer.filter((e) => e.ts >= tsStart && e.ts < tsEnd);
    aggregate.scrollDelta = mousescrolls.reduce((a, b) => a + Math.abs(b.amount * b.rotation), 0);

    // remove saved entries from buffer
    this.keystrokeBuffer = this.keystrokeBuffer.filter((e) => e.ts >= tsEnd);
    this.mouseClickBuffer = this.mouseClickBuffer.filter((e) => e.ts >= tsEnd);
    this.mouseMovementBuffer = this.mouseMovementBuffer.filter((e) => e.ts >= tsEnd);
    this.mouseScrollsBuffer = this.mouseScrollsBuffer.filter((e) => e.ts >= tsEnd);

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
    uIOhook.on('click', (e: UiohookMouseEvent) => {
      const event = {
        ...e,
        ts: new Date()
      };

      this.mouseClickBuffer.push(event);
    });

    uIOhook.on('keyup', (e: UiohookKeyboardEvent) => {
      console.log('Raw key event:', e);

      const event: ExtendedKeystrokeEvent = {
        ...e,
        ts: new Date()
      };

      if (this.collectKeyDetails) {
        try {
          const c = this.classifyKey(e);
          console.log('Raw key event:', JSON.stringify(e, null, 2));
          const keychar: number | undefined = (e as unknown as { keychar?: number }).keychar;
          console.log('Classifier input:', JSON.stringify(e, null, 2), 'keychar=', keychar);
          event.category = c;
        } catch (err) {
          console.log('Classification error:', err);
          event.category = 'other';
        }
      }

      this.keystrokeBuffer.push(event);
    });

    uIOhook.on('mousemove', (e: UiohookMouseEvent) => {
      const event = {
        ...e,
        ts: new Date()
      };
      this.mouseMovementBuffer.push(event);
    });

    uIOhook.on('wheel', (e: UiohookWheelEvent) => {
      const event = {
        ...e,
        ts: new Date()
      };
      this.mouseScrollsBuffer.push(event);
    });
  }
}

function defaultClassifier(e: UiohookKeyboardEvent): KeystrokeCategory {
  const code = e.keycode;

  // Letters A–Z (HID usage 4–29)
  if (code >= 4 && code <= 29) {
    return 'letter';
  }

  // Number row 1–0 (HID usage 30–39)
  if (code >= 30 && code <= 39) {
    return 'number';
  }

  // Numpad digits 0–9 (HID usage 89–98)
  if (code >= 89 && code <= 98) {
    return 'number';
  }

  // Space
  if (code === 44) {
    return 'space';
  }

  // Tab
  if (code === 43) {
    return 'tab';
  }

  // Enter (main) + keypad Enter
  if (code === 40 || code === 88) {
    return 'enter';
  }

  // Backspace (42) / Delete (76)
  if (code === 42 || code === 76) {
    return 'delete';
  }

  // Navigation keys: arrows (79–82) + home/end/page up/down (74–77)
  if ((code >= 79 && code <= 82) || (code >= 74 && code <= 77)) {
    return 'navigate';
  }

  // Modifiers: Shift / Ctrl / Alt / Meta (224–231)
  if (code >= 224 && code <= 231) {
    return 'modifier';
  }

  // Everything else: function keys, IME, media keys, unknown
  return 'other';
}
