import type { GameState } from './game';

// Web build: there is no home screen widget. The Android one lives in
// widget.android.ts; iOS needs a WidgetKit extension and comes later.

export function registerWidget(): void {}

export async function updateWidget(_state: GameState): Promise<void> {}
