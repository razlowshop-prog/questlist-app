import { Bike, Footprints, HeartPulse, Utensils, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { APP_NAME } from '../brand';
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
        <MenuRow first label="Contact and feedback" sub="Our support address is added before launch." />
        <MenuRow label="Rate the app" sub={`Once ${APP_NAME} is in the App Store and Google Play.`} />
      </MenuGroup>
    </ScrollView>
  );
}

/** Legal texts. They are written and checked before launch; until then each row says so. */
export function LegalScreen() {
  const s = useStyles(makeStyles);
  return (
    <ScrollView contentContainerStyle={s.content}>
      <MenuGroup label="Legal">
        <MenuRow first label="Terms of use (AGB)" sub="Added before launch." />
        <MenuRow label="Privacy policy" sub="How your data is handled under the GDPR. Added before launch." />
        <MenuRow label="Imprint (Impressum)" sub="Who runs the app. Added before launch." />
        <MenuRow label="Ad and data consent" sub="Your choices about ads and data, once ads are added." />
        <MenuRow label="Open-source licences" sub="The free software this app is built with." />
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
}));
