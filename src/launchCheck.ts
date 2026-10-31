import { makeLaunchCheck } from './launchLog';

// Web build: the note is kept in the browser's storage.

const KEY = 'succedo.launch-check';

export const launchCheck = makeLaunchCheck({
  read: () => globalThis.localStorage?.getItem(KEY) ?? undefined,
  write: (text) => globalThis.localStorage?.setItem(KEY, text),
});
