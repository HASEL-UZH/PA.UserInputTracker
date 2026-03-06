import { UiohookKeyboardEvent, UiohookMouseEvent, UiohookWheelEvent } from 'uiohook-napi';

export type KeystrokeCategory =
  | 'letter'
  | 'number'
  | 'navigate'
  | 'delete'
  | 'modifier'
  | 'space'
  | 'tab'
  | 'enter'
  | 'other';

export interface ExtendedKeystrokeEvent extends UiohookKeyboardEvent {
  ts: Date;
  /** Populated only when collectKeyDetails is enabled */
  category?: KeystrokeCategory;
}

export interface ExtendedMouseClickEvent extends UiohookMouseEvent {
  ts: Date;
}

export interface ExtendedMouseMoveEvent extends UiohookMouseEvent {
  ts: Date;
}

export interface ExtendedMouseScrollEvent extends UiohookWheelEvent {
  ts: Date;
}
