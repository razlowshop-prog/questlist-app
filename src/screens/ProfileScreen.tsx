import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { type Badge, type profileStats, type Settings } from '../game';
import { C } from '../theme';

export function ProfileScreen({
  name,
  stats,
  badges,
  settings,
  onRename,
  onSettings,
  onRedoSetup,
}: {
  name: string;
  stats: ReturnType<typeof profileStats>;
  badges: Badge[];
  settings: Settings;
  onRename: (name: string) => void;
  onSettings: (s: Partial<Settings>) => void;
  onRedoSetup: () => void;
}) {
  const emailValid = /^\S+@\S+\.\S+$/.test(settings.email);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const earned = badges.filter((b) => b.earned).length;
  const initials = name.trim().slice(0, 2).toUpperCase() || '?';

  function save() {
    if (draft.trim()) onRename(draft.trim());
    setEditing(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={save}
            onBlur={save}
            autoFocus
            maxLength={24}
            style={styles.nameInput}
          />
        ) : (
          <Pressable onPress={() => { setDraft(name); setEditing(true); }} accessibilityHint="Edit your name">
            <Text style={styles.name}>{name} ✎</Text>
          </Pressable>
        )}
        <Text style={styles.rank}>
          Level {stats.level} · {stats.rank}
        </Text>
      </View>

      <View style={styles.grid}>
        <Stat label="Points" value={stats.totalXp.toLocaleString()} color={C.gold} />
        <Stat label="Tasks done" value={String(stats.tasksDone)} />
        <Stat label="Current streak" value={`🔥 ${stats.currentStreak}`} color={C.flame} />
        <Stat label="Best streak" value={String(stats.bestStreak)} />
        <Stat label="Challenges won" value={String(stats.challengesWon)} />
        <Stat label="Badges" value={`${earned}/${badges.length}`} />
      </View>

      <Text style={styles.section}>Badges</Text>
      <View style={styles.badges}>
        {badges.map((b) => (
          <View key={b.id} style={[styles.badge, !b.earned && styles.badgeLocked]}>
            <Text style={[styles.badgeIcon, !b.earned && { opacity: 0.25 }]}>{b.earned ? b.icon : '🔒'}</Text>
            <Text style={styles.badgeTitle}>{b.title}</Text>
            <Text style={styles.badgeDesc}>{b.description}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>Settings</Text>
      <View style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Daily motivation by email</Text>
            <Text style={styles.badgeDesc}>A short motivational quote every morning. Unsubscribe anytime.</Text>
          </View>
          <Switch
            value={settings.quoteEmails}
            onValueChange={(v) => onSettings({ quoteEmails: v })}
            trackColor={{ true: C.accent, false: C.border }}
          />
        </View>
        {settings.quoteEmails && (
          <>
            <TextInput
              value={settings.email}
              onChangeText={(email) => onSettings({ email: email.trim() })}
              placeholder="you@example.com"
              placeholderTextColor={C.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.emailInput}
            />
            <Text style={styles.badgeDesc}>
              {emailValid
                ? '✓ Saved. Emails start once QuestList accounts are live.'
                : 'Enter your email address to receive the quotes.'}
            </Text>
          </>
        )}
      </View>
      <Pressable onPress={onRedoSetup} style={styles.redo} accessibilityRole="button">
        <Text style={styles.redoText}>Redo setup questions</Text>
      </Pressable>

      <Text style={styles.note}>
        Friends, public profiles and the global leaderboard arrive once accounts and cloud sync are added.
      </Text>
    </ScrollView>
  );
}

function Stat({ label, value, color = C.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', gap: 6, marginBottom: 18 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { color: C.text, fontSize: 22, fontWeight: '800' },
  nameInput: {
    color: C.text,
    fontSize: 20,
    fontWeight: '700',
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
    minWidth: 160,
    textAlign: 'center',
    paddingVertical: 2,
  },
  rank: { color: C.muted, fontSize: 14, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexBasis: '30%', flexGrow: 1, backgroundColor: C.card, borderRadius: 14, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { color: C.muted, fontSize: 12, marginTop: 2, textAlign: 'center' },
  section: { color: C.text, fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { flexBasis: '45%', flexGrow: 1, backgroundColor: C.card, borderRadius: 14, padding: 12, gap: 2 },
  badgeLocked: { backgroundColor: C.cardDone },
  badgeIcon: { fontSize: 26 },
  badgeTitle: { color: C.text, fontSize: 14, fontWeight: '700' },
  badgeDesc: { color: C.muted, fontSize: 12 },
  settingCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, gap: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  emailInput: {
    color: C.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  redo: { marginTop: 10, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  redoText: { color: C.text, fontWeight: '700', fontSize: 14 },
  note: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 22 },
});
