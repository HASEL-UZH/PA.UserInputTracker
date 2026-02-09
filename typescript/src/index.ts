import {
  uIOhook,
  UiohookKeyboardEvent,
  UiohookMouseEvent,
  UiohookWheelEvent,
  UiohookKey
} from 'uiohook-napi';

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

      console.log('[UserInputTracker] keystroke breakdown for interval', {
        tsStart,
        tsEnd,
        keysTotal: keystrokes.length,
        keysLetter,
        keysNumber,
        keysNavigate,
        keysDelete,
        keysModifier,
        keysSpace,
        keysTab,
        keyEnter,
        keysOther
      });
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

    console.log('[UserInputTracker] mouse/scroll breakdown for interval', {
      tsStart,
      tsEnd,
      clickTotal: aggregate.clickTotal,
      movedDistance: aggregate.movedDistance,
      scrollDelta: aggregate.scrollDelta
    });

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

      console.log('[UserInputTracker] mouse click event', event);

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
          const keychar: number | undefined = (e as unknown as { keychar?: number }).keychar;

          console.log(
            '[KeyClassifier]',
            'keycode =',
            e.keycode,
            'keychar =',
            keychar,
            'alt =',
            e.altKey,
            'ctrl =',
            e.ctrlKey,
            'shift =',
            e.shiftKey,
            'meta =',
            e.metaKey,
            '=> category =',
            c
          );

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

      console.log('[UserInputTracker] mouse move event', event);

      this.mouseMovementBuffer.push(event);
    });

    uIOhook.on('wheel', (e: UiohookWheelEvent) => {
      const event = {
        ...e,
        ts: new Date()
      };

      console.log('[UserInputTracker] wheel event', event);

      this.mouseScrollsBuffer.push(event);
    });
  }
}

function getPhysicalKeyName(e: UiohookKeyboardEvent): string | undefined {
  const maybe = (UiohookKey as unknown as Record<number, string>)[e.keycode];
  if (typeof maybe === 'string') return maybe;

  const entries = Object.entries(UiohookKey as unknown as Record<string, number>);
  const found = entries.find(([, v]) => v === e.keycode);
  return found?.[0];
}

function defaultClassifier(e: UiohookKeyboardEvent): KeystrokeCategory {
  const code = e.keycode;
  const keyName = getPhysicalKeyName(e);

  // Letters A–Z (physical keys, independent of layout)
  if (keyName && /^Key[A-Z]$/.test(keyName)) {
    console.log('[KeyClassifier:letter]', 'keycode =', code);
    return 'letter';
  }

  // Number row 0–9 (physical keys)
  if (keyName && /^Digit[0-9]$/.test(keyName)) {
    console.log('[KeyClassifier:number-row]', 'keycode =', code);
    return 'number';
  }

  // Numpad digits 0–9
  if (keyName && /^Numpad[0-9]$/.test(keyName)) {
    console.log('[KeyClassifier:number-numpad]', 'keycode =', code);
    return 'number';
  }

  // Space
  if (keyName === 'Space' || code === 44) {
    console.log('[KeyClassifier:space]', 'keycode =', code);
    return 'space';
  }

  // Tab
  if (keyName === 'Tab' || code === 43) {
    console.log('[KeyClassifier:tab]', 'keycode =', code);
    return 'tab';
  }

  // Enter (main) + keypad Enter
  if (keyName === 'Enter' || keyName === 'NumpadEnter' || code === 40 || code === 88) {
    console.log('[KeyClassifier:enter]', 'keycode =', code);
    return 'enter';
  }

  // Backspace / Delete
  if (keyName === 'Backspace' || keyName === 'Delete' || code === 42 || code === 76) {
    console.log('[KeyClassifier:delete]', 'keycode =', code);
    return 'delete';
  }

  // Navigation keys
  if (
    keyName === 'ArrowUp' ||
    keyName === 'ArrowDown' ||
    keyName === 'ArrowLeft' ||
    keyName === 'ArrowRight' ||
    keyName === 'Home' ||
    keyName === 'End' ||
    keyName === 'PageUp' ||
    keyName === 'PageDown' ||
    (code >= 79 && code <= 82) ||
    (code >= 74 && code <= 77)
  ) {
    console.log('[KeyClassifier:navigate]', 'keycode =', code);
    return 'navigate';
  }

  // Modifiers: Shift / Ctrl / Alt / Meta
  if (
    keyName === 'ShiftLeft' ||
    keyName === 'ShiftRight' ||
    keyName === 'ControlLeft' ||
    keyName === 'ControlRight' ||
    keyName === 'AltLeft' ||
    keyName === 'AltRight' ||
    keyName === 'MetaLeft' ||
    keyName === 'MetaRight' ||
    (code >= 224 && code <= 231)
  ) {
    console.log('[KeyClassifier:modifier]', 'keycode =', code);
    return 'modifier';
  }

  // Everything else: function keys, IME, media keys, unknown
  console.log('[KeyClassifier:other]', 'keycode =', code);
  return 'other';
}
