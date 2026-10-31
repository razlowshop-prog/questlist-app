import { useEffect, useState, type ComponentType } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { setLang, systemLang, t } from '../i18n';
import { launchCheck } from '../launchCheck';
import { LAUNCH_STEPS, type LaunchStep } from '../launchLog';

/**
 * Shown when the last start closed before the app was running fine. It lists
 * how far that start got, so a screenshot says where it broke. Plain on
 * purpose, like the crash screen: no theme, fonts or animation.
 */

function stepText(step: LaunchStep): string {
  switch (step) {
    case 'started':
      return t('The app started');
    case 'save read':
      return t('Your saved progress was read');
    case 'look ready':
      return t('The look and fonts were ready');
    case 'drawn':
      return t('The first screen was drawn');
  }
}

export function LaunchReport({ reached, onOpen }: { reached: LaunchStep[]; onOpen: () => void }) {
  // The report is on screen, so this start works: a closed report isn't a new crash.
  useEffect(() => launchCheck.ok(), []);
  return (
    <View style={{ flex: 1, backgroundColor: '#12151f', paddingHorizontal: 24, paddingTop: 72, paddingBottom: 32, gap: 16 }}>
      <Text style={{ color: '#eef1fa', fontSize: 22, fontWeight: '700' }} accessibilityRole="header">
        {t('Succedo closed by itself last time')}
      </Text>
      <Text style={{ color: '#b6bdd2', fontSize: 15, lineHeight: 21 }}>{t('Your progress is saved. Please send a screenshot of this screen so it can be fixed.')}</Text>
      <ScrollView style={{ flex: 1, backgroundColor: '#1b2030', borderRadius: 12 }} contentContainerStyle={{ padding: 14, gap: 10 }}>
        {LAUNCH_STEPS.map((step) => {
          const done = reached.includes(step);
          return (
            <Text key={step} style={{ color: done ? '#9be7b0' : '#ffb3c1', fontSize: 15, lineHeight: 20 }}>
              {done ? '✓' : '✗'} {stepText(step)}
            </Text>
          );
        })}
        <Text style={{ color: '#ffb3c1', fontSize: 15, lineHeight: 20 }}>✗ {t('Ran for 5 seconds')}</Text>
        <Text selectable style={{ color: '#7d859c', fontSize: 12, marginTop: 6, fontFamily: 'monospace' }}>
          {reached.length ? reached.join(' → ') : '—'}
        </Text>
      </ScrollView>
      <Pressable onPress={onOpen} accessibilityRole="button" style={{ alignSelf: 'flex-start', backgroundColor: '#7FD6FF', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 }}>
        <Text style={{ color: '#0b0e18', fontSize: 15, fontWeight: '800' }}>{t('Open Succedo')}</Text>
      </Pressable>
    </View>
  );
}

/**
 * Wraps the app: after a start that closed early, the report shows first and
 * "Open Succedo" goes on to the app with a fresh note.
 */
export function LaunchGate({ App }: { App: ComponentType }) {
  const [report, setReport] = useState(launchCheck.lastCrash);
  if (!report) {
    launchCheck.step('started');
    return <App />;
  }
  setLang(systemLang());
  return (
    <LaunchReport
      reached={report}
      onOpen={() => {
        launchCheck.restart();
        setReport(undefined);
      }}
    />
  );
}
