import { Bike, Footprints, HeartPulse, Utensils, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { APP_NAME } from '../brand';
import { LEGAL_DRAFT_DATE, legalDocs, OPERATOR, type LegalId } from '../legal';
import { XP_PER_TICKET } from '../wheel';
import { VividSwitch } from '../components/Vivid';
import { themed, useStyles } from '../theme';
import { MenuGroup, MenuRow } from './MenuScreen';

const APPS: { id: string; name: string; use: string; Icon: LucideIcon; grad: [string, string] }[] = [
  { id: 'yazio', name: 'Yazio', use: 'Calorie goals count as tasks', Icon: Utensils, grad: ['#7CFFC0', '#12B886'] },
  { id: 'adidas', name: 'adidas Running', use: 'Runs and walks for distance challenges', Icon: Footprints, grad: ['#7FD6FF', '#3557FF'] },
  { id: 'health', name: 'Apple Health / Health Connect', use: 'Steps, sleep and workouts', Icon: HeartPulse, grad: ['#FF84DC', '#FF3D9A'] },
  { id: 'strava', name: 'Strava', use: 'Runs and rides', Icon: Bike, grad: ['#FFE066', '#FF7A00'] },
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
      <Text style={s.intro}>Connect the apps you already use, so their goals count here. Connections arrive with the phone app; until then these switches are a preview.</Text>
      <MenuGroup label="Apps">
        {APPS.map((a, i) => (
          <MenuRow
            key={a.id}
            first={i === 0}
            label={a.name}
            sub={on[a.id] ? `${a.use} · coming with the phone app` : a.use}
            Icon={a.Icon}
            grad={a.grad}
            right={<VividSwitch value={!!on[a.id]} onValueChange={(v) => setOn({ ...on, [a.id]: v })} accessibilityLabel={`Connect ${a.name}`} />}
          />
        ))}
      </MenuGroup>
    </ScrollView>
  );
}

const FAQ: { q: string; a: string }[] = [
  { q: 'How do I earn XP?', a: 'Finish tasks. Longer tasks give more XP, and a streak multiplies it.' },
  { q: 'What keeps my streak alive?', a: 'Finishing at least one task a day. A rest day token saves a day you can’t make it.' },
  { q: 'Where do wheel tickets come from?', a: `Only from XP: one ticket for every ${XP_PER_TICKET} XP from finished tasks. They are never sold. The odds are behind the ? on the Spin tab.` },
  { q: 'Is my data shared?', a: 'No. Everything stays on this phone until accounts arrive, and sharing with friends stays off unless you turn it on.' },
];

/** Contact & help: common questions and how to reach us. */
export function HelpScreen() {
  const s = useStyles(makeStyles);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ScrollView contentContainerStyle={s.content}>
      <MenuGroup label="Questions">
        {FAQ.map((f, i) => (
          <Pressable key={f.q} onPress={() => setOpen(open === i ? null : i)} style={[s.faq, i > 0 && s.divider]} accessibilityRole="button" accessibilityState={{ expanded: open === i }}>
            <Text style={s.q}>{f.q}</Text>
            {open === i && <Text style={s.a}>{f.a}</Text>}
          </Pressable>
        ))}
      </MenuGroup>
      <MenuGroup label="Write to us">
        <MenuRow first label="Contact and feedback" sub={`Write to ${OPERATOR.email}. We read every message.`} onPress={() => Linking.openURL(`mailto:${OPERATOR.email}?subject=${encodeURIComponent(`${APP_NAME} feedback`)}`)} />
        <MenuRow label="Rate the app" sub={`Once ${APP_NAME} is in the App Store and Google Play.`} />
      </MenuGroup>
    </ScrollView>
  );
}

const LEGAL_SUBS: Record<LegalId, string> = {
  terms: 'The rules for using the app (AGB).',
  privacy: 'What is stored, where, and your rights under the GDPR.',
  imprint: 'Who runs the app (Impressum).',
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
        <Pressable onPress={() => setOpen(null)} style={s.back} accessibilityRole="button" accessibilityLabel="All legal texts">
          <Text style={s.backText}>‹ All legal texts</Text>
        </Pressable>
        <Text style={s.docTitle} accessibilityRole="header">
          {doc.title}
        </Text>
        <Text style={s.docDate}>Version of {LEGAL_DRAFT_DATE}</Text>
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
      <MenuGroup label="Legal">
        {docs.map((d, i) => (
          <MenuRow key={d.id} first={i === 0} label={d.title} sub={LEGAL_SUBS[d.id]} onPress={() => setOpen(d.id)} />
        ))}
        <MenuRow label="Ad and data consent" sub="Your choices about ads and data, once ads are added." />
        <MenuRow label="Open-source licences" sub="The free software this app is built with. Added before launch." />
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
