export default interface ITRacker {
  name: string;
  isRunning: boolean;
  start(): void;
  stop(): void;
  terminate(): void;
}
