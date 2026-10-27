'use no memo';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { bizzySvg } from './bizzy.ts';
import { t } from './i18n.ts';
import type { WidgetData } from './widgetData.ts';

// The Android home screen widget: Bizzy, tasks left, the streak and the XP bar,
// in the Indigo look. Tapping anywhere opens the app. Widgets are drawn by the
// phone's launcher, not React, so this is a plain function with no hooks.
// Fonts are copied into the Android build by the plugin in app.json.

export const WIDGET_NAME = 'Today';

const PAD = 12;

export function TodayWidget({ data, width, height }: { data: WidgetData; width: number; height: number }) {
  const small = width < 160 || height < 160;
  const bee = Math.round(Math.min(height * 0.58, width * 0.5));
  const barWidth = Math.max(0, width - PAD * 2 - 2);
  const fill = data.progress > 0 ? Math.max(6, Math.round(barWidth * data.progress)) : 0;
  const numeric = /^\d+$/.test(data.headline);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={t('Open Succedo')}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: PAD,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#3A4366',
        backgroundGradient: { from: '#1F2742', to: '#151926', orientation: 'TL_BR' },
      }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text={t('Lvl {n}', { n: data.level })} style={{ fontSize: 12, fontFamily: 'Assistant_700Bold', color: '#A3B3EA' }} />
        <TextWidget text={data.streak} style={{ fontSize: 12, fontFamily: 'Assistant_700Bold', color: '#FFA940' }} />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
          <TextWidget
            text={data.headline}
            maxLines={1}
            style={{ fontSize: numeric ? (small ? 34 : 42) : small ? 19 : 23, fontFamily: 'PlayfairDisplay_400Regular', color: '#EEF1FA' }}
          />
          <TextWidget text={data.sub} maxLines={small ? 3 : 4} style={{ fontSize: small ? 11 : 12, fontFamily: 'Assistant_400Regular', color: '#B6BDD2', marginTop: 2 }} />
        </FlexWidget>
        <SvgWidget svg={bizzySvg(data.mood, false)} style={{ width: bee, height: bee, marginLeft: 4 }} />
      </FlexWidget>
      <FlexWidget style={{ width: barWidth, height: 6, borderRadius: 3, backgroundColor: '#2F3650' }}>
        {fill > 0 ? (
          <FlexWidget style={{ width: fill, height: 6, borderRadius: 3, backgroundGradient: { from: '#7FD6FF', to: '#6A5BFF', orientation: 'LEFT_RIGHT' } }} />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
