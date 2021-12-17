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

> Consumers might have to specify targets for iohook in `package.json`. See an example [here](https://wilix-team.github.io/iohook/usage.html)

## Platform specific notes

Not tested on Linux

## Known Issues

See https://github.com/wilix-team/iohook/issues/354 for the github issues of the upstream dependency
Personally, I have encountered the following issues:

1. When running in Electron, typing CAPS lock causes the main process to crash
2. On MacOS: On certain versions of node everything works fine until you start typing. Then, ioHook stops listening for inputs.

## Thanks

Huge thanks to the maintainers of iohook: https://github.com/wilix-team/iohook/
