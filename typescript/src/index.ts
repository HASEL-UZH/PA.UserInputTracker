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

  constructor(
    onAggregated: (userInputAggregate: UserInputAggregate) => void,
    aggregatingInterval = 20000,
    collectKeyDetails = false
  ) {
    this.onAggregated = onAggregated;
    this.aggregatingInterval = aggregatingInterval;
    this.collectKeyDetails = collectKeyDetails;

    // register hooks
    this.registerUserInputHooks();
  }

  start(): void {
    if (this.isRunning) {
      return;
    }

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
      const event: ExtendedKeystrokeEvent = {
        ...e,
        ts: new Date()
      };

      if (this.collectKeyDetails) {
        try {
          event.category = defaultClassifier(e);
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

function getPhysicalKeyName(e: UiohookKeyboardEvent): string | undefined {
  const maybe = (UiohookKey as unknown as Record<number, string>)[e.keycode];
  if (typeof maybe === 'string') return maybe;

  const entries = Object.entries(UiohookKey as unknown as Record<string, number>);
  const found = entries.find(([, v]) => v === e.keycode);
  return found?.[0];
}

// Classifies keycodes using the UiohookKey mapping from uiohook-napi.
// Key names and codes: https://github.com/SnosMe/uiohook-napi
function defaultClassifier(e: UiohookKeyboardEvent): KeystrokeCategory {
  const code = e.keycode;
  const keyName = getPhysicalKeyName(e);
  const isTopRowDigitCode = code >= 2 && code <= 11;
  const isNumpadDigitCode = code >= 71 && code <= 83;
  const isArrowCode =
    code === UiohookKey.ArrowUp ||
    code === UiohookKey.ArrowDown ||
    code === UiohookKey.ArrowLeft ||
    code === UiohookKey.ArrowRight;
  const isNavPagingCode =
    code === UiohookKey.Home ||
    code === UiohookKey.End ||
    code === UiohookKey.PageUp ||
    code === UiohookKey.PageDown;

  switch (true) {
    case !!keyName && /^[A-Z]$/.test(keyName):
      return 'letter';
    case !!keyName && /^[0-9]$/.test(keyName):
      return 'number';
    case !!keyName && /^Numpad[0-9]$/.test(keyName):
      return 'number';
    case isTopRowDigitCode || isNumpadDigitCode:
      return 'number';
    case keyName === 'Space' || code === UiohookKey.Space:
      return 'space';
    case keyName === 'Tab' || code === UiohookKey.Tab:
      return 'tab';
    case keyName === 'Enter' || keyName === 'NumpadEnter' || code === UiohookKey.Enter:
      return 'enter';
    case keyName === 'Backspace' ||
      keyName === 'Delete' ||
      code === UiohookKey.Backspace ||
      code === UiohookKey.Delete:
      return 'delete';
    case keyName === 'ArrowUp' ||
      keyName === 'ArrowDown' ||
      keyName === 'ArrowLeft' ||
      keyName === 'ArrowRight' ||
      keyName === 'Home' ||
      keyName === 'End' ||
      keyName === 'PageUp' ||
      keyName === 'PageDown' ||
      isArrowCode ||
      isNavPagingCode:
      return 'navigate';
    case keyName === 'Shift' ||
      keyName === 'ShiftRight' ||
      keyName === 'Ctrl' ||
      keyName === 'CtrlRight' ||
      keyName === 'Alt' ||
      keyName === 'AltRight' ||
      keyName === 'Meta' ||
      keyName === 'MetaRight' ||
      keyName === 'CapsLock' ||
      code === UiohookKey.Shift ||
      code === UiohookKey.ShiftRight ||
      code === UiohookKey.Ctrl ||
      code === UiohookKey.CtrlRight ||
      code === UiohookKey.Alt ||
      code === UiohookKey.AltRight ||
      code === UiohookKey.Meta ||
      code === UiohookKey.MetaRight ||
      code === UiohookKey.CapsLock:
      return 'modifier';
    default:
      return 'other';
  }
}
