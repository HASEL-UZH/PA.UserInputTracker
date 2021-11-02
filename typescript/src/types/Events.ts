export interface KeystrokeEvent {
  type: string;
}

export interface MouseClickEvent {
  type: string;
  clicks: number;
}

export interface MouseMoveEvent {
  type: string;
  x: number;
  y: number;
}

export interface MouseScrollEvent {
  type: string;
  amount: number;
  rotation: number;
}

export interface ExtendedKeystrokeEvent extends KeystrokeEvent {
  ts: Date;
}

export interface ExtendedMouseClickEvent extends MouseClickEvent {
  ts: Date;
}

export interface ExtendedMouseMoveEvent extends MouseMoveEvent {
  ts: Date;
}

export interface ExtendedMouseScrollEvent extends MouseScrollEvent {
  ts: Date;
}
