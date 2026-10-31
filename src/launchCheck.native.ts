import { File, Paths } from 'expo-file-system';
import { makeLaunchCheck } from './launchLog';

// Phone app: the note is a small file in the app's own storage, written at
// once (not in the background), so it is there even if the app is closed
// a moment later.

const file = () => new File(Paths.document, 'launch-check.json');

export const launchCheck = makeLaunchCheck({
  read: () => {
    const f = file();
    return f.exists ? f.textSync() : undefined;
  },
  write: (text) => {
    const f = file();
    if (!f.exists) f.create();
    f.writeSync(text);
  },
});
