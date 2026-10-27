import { registerWidgetTaskHandler, requestWidgetUpdate } from 'react-native-android-widget';
import type { GameState } from './game';
import { setLang, systemLang } from './i18n';
import { loadState } from './storage';
import { TodayWidget, WIDGET_NAME } from './TodayWidget';
import { widgetData } from './widgetData';

// Android home screen widget. The phone asks for a fresh drawing when the
// widget is added, resized and every 30 minutes (app.json), even while the app
// is closed; then the saved game is read from storage. The app also redraws it
// after every change, so a ticked task shows at once.

function draw(state: GameState, width: number, height: number) {
  setLang(state.settings.lang ?? systemLang());
  return TodayWidget({ data: widgetData(state, new Date()), width, height });
}

export function registerWidget(): void {
  registerWidgetTaskHandler(async ({ widgetAction, widgetInfo, renderWidget }) => {
    if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
    renderWidget(draw(await loadState(), widgetInfo.width, widgetInfo.height));
  });
}

export async function updateWidget(state: GameState): Promise<void> {
  await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: ({ width, height }) => draw(state, width, height) });
}
