'use no memo';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { dramaBizzySvg, widgetBizzySvg } from './widgetLooks.ts';
import { t } from './i18n.ts';
import { widgetLine, type WidgetArt, type WidgetData } from './widgetData.ts';

// The Android home screen widget: Bizzy, tasks left, the streak and the XP bar,
// in the Indigo look. While a streak runs it leads (picked 2026-11-01, D): a
// border in the fire tier's colours and the days big, with what Bizzy says
// small under them. Tapping anywhere opens the app. Widgets are drawn by the
// phone's launcher, not React, so this is a plain function with no hooks.
// Fonts are copied into the Android build by the plugin in app.json.

export const WIDGET_NAME = 'Today';

/** The background, warming up with each step of the late drama (picked 2026-11-01, R8a). */
const TINTS: [`#${string}`, `#${string}`][] = [
  ['#1F2742', '#151926'],
  ['#2C2742', '#171926'],
  ['#3B2640', '#1A1724'],
  ['#4C2236', '#1E1420'],
  ['#601C2C', '#24111A'],
];

function artSvg(art: WidgetArt, form: number): string {
  return 'route' in art ? dramaBizzySvg(art.route, art.step, form) : widgetBizzySvg(art.mood, art.look, form);
}

const PAD = 12;
/** How thick the fire border is. */
const RIM = 3;

/** A flame in the fire tier's colours, with a white heart. */
function flameSvg(c1: string, c2: string): string {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z" fill="url(#f)"/><path d="M12 13c1 1.5 2.5 2.4 2.5 4.3a2.5 2.5 0 0 1-5 0c0-1.4 1-2.3 1.6-3 .2 .8.5 1.2.9 1.2 0-1-.2-1.8 0-2.5z" fill="#fff" opacity=".85"/></svg>`;
}

export function TodayWidget({ data, width, height }: { data: WidgetData; width: number; height: number }) {
  const small = width < 160 || height < 160;
  const fire = data.fire;
  const pad = fire ? PAD - RIM : PAD;
  // A little smaller next to the streak in the small widget, so the days have room.
  const bee = Math.round(Math.min(height * 0.58, width * (fire && small ? 0.42 : 0.5)));
  const barWidth = Math.max(0, width - PAD * 2 - 2);
  const fill = data.progress > 0 ? Math.max(6, Math.round(barWidth * data.progress)) : 0;
  const numeric = /^\d+$/.test(data.headline);
  // The days as big as fits: three digits and more get smaller in the small widget.
  const digits = fire ? String(fire.days).length : 1;
  const big = small ? [40, 40, 32, 26][Math.min(3, digits - 1)] : digits >= 4 ? 40 : 50;
  const card = (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={t('Open Succedo')}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: pad,
        borderRadius: fire ? 22 - RIM : 22,
        ...(fire ? {} : { borderWidth: 1, borderColor: '#3A4366' }),
        backgroundGradient: { from: TINTS[data.tint][0], to: TINTS[data.tint][1], orientation: 'TL_BR' },
      }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text={t('Lvl {n}', { n: data.level })} style={{ fontSize: 12, fontFamily: 'Assistant_700Bold', color: '#A3B3EA' }} />
        {fire ? null : <TextWidget text={data.streak} style={{ fontSize: 12, fontFamily: 'Assistant_700Bold', color: '#FFA940' }} />}
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {fire ? (
          <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
              <SvgWidget svg={flameSvg(fire.c1, fire.c2)} style={{ width: small ? 26 : 30, height: small ? 26 : 30, marginRight: 3 }} />
              <TextWidget text={String(fire.days)} maxLines={1} style={{ fontSize: big, fontFamily: 'Assistant_700Bold', color: fire.mid }} />
            </FlexWidget>
            <TextWidget text={small ? fire.short : fire.label} maxLines={1} style={{ fontSize: 12, fontFamily: 'Assistant_700Bold', color: '#EEF1FA' }} />
            <TextWidget text={widgetLine(data)} maxLines={3} style={{ fontSize: 11, fontFamily: 'Assistant_400Regular', color: '#B6BDD2', marginTop: 3 }} />
          </FlexWidget>
        ) : (
          <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
            <TextWidget
              text={data.headline}
              maxLines={numeric ? 1 : 2}
              style={{ fontSize: numeric ? (small ? 34 : 42) : small ? 19 : 23, fontFamily: 'PlayfairDisplay_400Regular', color: '#EEF1FA' }}
            />
            <TextWidget text={data.sub} maxLines={small ? 3 : 4} style={{ fontSize: small ? 11 : 12, fontFamily: 'Assistant_400Regular', color: '#B6BDD2', marginTop: 2 }} />
          </FlexWidget>
        )}
        <SvgWidget svg={artSvg(data.art, data.form)} style={{ width: bee, height: bee, marginLeft: 4 }} />
      </FlexWidget>
      <FlexWidget style={{ width: barWidth, height: 6, borderRadius: 3, backgroundColor: '#2F3650' }}>
        {fill > 0 ? (
          <FlexWidget style={{ width: fill, height: 6, borderRadius: 3, backgroundGradient: { from: '#7FD6FF', to: '#6A5BFF', orientation: 'LEFT_RIGHT' } }} />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
  if (!fire) return card;
  // The fire border: the tier's gradient showing round the card's edge.
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', padding: RIM, borderRadius: 22, backgroundGradient: { from: fire.c1, to: fire.c2, orientation: 'TL_BR' } }}
    >
      {card}
    </FlexWidget>
  );
}
