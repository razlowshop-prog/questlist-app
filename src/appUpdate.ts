import * as Updates from 'expo-updates';

// Over-the-air updates (expo-updates, PR #66) as the app sees them. The phone
// checks for a new version by itself each time the app starts and downloads it
// in the background; this tells the loading bar what is going on, so you can
// see when an update arrives (asked 2026-11-01), and restarts into it.

export type UpdatePhase = 'checking' | 'downloading' | 'ready' | 'none';

const ON = Updates.isEnabled && !__DEV__;

/** What the start-up update check is doing right now; `progress` is 0 to 1 while downloading, if known. */
export function useAppUpdate(): { phase: UpdatePhase; progress?: number } {
  const u = Updates.useUpdates();
  if (!ON) return { phase: 'none' };
  if (u.isUpdatePending) return { phase: 'ready' };
  if (u.isDownloading || (u.isUpdateAvailable && !u.downloadError)) return { phase: 'downloading', progress: u.downloadProgress };
  if (u.isChecking || u.isStartupProcedureRunning) return { phase: 'checking' };
  return { phase: 'none' };
}

/** Starts the app again on the downloaded update. */
export async function restartIntoUpdate(): Promise<void> {
  try {
    await Updates.reloadAsync();
  } catch (e) {
    console.warn('Could not restart into the update', e);
  }
}

/** For the Developer page: which version of the app's code is running. */
export function updateInfo(): { id: string; when?: Date; channel: string; runtime: string; builtIn: boolean } {
  return {
    id: Updates.updateId ?? 'none',
    when: Updates.createdAt ?? undefined,
    channel: Updates.channel ?? 'none',
    runtime: Updates.runtimeVersion ?? 'none',
    builtIn: Updates.isEmbeddedLaunch,
  };
}
