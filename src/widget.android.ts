import type { GameState } from './game';
import { setLang, systemLang } from './i18n';
import { loadState } from './storage';
import { widgetData } from './widgetData';

// Android home screen widget. The phone asks for a fresh drawing when the
// widget is added, resized and every 30 minutes (app.json), even while the app
// is closed; then the saved game is read from storage. The app also redraws it
// after every change, so a ticked task shows at once.
//
// The widget library and its drawing are loaded on first use, inside a try:
// if the phone's build has no working widget module, the app still opens and
// only the widget is missing.

type WidgetLib = typeof import('react-native-android-widget');
type Drawing = typeof import('./TodayWidget');

let loaded: { lib: WidgetLib; drawing: Drawing } | null | undefined;

function widgetParts() {
  if (loaded === undefined) {
    try {
      loaded = { lib: require('react-native-android-widget') as WidgetLib, drawing: require('./TodayWidget') as Drawing };
    } catch (e) {
      console.warn('Widget is not available', e);
      loaded = null;
    }
  }
  return loaded;
}

function draw(drawing: Drawing, state: GameState, width: number, height: number) {
  setLang(state.settings.lang ?? systemLang());
  return drawing.TodayWidget({ data: widgetData(state, new Date()), width, height });
}

export function registerWidget(): void {
  const parts = widgetParts();
  if (!parts) return;
  try {
    parts.lib.registerWidgetTaskHandler(async ({ widgetAction, widgetInfo, renderWidget }) => {
      if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
      renderWidget(draw(parts.drawing, await loadState(), widgetInfo.width, widgetInfo.height));
    });
  } catch (e) {
    console.warn('Widget could not be registered', e);
  }
}

export async function updateWidget(state: GameState): Promise<void> {
  const parts = widgetParts();
  if (!parts) return;
  await parts.lib.requestWidgetUpdate({ widgetName: parts.drawing.WIDGET_NAME, renderWidget: ({ width, height }) => draw(parts.drawing, state, width, height) });
}
