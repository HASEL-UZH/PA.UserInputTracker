"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const iohook_1 = __importDefault(require("iohook"));
class UserInputTracker {
    /**
     *
     */
    constructor(onAggregated, aggregatingInterval = 20000) {
        this.name = "UserInputTracker";
        this.isRunning = false;
        this.keystrokeBuffer = [];
        this.mouseClickBuffer = [];
        this.mouseMovementBuffer = [];
        this.mouseScrollsBuffer = [];
        this.onAggregated = onAggregated;
        this.aggregatingInterval = aggregatingInterval;
    }
    start() {
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
    aggregate() {
        let tsStart;
        let tsEnd;
        if (!this._prevEndTs) {
            const now = new Date();
            tsEnd = new Date(now);
            tsStart = new Date(now.setMilliseconds(now.getMilliseconds() - this.aggregatingInterval));
        }
        else {
            tsStart = this._prevEndTs;
            const tsStartCopy = new Date(tsStart);
            tsEnd = new Date(tsStartCopy.setMilliseconds(tsStartCopy.getMilliseconds() + this.aggregatingInterval));
        }
        this._prevEndTs = tsEnd;
        // init aggregate
        const aggregate = {
            tsStart,
            tsEnd,
            keyTotal: 0,
            clickTotal: 0,
            movedDistance: 0,
            scrollDelta: 0,
        };
        // Keystrokes
        const keystrokes = this.keystrokeBuffer.filter((e) => e.ts >= tsStart && e.ts < tsEnd);
        aggregate.keyTotal = keystrokes.length;
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
    stop() {
        if (this.ref)
            clearInterval(this.ref);
        this.isRunning = false;
    }
    registerUserInputHooks() {
        iohook_1.default.on("mouseclick", (e) => {
            console.log("mouse click");
            const event = {
                ...e,
                ts: new Date(),
            };
            this.mouseClickBuffer.push(event);
        });
        iohook_1.default.on("keyup", (e) => {
            const event = {
                ...e,
                ts: new Date(),
            };
            this.keystrokeBuffer.push(event);
        });
        iohook_1.default.on("mousemove", (e) => {
            const event = {
                ...e,
                ts: new Date(),
            };
            this.mouseMovementBuffer.push(event);
        });
        iohook_1.default.on("mousewheel", (e) => {
            const event = {
                ...e,
                ts: new Date(),
            };
            this.mouseScrollsBuffer.push(event);
        });
        iohook_1.default.start();
    }
}
const tracker = new UserInputTracker((agg) => console.log(agg)).start();
//# sourceMappingURL=index.js.map