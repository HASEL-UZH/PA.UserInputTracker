# UserInputTracker for Typescript

This tracker can be used to listen to user inputs (mouse clicks, keystrokes, mouse movement, and mouse scrolls) on any platform (MacOS, Windows, and Linux)

## How to use

Add this git repository to your project as a git submodule

```
git submodule add https://github.com/HASEL-UZH/PA.UserInputTracker
```

Install the package by adding to package.json and running npm install

```
npm i ./PA.UserInputTracker/typescript
```

The simplest example looks as follows

```ts
import { UserInputTracker } from "user-input-tracker";

const tracker = new UserInputTracker(function (aggregate) {
  console.log(aggregate);
});

tracker.start();
```

## Platform specific notes

Not tested on Linux

## Known Issues

- There is a [bug](https://stackoverflow.com/questions/2969110/cgeventtapcreate-breaks-down-mysteriously-with-key-down-events#2971217) on macOS that removes event listeners from time to time. [uiohook-napi](https://github.com/SnosMe/uiohook-napi) crashes when this happens (when used with Electron). This issue was [reported](https://github.com/SnosMe/uiohook-napi/pull/5), but it doesn't look like it will be fixed in the near future. To circumvent this issue, we created a [fork](https://github.com/HASEL-UZH/uiohook-napi). With the fork, the application no longer crashes but a restart of the tracker is required to reestablish the event listeners. This functionality has to be provided by the client application! As a reference, you could have a look at the [fallback](https://github.com/HASEL-UZH/PA.FlowTeams/commit/cef8c28eed34c82f37aa0f8e34f9f3b520ca9f66) created in the FlowTeams project. There, the following code was added:
```
  // check if tracker is still running (issue of io-library that only occurs on Mac)
  // restart the tracker when no input is detected but active window changed
  const msPerMinute = 60000;
  const startTime = new Date(Date.now() - 3 * msPerMinute);
  if (
    isMac &&
    (calculatedFlowStatus.flowStatus === FlowStatus.AVAILABLE ||
      calculatedFlowStatus.flowStatus === FlowStatus.AWAY)
  ) {
    const activeIOCount: number =
      await UserInputAggregate.countActiveIntervals(startTime);
    const activeWindowCount: number = await ActiveWindow.countActivity(
      startTime
    );
    if (activeIOCount === 0 && activeWindowCount !== 0) {
      console.error(
        "[FlowTeams] No input detected for 3 minutes but detected window activity. Restart input tracker to resolve possible issue."
      );
      await this.pauseTrackers();
      await this.resumeTrackers();
    }
  }
```
In words, if in the last three minutes no input was detected (`activeIOCount`), but window activity was still detected (`activeWindowCount` - [active-win](https://www.npmjs.com/package/active-win) is used for this) then restart the tracker.

  - Read more about it in this [issue](https://github.com/HASEL-UZH/PA.UserInputTracker/issues/4).

## Thanks

Huge thanks to the maintainers of uiohook-napi: https://github.com/SnosMe/uiohook-napi
