import { Bike, Footprints, HeartPulse, Utensils, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { APP_NAME } from '../brand';
import { legalDocs, legalDraftDate, OPERATOR, type LegalId } from '../legal';
import { XP_PER_TICKET } from '../wheel';
import { VividSwitch } from '../components/Vivid';
import { themed, useStyles } from '../theme';
import { MenuGroup, MenuRow } from './MenuScreen';
import { N, t } from '../i18n';

const APPS: { id: string; name: string; use: string; Icon: LucideIcon; grad: [string, string] }[] = [
  { id: 'yazio', name: 'Yazio', use: N('Calorie goals count as tasks'), Icon: Utensils, grad: ['#7CFFC0', '#12B886'] },
  { id: 'adidas', name: 'adidas Running', use: N('Runs and walks for distance challenges'), Icon: Footprints, grad: ['#7FD6FF', '#3557FF'] },
  { id: 'health', name: 'Apple Health / Health Connect', use: N('Steps, sleep and workouts'), Icon: HeartPulse, grad: ['#FF84DC', '#FF3D9A'] },
  { id: 'strava', name: 'Strava', use: N('Runs and rides'), Icon: Bike, grad: ['#FFE066', '#FF7A00'] },
];

/**
 * Apps Succedo will read from. The links need the phone app and each
 * partner's permission, so for now the switches only show what is planned
 * and nothing is saved or sent.
 */
export function ConnectedAppsScreen() {
  const s = useStyles(makeStyles);
  const [on, setOn] = useState<Record<string, boolean>>({});
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.intro}>{t('Connect the apps you already use, so their goals count here. Connections arrive with the phone app; until then these switches are a preview.')}</Text>
      <MenuGroup label={t('Apps')}>
        {APPS.map((a, i) => (
          <MenuRow
            key={a.id}
            first={i === 0}
            label={a.name}
            sub={on[a.id] ? `${t(a.use)} · ${t('coming with the phone app')}` : t(a.use)}
            Icon={a.Icon}
            grad={a.grad}
            right={<VividSwitch value={!!on[a.id]} onValueChange={(v) => setOn({ ...on, [a.id]: v })} accessibilityLabel={t('Connect {app}', { app: a.name })} />}
          />
        ))}
      </MenuGroup>
    </ScrollView>
  );
}

const FAQ: { q: string; a: string }[] = [
  { q: N('How do I earn XP?'), a: N('Finish tasks. Longer and harder tasks give more XP, and a streak multiplies it.') },
  { q: N('What keeps my streak alive?'), a: N('Finishing at least one task a day. A rest day token saves a day you can’t make it.') },
  {
    q: N('Where do wheel tickets come from?'),
    a: N('Only from XP: one ticket for every {n} XP from tasks, challenges and achievements. They are never sold. The odds are behind the ? on the Spin tab.'),
  },
  { q: N('Is my data shared?'), a: N('No. Everything stays on this phone until accounts arrive, and sharing with friends stays off unless you turn it on.') },
];

/** Contact & help: common questions and how to reach us. */
export function HelpScreen() {
  const s = useStyles(makeStyles);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ScrollView contentContainerStyle={s.content}>
      <MenuGroup label={t('Questions')}>
        {FAQ.map((f, i) => (
          <Pressable key={f.q} onPress={() => setOpen(open === i ? null : i)} style={[s.faq, i > 0 && s.divider]} accessibilityRole="button" accessibilityState={{ expanded: open === i }}>
            <Text style={s.q}>{t(f.q)}</Text>
            {open === i && <Text style={s.a}>{t(f.a, { n: XP_PER_TICKET })}</Text>}
          </Pressable>
        ))}
      </MenuGroup>
      <MenuGroup label={t('Write to us')}>
        <MenuRow first label={t('Contact and feedback')} sub={t('Write to {email}. We read every message.', { email: OPERATOR.email })} onPress={() => Linking.openURL(`mailto:${OPERATOR.email}?subject=${encodeURIComponent(t('{app} feedback', { app: APP_NAME }))}`)} />
        <MenuRow label={t('Rate the app')} sub={t('Once {app} is in the App Store and Google Play.', { app: APP_NAME })} />
      </MenuGroup>
    </ScrollView>
  );
}

const LEGAL_SUBS: Record<LegalId, string> = {
  terms: N('The rules for using the app (AGB).'),
  privacy: N('What is stored, where, and your rights under the GDPR.'),
  imprint: N('Who runs the app (Impressum).'),
};

/** Terms, privacy policy and imprint; tap one to read it. */
export function LegalScreen() {
  const s = useStyles(makeStyles);
  const docs = legalDocs(APP_NAME);
  const [open, setOpen] = useState<LegalId | null>(null);
  const doc = docs.find((d) => d.id === open);

  if (doc) {
    return (
      <ScrollView contentContainerStyle={s.content}>
        <Pressable onPress={() => setOpen(null)} style={s.back} accessibilityRole="button" accessibilityLabel={t('All legal texts')}>
          <Text style={s.backText}>{t('‹ All legal texts')}</Text>
        </Pressable>
        <Text style={s.docTitle} accessibilityRole="header">
          {doc.title}
        </Text>
        <Text style={s.docDate}>{t('Version of {date}', { date: legalDraftDate() })}</Text>
        {doc.sections.map((sec) => (
          <View key={sec.heading} style={s.docSection}>
            <Text style={s.q} accessibilityRole="header">
              {sec.heading}
            </Text>
            {sec.paragraphs.map((p, i) => (
              <Text key={i} style={s.a}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      <MenuGroup label={t('Legal')}>
        {docs.map((d, i) => (
          <MenuRow key={d.id} first={i === 0} label={d.title} sub={t(LEGAL_SUBS[d.id])} onPress={() => setOpen(d.id)} />
        ))}
        <MenuRow label={t('Ad and data consent')} sub={t('Your choices about ads and data, once ads are added.')} />
        <MenuRow label={t('Open-source licences')} sub={t('The free software this app is built with. Added before launch.')} />
      </MenuGroup>
    </ScrollView>
  );
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingTop: 0, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  intro: { color: c.muted, fontSize: 13, lineHeight: 18, marginTop: 8 },
  faq: { paddingVertical: 14, gap: 6 },
  divider: { borderTopWidth: 1, borderTopColor: c.surfaceAlt },
  q: { color: c.text, fontSize: 15, fontWeight: '700' },
  a: { color: c.muted, fontSize: 14, lineHeight: 20 },
  back: { paddingVertical: 10, alignSelf: 'flex-start' },
  backText: { color: c.accent, fontSize: 14, fontWeight: '700' },
  docTitle: { color: c.text, fontSize: 24, fontWeight: '800', marginTop: 4 },
  docDate: { color: c.muted, fontSize: 12, marginTop: 2, marginBottom: 6 },
  docSection: { gap: 6, marginTop: 16 },
}));
