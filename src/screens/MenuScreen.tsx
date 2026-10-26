import { Bell, ChevronRight, FileText, Link, Mail, Medal, Settings, Users, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { APP_NAME } from '../brand';
import { CountBadge, fill } from '../components/Vivid';
import { card, eyebrow, FONTS, headingCase, themed, useStyles, useTheme } from '../theme';
import { N, t } from '../i18n';

export type MenuPage = 'activity' | 'friends' | 'leaderboard' | 'settings' | 'apps' | 'help' | 'legal';

type Row = { page: MenuPage; label: string; sub: string; Icon: LucideIcon; grad: [string, string] };

const GROUPS: { label: string; rows: Row[] }[] = [
  {
    label: N('Social'),
    rows: [
      { page: 'activity', label: N('Activity'), sub: N('Your tasks, level-ups and rewards'), Icon: Bell, grad: ['#FF84DC', '#FF3D9A'] },
      { page: 'friends', label: N('Friends'), sub: N('Arrive with accounts'), Icon: Users, grad: ['#7FD6FF', '#3557FF'] },
      { page: 'leaderboard', label: N('Leaderboard'), sub: N('Opens with accounts'), Icon: Medal, grad: ['#FFE066', '#FF7A00'] },
    ],
  },
  {
    label: N('App'),
    rows: [
      { page: 'settings', label: N('Settings'), sub: N('Reminders, sounds, vibration, backup'), Icon: Settings, grad: ['#9AA3BD', '#59607a'] },
      { page: 'apps', label: N('Connected apps'), sub: N('Yazio, adidas Running, Health'), Icon: Link, grad: ['#7CFFC0', '#12B886'] },
    ],
  },
  {
    label: N('Info'),
    rows: [
      { page: 'help', label: N('Contact & help'), sub: N('Questions and answers, write to us'), Icon: Mail, grad: ['#C9B6FF', '#6A5BFF'] },
      { page: 'legal', label: N('Legal'), sub: N('Terms, privacy, imprint'), Icon: FileText, grad: ['#9AA3BD', '#59607a'] },
    ],
  },
];

/** The Menu tab: everything that isn't a daily screen, in groups. Every row opens a page. */
export function MenuScreen({ counts, onOpen }: { /** Small pink counts on rows, such as unread activity. */ counts?: Partial<Record<MenuPage, number>>; onOpen: (page: MenuPage) => void }) {
  const s = useStyles(makeStyles);
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.heading}>{t('Menu')}</Text>
      {GROUPS.map((g) => (
        <MenuGroup key={g.label} label={t(g.label)}>
          {g.rows.map((r, i) => (
            <MenuRow key={r.page} first={i === 0} label={t(r.label)} sub={t(r.sub)} Icon={r.Icon} grad={r.grad} count={counts?.[r.page]} onPress={() => onOpen(r.page)} />
          ))}
        </MenuGroup>
      ))}
      <Text style={s.footer}>{t('{app} 1.0 · made in Austria', { app: APP_NAME })}</Text>
    </ScrollView>
  );
}

/** A small uppercase label over a card of rows. */
export function MenuGroup({ label, children }: { label: string; children: ReactNode }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.group}>
      <Text style={s.groupLabel}>{label}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

/** One row: a gradient icon tile, label and sub line, an optional count and a chevron when it opens something. */
export function MenuRow({
  first,
  label,
  sub,
  Icon,
  grad,
  count,
  right,
  onPress,
}: {
  first?: boolean;
  label: string;
  sub?: string;
  Icon?: LucideIcon;
  grad?: [string, string];
  count?: number;
  /** Shown instead of the chevron, such as a switch. */
  right?: ReactNode;
  onPress?: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const body = (
    <>
      {Icon && grad && (
        <View style={[s.tile, fill(grad, 145)]}>
          <Icon size={17} color="#FFFFFF" strokeWidth={2} aria-hidden />
        </View>
      )}
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={s.label}>{label}</Text>
        {sub ? <Text style={s.sub}>{sub}</Text> : null}
      </View>
      {count ? <CountBadge count={count} /> : null}
      {right ?? (onPress && <ChevronRight size={18} color={c.faint} strokeWidth={2} aria-hidden />)}
    </>
  );
  if (!onPress) return <View style={[s.row, !first && s.divider]}>{body}</View>;
  return (
    <Pressable onPress={onPress} style={[s.row, !first && s.divider]} accessibilityRole="button" accessibilityLabel={`${label}${sub ? `. ${sub}` : ''}${count ? `. ${t('{n} new', { n: count })}` : ''}`}>
      {body}
    </Pressable>
  );
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  heading: { fontFamily: FONTS.serif, color: c.text, fontSize: 25, lineHeight: 32, ...headingCase(c) },
  group: { marginTop: 18, gap: 8 },
  groupLabel: { ...eyebrow(c, 12), color: c.muted },
  card: { ...card(c), paddingHorizontal: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: c.surfaceAlt },
  tile: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  label: { color: c.text, fontSize: 15, fontWeight: '700' },
  sub: { color: c.muted, fontSize: 12 },
  footer: { color: c.faint, fontSize: 12, textAlign: 'center', marginTop: 24 },
}));
