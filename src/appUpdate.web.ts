// The browser preview has no over-the-air updates.
export type UpdatePhase = 'checking' | 'downloading' | 'ready' | 'none';
export function useAppUpdate(): { phase: UpdatePhase; progress?: number } {
  return { phase: 'none' };
}
export async function restartIntoUpdate(): Promise<void> {}
export function updateInfo(): { id: string; when?: Date; channel: string; runtime: string; builtIn: boolean } {
  return { id: 'web preview', channel: 'none', runtime: 'none', builtIn: true };
}
