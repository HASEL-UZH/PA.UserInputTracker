import { UiohookKeyboardEvent, UiohookMouseEvent, UiohookWheelEvent } from "hasel-io-lib";

export interface ExtendedKeystrokeEvent extends UiohookKeyboardEvent {
  ts: Date;
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
