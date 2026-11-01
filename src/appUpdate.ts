import * as Updates from 'expo-updates';

// Over-the-air updates (expo-updates, PR #66) as the app sees them. The phone
// checks for a new version by itself each time the app starts; the loading
// screen waits for that check, shows the download, and then reloads the app's
// code behind a screen in the theme's colour, so it looks like one loading
// screen and not a restart (asked 2026-11-01).

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

/**
 * Runs the downloaded update. The code can only be swapped by reloading it; the
 * phone covers that moment in `background` (the loading screen's colour), with
 * no spinner, and fades into the new version.
 */
export async function restartIntoUpdate(background?: string): Promise<void> {
  try {
    await Updates.reloadAsync({ reloadScreenOptions: { backgroundColor: background, spinner: { enabled: false }, fade: true } });
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
